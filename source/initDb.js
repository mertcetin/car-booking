
/**
 * Initialize DB with a handful of records
 */
const models = require('./models');
const async = require('async');

const users = [
    {
        _id: models.types.ObjectId('580285fa5a5cf8673dd13f78'),
        name: 'Mert Cetin',
        role: 'admin'
    },
    {
        _id: models.types.ObjectId('580285fa5a5cf8673dd13f79'),
        name: 'Ordinary Client',
        role: 'client'
    },
    {
        _id: models.types.ObjectId('580285fa5a5cf8673dd13f7a'),
        name: 'Rich Client',
        role: 'client',
        balance: 1000
    }
];

const cars = [
    {
        _id: models.types.ObjectId('580285fa5a5cf8673dd13f7b'),
        name: 'DeLorian',
        location: { type: 'Point', coordinates: [ 29.02, 40.98 ] } // close to test location
    },
    {
        _id: models.types.ObjectId('580285fa5a5cf8673dd13f7c'),
        name: 'Bumblebee',
        location: { type: 'Point', coordinates: [ 29.03, 40.92 ] } // moderetaly close to test location
    },
    {
        _id: models.types.ObjectId('580285fa5a5cf8673dd13f7d'), // far away from test location
        name: 'Kit',
        location: { type: 'Point', coordinates: [ 32, 45 ] }
    }
];

async.series([
    (done) => {
        models.User.find({}).remove(() => {
            models.User.create(users, () => { console.log('finished populating users'); done(null); }
            );
        });
    }, (done) => {
        models.Car.find({}).remove(() => {
            models.Car.create(cars, () => { console.log('finished populating cars'); done(null); }
            );
        });
    }
], (err, result) => { process.exit(0); });


