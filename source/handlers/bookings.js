const cote = require('cote');

const bookingRequester = new cote.Requester({
    name: 'bookingRequester',
    namespace: 'booking',
    requests: [ 'listNearbyCars', 'endBooking', 'bookCar', 'userBookingHistory', 'carBookingHistory' ]
});

const bookingSubscriber = new cote.Subscriber({
    name: 'bookingSubscriber',
    namespace: 'booking',
    subscribesTo: [ 'newBooking', 'bookingEnded' ]
});

module.exports = {
    requester: bookingRequester,
    subscriber: bookingSubscriber
};
