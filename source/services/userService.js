
const cote = require('cote'),
    models = require('../models');

const userResponder = new cote.Responder({
    name: 'user responder',
    namespace: 'user',
    respondsTo: [ 'list', 'addFunds', 'processBooking', 'completeBooking', 'endBooking' ]
});

const userPublisher = new cote.Publisher({
    name: 'user publisher',
    namespace: 'user',
    broadcasts: [ 'update' ]
});

/**
 * Adds or substracts funds to/from given user
 */
userResponder.on('addFunds', function(req, callback) {
    if (!req.userId || !req.amount) {
        return callback('Invalid parameters');
    }

    models.User.update({ _id: models.types.ObjectId(req.userId) }, { $inc: { balance: req.amount } }, (err, user) => {
        if (err) {
            return callback(err);
        }
        models.User.find(models.types.ObjectId(req.userId), function(err, user) {
            callback(err, user);
            userPublisher.publish('update', user);
        })
    });
});

/**
 * Adds active booking record and pending bookings records part of two-phase booking transaction
 */
userResponder.on('processBooking', (req, callback) => {
    if (!req.booking) {
        return callback('Invalid parameters');
    }

    models.User.update(
        {
            _id: req.booking.userId,
            activeBooking: null,
            pendingBookings: { $ne: req.booking._id }
        },
        {
            $inc: { balance: -req.booking.cost },
            activeBooking: req.booking._id,
            $push: { pendingBookings: req.booking._id }
        }, callback
    );
});

/**
 * Removes pending booking records part of two-phase booking transaction
 */
userResponder.on('completeBooking', (req, callback) => {
    if (!req.booking) {
        return callback('Insufficient parameters');
    }

    models.User.update(
        {
            _id: req.booking.userId,
            pendingBookings: req.booking._id
        },
        {
            $pull: { pendingBookings: req.booking._id }
        }, callback
    );
});

/**
 * Removes active booking record after a booking has been ended
 */
userResponder.on('endBooking', (req, callback) => {
    if (!req.bookingId || !req.userId) {
        return callback('Insufficient parameters');
    }

    models.User.update(
        {
            _id: req.userId,
            activeBooking: req.bookingId
        },
        {
            activeBooking: null
        }, callback
    );
});

/**
 * Executes given query on Users collection
 */
userResponder.on('list', (req, cb) => {
    let query = req.query || {};
    let fields = req.fields || {};
    let sort = req.sort || {};
    models.User.find(query, fields).sort(sort).exec(cb);
});
