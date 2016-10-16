
/**
 * Mongoose schemas models indexes and validations
 */
const mongoose = require('mongoose');
const env = process.env.NODE_ENV || 'development';
const config = require('./config/' + env + '.json');

let options = {};
if (config.mongodb.replSetName) {
    options = {
        server: { poolSize: global.config.mongodb.replSetSize },
        replset: { rs_name: global.config.mongodb.replSetName }
    };
    options.server.socketOptions = options.replset.socketOptions = { keepAlive: 1 };
}

mongoose.connect('mongodb://' + config.mongodb.host + '/' + config.mongodb.database, options);
if (config.debug)
    mongoose.set('debug', true);

const ObjectId = mongoose.Schema.Types.ObjectId;

mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connection.on('open', function callback () {
    console.log('Mongo Connection OK.');
});

let userSchema = new mongoose.Schema({
    name: String,
    role: { type: String, enum: [ 'client', 'admin' ], required: true },
    balance: {
        type: Number,
        min: [0, 'Balance cannot be negative'],
        required: true,
        default: 100
    },
    activeBooking: { type: ObjectId, ref: 'Booking', default: null },
    pendingBookings : [ { type: ObjectId, ref: 'Booking' } ]
});

userSchema.index({ pendingBookings: 1 });
let User = mongoose.model('User', userSchema);
// mongoose validations only work on $set $unset updates. We should add this validator directly to mongodb.
setTimeout(() => { User.db.db.command({ collMod: "users", validator: { balance: { $gte: 0 } }, validationLevel: "strict" }) }, 1000);

let carSchema = new mongoose.Schema({
    name: String,
    location: {
        'type': { type: String, required: true, default: 'Point' },
        coordinates: { type: [ Number ], index: '2dsphere' }
    },
    activeBooking: { type: ObjectId, ref: 'Booking', default: null },
    pendingBookings : [ { type: ObjectId, ref: 'Booking' } ]
});
carSchema.index({ location: "2dsphere" });
carSchema.index({ pendingBookings: 1 });
let Car = mongoose.model('Car', carSchema);

let bookingSchema = new mongoose.Schema({
    userId: { type: ObjectId, ref: 'User', required: true },
    carId: { type: ObjectId, ref: 'Car', required: true },
    cost: {
        type: Number,
        min: [0, 'Cost cannot be negative'],
        required: true
    },
    createdAt: { type: Date, default: Date.now, required: true },
    lastModifiedAt: { type: Date, default: Date.now, required: true },
    state: {
        type: Number,
        min: [0, 'State should be between 0 and 5'],
        max: [5, 'State should be between 0 and 5'],
        required: true
    }
});
bookingSchema.index({ carId: 1 });
bookingSchema.index({ state: 1 });
let Booking = mongoose.model('Booking', bookingSchema);
// add partial unique index to ensure a user can have only one outstanding transaction at a time
Booking.collection.createIndex({ userId: 1 }, { unique: true, partialFilterExpression: { state: { $lt: 4 } } });

const bookingStates = {
    'INITIAL': 0,
    'PENDING': 1,
    'APPLIED': 2,
    'CANCELLING': 3,
    'CANCELLED': 4,
    'COMMITTED': 5
};

module.exports = {
    User: User,
    Car: Car,
    Booking: Booking,
    bookingStates: bookingStates,
    types: mongoose.Types,
    config: config
};
