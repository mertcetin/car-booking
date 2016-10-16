const cote = require('cote');

const userRequester = new cote.Requester({
    name: 'userRequester',
    namespace: 'user',
    requests: [ 'list', 'addFunds', 'endBooking' ]
});

const userSubscriber = new cote.Subscriber({
    name: 'userSubscriber',
    namespace: 'user',
    subscribesTo: [ 'update' ]
});

module.exports = {
    requester: userRequester,
    subscriber: userSubscriber
};
