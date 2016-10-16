const io = require('socket.io-client');
const config = require('../config/' + process.env.NODE_ENV || 'development' + '.json');
const socket = io(config.gateway || 'http://localhost:5555');
const prompt = require('prompt');

let userId = null;
prompt.start();

// this recursive commandPromt callback hell is definitely not a best practice
// this is implemented as a makeshift solution and not required to be used in actual implementation
let commandPrompt = function(cb) {
    prompt.get({
        properties: {
            command: {
                description: "Command? (listNearbyCars, addFundsToUser, bookCar, endBooking, userBookingHistory)"
            }
        }
    }, function (err, result) {
        if (!result) {
            process.exit(-1);
        }

        switch(result.command) {
            case 'listNearbyCars':
                prompt.get({
                    properties: {
                        range: {
                            description: "Range (meters)?"
                        }
                    }
                }, function (err, result) {
                    // location infotmation is hardcoded. Should be an input.
                    socket.emit('listNearbyCars', { location: [ 29.0199, 40.9799 ], range: result.range },
                        (err, data) => {
                            console.log('err:', err, 'available cars', data);
                            cb(commandPrompt);
                        });
                });
                break;
            case 'addFundsToUser':
                prompt.get({
                    properties: {
                        amount: {
                            description: "Amount ?"
                        }
                    }
                }, function (err, result) {
                    socket.emit('addFundsToUser', { userId: userId, amount: result.amount } ,
                        (err, data) => {
                            console.log('err:', err, 'added funds', data);
                            cb(commandPrompt);
                        });
                });
                break;
            case 'bookCar':
                prompt.get({
                    properties: {
                        carId: {
                            description: "CarId ?"
                        }
                    }
                }, function (err, result) {
                    socket.emit('bookCar', { userId: userId, carId: result.carId } ,
                        (err, data) => {
                            console.log('err:', err, 'booking:', data);
                            cb(commandPrompt);
                        });
                });
                break;
            case 'endBooking':
                prompt.get({
                    properties: {
                        bookingId: {
                            description: "BookingId ?"
                        },
                        carId: {
                            description: "CarId ?"
                        }
                    }
                }, function (err, result) {
                    socket.emit('endBooking', { userId: userId, carId: result.carId, bookingId: result.bookingId } ,
                        (err, data) => {
                            console.log(err ? err : 'Booking ended sucessfully');
                            cb(commandPrompt);
                        });
                });
                break;
            case 'userBookingHistory':
                socket.emit('userBookingHistory', { userId: userId } ,
                    (err, data) => {
                        console.log('err:', err, data);
                        cb(commandPrompt);
                    });
                break;
            default:

        }
    });
};

prompt.get({
    properties: {
        userId: {
            description: "What is your userId?",
            required: true
        }
    }
}, function (err, result) {
    userId = result.userId;
    commandPrompt(commandPrompt);
});
