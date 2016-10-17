const io = require('socket.io-client');
const should = require('should');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/' + env + '.json');
const socketURL = config.gateway || 'http://localhost:5555';
const models = require('../models');

let options = {
    transports: [ 'websocket' ],
    'force new connection': true
};

let testUserIdString = '580285fa5a5cf8673dd13f79';
let testUserId = models.types.ObjectId(testUserIdString);
let testCarIdString = '580285fa5a5cf8673dd13f7d';
let testCarId = models.types.ObjectId(testCarIdString);
let bookingId = null;

describe("Booking Service", function() {
    before(function(done) {
        models.User.find({}).remove(() => {
            models.User.create({ _id: testUserId, name: 'Ordinary Client', role: 'client', balance: 30}, () => {
                models.Car.find({}).remove(() => {
                    models.Car.create({
                            _id: testCarId,
                            name: 'DeLorian',
                            location: { type: 'Point', coordinates: [ 29.02, 40.98 ] }
                        }, () => { models.Booking.find({}).remove(done) }
                    );
                });
            });
        });
    });

    it('Should connect to socket.io successfully', function(done) {
        let client1 = io.connect(socketURL, options);
        client1.on('connect', function(data) {
            client1.disconnect();
            done();
        });
    });

    it('Should successfully book a car when user has enough funds', function(done) {
        let client1 = io.connect(socketURL, options);
        client1.on('connect', function(data) {
            client1.emit('bookCar', { userId: testUserId, carId: testCarId },
                (err, data) => {
                    should.equal(err, null);
                    data.userId.should.equal(testUserIdString);
                    data.carId.should.equal(testCarIdString);
                    bookingId = data._id;
                    done();
                });
        });
    });

    it('Should successfully end a booking', function(done) {
        let client1 = io.connect(socketURL, options);
        client1.on('connect', function(data) {
            client1.emit('endBooking', { userId: testUserIdString, carId: testCarIdString, bookingId: bookingId },
                (err, data) => {
                    should.equal(err, null);
                    done();
                });
        });
    });

    it('Should fail to book a car when user does not have enough funds', function(done) {
        let client1 = io.connect(socketURL, options);
        client1.on('connect', function(data) {
            client1.emit('bookCar', { userId: testUserId, carId: testCarId } ,
                (err, data) => {
                    err.should.equal('Not enough funds');
                    done();
                });
        });
    });

    it('Balance should never be negative', function(done) {
        let client1 = io.connect(socketURL, options);
        client1.on('connect', function(data) {
            client1.emit('addFundsToUser', { userId: testUserId, amount: -100 } ,
                (err, data) => {
                    err.errmsg.should.equal('Document failed validation');
                    done();
                });
        });
    });
});
