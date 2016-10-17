**Car Booking Application (Technical challenge for a company I applied to)**
# Overview
This repo contains two main folders.

_sdd_ contains software design documents for the project.

_source_ contains source files for the implementation.

# Installation
Make sure mongodb is running on localhost 27017.

`npm install` in the _source_ directory.

`node initDb.js` to initialize db with seed data.


`node services/gatewayService.js` for API Gateway

`node services/bookingService.js` for Booking Service

`node services/userService.js` for User Service

run `npm test` to test everything works initially. Make sure mocha is installed globally via `npm install mocha -g`.

If you wish you can run `node index.js` to spawn one of each service.

## API Gateway
API Gateway supports the following commands (All ids are mongodb ObjectId strings):
##### listUsers()
lists all users in the system.
##### addFundsToUser(userId: String, amount: Number)
adds designated amount of funds to the given user
##### listNearbyCars(location: [Number, Number], range: Number)
takes longitude, latitute pairs in that order.
range is in meters.
displayes available cars in the given range around the given location.
##### bookCar(userId: String, carId: String)
books the given car to the given user if user's funds are enough, the car is available and there are no outstanding transactions for that user.
##### endBooking(bookingId: String, userId: String, carId: String)
ends the given booking. userId and carId are made mandatory to provide a thin layer of security.
##### userBookingHistory(userId: String)
lists a given user's booking history ordered from most recent to least.
Active booking id is also listed if the user has any.
##### carBookingHistory(carId: String)
lists a given car's booking history ordered from most recent to least.
Active booking id is also listed if the car is assigned any.

## Clients
There are two clients for testing. One has all the functions that a normal user needs (userClient.js) and the other has administrative functions (adminClient.js)

No layer of security is implemented. It is assumed all necessary security checks are made already beforehand.

User client needs a userId to function. Although admin client asks for one, it is not needed.

Clients are in an endless callback loop asking for commands. Available commands are displayed on each promt.

Wrong commands are not handled. So if you make a mistake restart the client.

## Example booking flow
Run `node initDb.js` to refresh the state of the test database.

Run admin client in a terminal window.

Enter `listUsers` and copy a userId. (eg: 580285fa5a5cf8673dd13f79)

Now run user client in another terminal window.

From the user window enter the copied id as userId at the first prompt.

Enter `listNearbyCars` and `10000` as range.

You'll see there are two cars available. Pick one (e.g: 580285fa5a5cf8673dd13f7b)

Enter `bookCar` and paste this copied carId.

You should have successfully booked the car. An update notifying this booking should be shown on the admin window as well.

Enter `userBookingHistory` to the prompt to display the transactions.

You'll see that the suer has an active booking. Copy the id displayed at the activeBooking field.

Enter `endBooking` and paste the copied booking id to the prompt. Enter the previously used car id as well.

Now you've ended your booking. Another update is visible on the admin screen designating the booking's end.
