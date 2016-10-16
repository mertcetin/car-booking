/**
 * This is a makeshift solution to run via single entry point on cloud platforms
 * Normally each microservice should be deployed and scaled separately
 */

const spawn = require('child_process').spawn;
const bookingService = spawn('node', ['./services/bookingService.js']);
const userService = spawn('node', ['./services/userService.js']);
const gatewayService = spawn('node', ['./services/gatewayService.js']);

bookingService.stdout.on('data', (data) => { console.log(`bookingService stdout: ${data}`); });
bookingService.stderr.on('data', (data) => { console.log(`bookingService stderr: ${data}`); });
bookingService.on('close', (code) => { console.log(`bookingService child process exited with code ${code}`); });
userService.stdout.on('data', (data) => { console.log(`userService stdout: ${data}`); });
userService.stderr.on('data', (data) => { console.log(`userService stderr: ${data}`); });
userService.on('close', (code) => { console.log(`userService child process exited with code ${code}`); });
gatewayService.stdout.on('data', (data) => { console.log(`gatewayService stdout: ${data}`); });
gatewayService.stderr.on('data', (data) => { console.log(`gatewayService stderr: ${data}`); });
gatewayService.on('close', (code) => { console.log(`gatewayService child process exited with code ${code}`); });
