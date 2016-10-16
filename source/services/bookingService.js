
const cote = require('cote'),
    models = require('../models'),
    async = require('async');

const bookingResponder = new cote.Responder({
    name: 'booking responder',
    namespace: 'booking',
    respondsTo: ['listNearbyCars', 'bookCar', 'endBooking', 'assignCar', 'userBookingHistory', 'carBookingHistory']
});

const bookingPublisher = new cote.Publisher({
    name: 'booking publisher',
    namespace: 'booking',
    broadcasts: [ 'newBooking', 'bookingEnded' ]
});

const userRequester = new cote.Requester({
    name: 'bookingUserRequester',
    namespace: 'user',
    requests: [ 'list', 'processBooking', 'completeBooking', 'endBooking' ]
});

const bookingCost = models.config.bookingCost || 30;

/**
 * Lists nearby and available cars according to a given location and range
 * Cars are ordered by proximity to the given location using the $nearSphere operator
 */
bookingResponder.on('listNearbyCars', (req, callback) => {
    if (!req.location && !(req.location.length == 2)) {
        return callback('Please provide current location');
    }

    models.Car.find({
        location: {
            $nearSphere: {
                $geometry: { type: "Point", coordinates: req.location },
                $maxDistance: req.range || 1000
            }
        },
        activeBooking: null
    }, callback);
});

/**
 * Car booking process. Follows two-phase-commit procedure
 */
bookingResponder.on('bookCar', (req, callback) => {
    if (!req.userId || !req.carId) {
        return callback('Insufficient parameters');
    }

    async.waterfall([
        (done) => {
            async.parallel(
            [
                (done) => { //check for user availability and funds
                    let data = {
                        type: 'list',
                        query: { _id: models.types.ObjectId(req.userId) }
                    };
                    userRequester.send(data, (err, user) => {
                        if (err) {
                            return done(err);
                        }

                        if (!user || !user.length) {
                            return done('No user found');
                        }

                        if (user[0].balance < bookingCost) {
                            return done('Not enough funds');
                        }

                        done(null, user[0]);
                    });
                },
                (done) => { // check for car availability
                    models.Car.findOne({ _id:  models.types.ObjectId(req.carId), activeBooking: null }, (err, car) => {
                        if (err) {
                            return done(err);
                        }
                        if (!car) {
                            return done('Car is not available right now');
                        }

                        done(null, car);
                    });
                }
            ], (err, results) => {
                if (err) {
                    return done(err);
                }
                done(null, results[0], results[1]);
            })
        },
        (user, car, done) => {
            //initialize transaction record
            (new models.Booking({
                userId: user._id,
                carId: car._id,
                cost: bookingCost,
                state: models.bookingStates.INITIAL
            })).save((err, booking, numAffected) => {
                if (err || numAffected != 1) {
                    return done('There is an outstanding transaction!');
                }
                done(null, booking);
            });
        },
        (booking, done) => { // transition into PENDING state
            modifyBookingState(models.bookingStates.INITIAL, models.bookingStates.PENDING, booking, done);
        },
        (booking, done) => { // process booking for user
            sendUserBookingRequest('processBooking', booking, done);
        },
        (booking, done) => { // process booking for car
            processCarBooking(booking, (err, rawResponse) => {
                if (err || rawResponse.nModified != 1) {
                    return done('Car is already assigned');
                }
                done(null, booking);
            })
        },
        (booking, done) => { // transition into APPLIED state
            modifyBookingState(models.bookingStates.PENDING, models.bookingStates.APPLIED, booking, done);
        },
        (booking, done) => { // remove pending transaction records from user
            sendUserBookingRequest('completeBooking', booking, done);
        },
        (booking, done) => { // remove rending transaction records from car
            completeCarBooking(booking, (err, rawResponse) => {
                if (err || rawResponse.nModified != 1) {
                    return done('Car booking is already completed');
                }
                done(null, booking);
            });
        },
        (booking, done) => { // finalize transaction state
            modifyBookingState(models.bookingStates.APPLIED, models.bookingStates.COMMITTED, booking, done);
        }
    ], (err, result) => { // publish booking update
        bookingPublisher.publish('newBooking', result);
        callback(err, result);
    });
});

/**
 * This is implemented to be accessed by recovery process to repply stuck transactions
 */
bookingResponder.on('assignCar', (req, callback) => {
    if (!req.booking) {
        return callback('Please provide booking information');
    }

    processCarBooking(req.booking, callback);
});

/**
 * Ends a booking by user
 * The car and user is made available for another booking
 */
bookingResponder.on('endBooking', (req, callback) => {
    if (!req.bookingId || !req.userId || !req.carId) {
        return callback('Insufficient parameters');
    }

    async.series([
        (done) => { // check booking record
            models.Booking.findOne(
                {
                    _id: models.types.ObjectId(req.bookingId),
                    userId: models.types.ObjectId(req.userId),
                    carId: models.types.ObjectId(req.carId)
                }, (err, booking) => {
                    if (err) {
                        return done(err);
                    }
                    if (!booking) {
                        return done('Invalid booking');
                    }
                    done(null);
                });
        },
        (done) => { // remove active booking record from user
            let data = {
                type: 'endBooking',
                userId: models.types.ObjectId(req.userId),
                bookingId: models.types.ObjectId(req.bookingId)
            };
            userRequester.send(data, (err, rawResponse) => {
                if (err || rawResponse.nModified != 1) {
                    return done('No user with this booking information found');
                }
                done(null);
            });
        },
        (done) => { // remove active booking record from car
            models.Car.update(
                {
                    _id: models.types.ObjectId(req.carId),
                    activeBooking: models.types.ObjectId(req.bookingId)
                },
                {
                    activeBooking: null
                }, (err, rawResponse) => {
                    if (err || rawResponse.nModified != 1) {
                        return done('No car with this booking information found');
                    }
                    done(null);
                }
            );
        }
    ], (err) => { //publish update
        if (err) {
            callback(err);
        }
        callback(null, req.bookingId);
        bookingPublisher.publish('bookingEnded', req.bookingId);
    });
});

/**
 * Lists all transactions of the given user and active booking information
 */
bookingResponder.on('userBookingHistory', (req, callback) => {
    if (!req.userId) {
        return callback('Please provide user information');
    }

    async.parallel([
        (done) => {
            models.Booking.find({
                userId: models.types.ObjectId(req.userId),
                state: models.bookingStates.COMMITTED
            }, {}, { sort: { lastModifiedAt: -1 } }, done)
        },
        (done) => {
            let data = {
                type: 'list',
                query: { _id: models.types.ObjectId(req.userId), activeBooking: { $ne: null } },
                fields: { activeBooking: 1 }
            };
            userRequester.send(data, done);
        }
    ], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, { activeBooking: results[1], bookings: results[0]} );
    });
});

/**
 * Lists all booking history of a car and its active booking information
 */
bookingResponder.on('carBookingHistory', (req, callback) => {
    if (!req.carId) {
        return callback('Please provide car information');
    }

    async.parallel([
        (done) => {
            models.Booking.find({
                carId: models.types.ObjectId(req.carId),
                state: models.bookingStates.COMMITTED
            }, {}, { sort: { lastModifiedAt: -1 } }, done)
        },
        (done) => {
            models.Car.find({
                _id: models.types.ObjectId(req.carId),
                activeBooking: { $ne: null }
            }, { activeBooking: 1 }, done);
        }
    ], (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, { activeBooking: results[1], bookings: results[0]} );
    });
});

/**
 * Helper functions
 */
const processCarBooking = function(booking, callback) {
    models.Car.update(
        {
            _id: booking.carId,
            pendingBookings: { $ne: booking._id },
            activeBooking: null
        },
        {
            activeBooking: booking._id,
            $push: { pendingBookings: booking._id }
        }, callback
    );
};

const completeCarBooking = function(booking, callback) {
    models.Car.update(
        {
            _id: booking.carId,
            pendingBookings: booking._id
        },
        {
            $pull: { pendingBookings: booking._id }
        }, callback
    );
};

const sendUserBookingRequest = function(type, booking, callback) {
    let data = { type: type, booking: booking };
    userRequester.send(data, (err, rawResponse) => {
        if (err || rawResponse.nModified != 1) {
            return callback('Transaction already applied');
        }
        callback(null, booking);
    });
};

const modifyBookingState = function(oldState, newState, booking, callback) {
    models.Booking.update(
        { _id: booking._id, state: oldState },
        { $set: { state: newState }, $currentDate: { lastModifiedAt: true } },
        (err, rawResponse) => {
            if (err || rawResponse.nModified != 1) {
                return callback('Transaction already processed');
            }
            callback(null, booking);
        }
    );
};
