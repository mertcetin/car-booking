
const app = require('http').createServer((req, res) => {
    res.end('This is a websocket only interface')
});
const io = require('socket.io').listen(app),
    cote = require('cote'),
    bookings = require('../handlers/bookings'),
    users = require('../handlers/users');

app.listen(process.env.PORT || 5555);

// initialize cote sockend server
new cote.Sockend(io, {
    name: 'end-user gateway'
});

// initialize responder for all available facade methods
const gatewayResponder = new cote.Responder({
    name: 'gateway responder',
    namespace: '',
    respondsTo: [ 'listUsers', 'addFundsToUser', 'listNearbyCars', 'bookCar', 'endBooking', 'userBookingHistory', 'carBookingHistory']
});

/**
 * Proxy methods to internal services
 */
gatewayResponder.on('listUsers', (req, cb) => {
    let data = {
        type: 'list',
        query: {}
    };
    users.requester.send(data, cb);
});

gatewayResponder.on('addFundsToUser', (req, cb) => {
    let data = {
        type: 'addFunds',
        userId: req.userId,
        amount: req.amount
    };
    users.requester.send(data, cb);
});

gatewayResponder.on('listNearbyCars', (req, cb) => {
    let data = {
        type: 'listNearbyCars',
        location: req.location,
        range: req.range
    };
    bookings.requester.send(data, cb);
});

gatewayResponder.on('bookCar', (req, cb) => {
    let data = {
        type: 'bookCar',
        userId: req.userId,
        carId: req.carId
    };
    bookings.requester.send(data, cb);
});

gatewayResponder.on('endBooking', (req, cb) => {
    let data = {
        type: 'endBooking',
        bookingId: req.bookingId,
        userId: req.userId, // for extra security
        carId: req.carId // for extra security
    };
    bookings.requester.send(data, cb);
});

gatewayResponder.on('userBookingHistory', (req, cb) => {
    let data = {
        type: 'userBookingHistory',
        userId: req.userId
    };
    bookings.requester.send(data, cb);
});

gatewayResponder.on('carBookingHistory', (req, cb) => {
    let data = {
        type: 'carBookingHistory',
        carId: req.carId
    };
    bookings.requester.send(data, cb);
});

/**
 * Republish updates from internal services
 */
bookings.subscriber.on('newBooking', function(data) {
    io.emit('newBooking', data);
});

bookings.subscriber.on('bookingEnded', function(data) {
    io.emit('bookingEnded', data);
});

users.subscriber.on('update', function(data) {
    io.emit('userUpdate', data);
});
