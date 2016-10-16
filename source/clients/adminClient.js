const io = require('socket.io-client');
const config = require('../config/' + process.env.NODE_ENV || 'development' + '.json');
const socket = io(config.gateway || 'http://localhost:5555');
const prompt = require('prompt');

prompt.start();
let userId = null;

// this recursive commandPromt callback hell is definitely not a best practice
// this is implemented as a makeshift solution and not required to be used in actual implementation
let commandPrompt = function(cb) {
    prompt.get({
        properties: {
            command: {
                description: "Admin Command? (listUsers, userBookingHistory, carBookingHistory)"
            }
        }
    }, function (err, result) {
        if (!result) {
            process.exit(-1);
        }

        switch(result.command) {
            case 'listUsers':
                socket.emit('listUsers', {},
                    (err, data) => {
                        console.log('err:', err, 'user list', data);
                        cb(commandPrompt);
                    });
                break;
            case 'userBookingHistory':
                prompt.get({
                    properties: {
                        userId: {
                            description: "UserId ?"
                        }
                    }
                }, function (err, result) {
                    socket.emit('userBookingHistory', { userId: result.userId } ,
                        (err, data) => {
                            console.log('err:', err, data);
                            cb(commandPrompt);
                        });
                });
                break;
            case 'carBookingHistory':
                prompt.get({
                    properties: {
                        carId: {
                            description: "CarId ?"
                        }
                    }
                }, function (err, result) {
                    socket.emit('carBookingHistory', { carId: result.carId } ,
                        (err, data) => {
                            console.log('err:', err, data);
                            cb(commandPrompt);
                        });
                });
                break;
            default:
        }
    });
};

prompt.get({
    properties: {
        userId: {
            description: "What is your admin userId? (No security is implemented can be left empty)"
        }
    }
}, function (err, result) {
    userId = result.userId;
    commandPrompt(commandPrompt)
});

//subscribe to all updates as admin
socket.on('newBooking', (data) => {
    console.log('New Booking', data);
});

socket.on('bookingEnded', (data) => {
    console.log('bookingEnded', data);
});

socket.on('userUpdate', (data) => {
    console.log('userUpdate', data);
});
