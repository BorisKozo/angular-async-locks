angular.module('boriskozo.async-locks', [])
    .factory('AsyncLockFactory', function () {
        'use strict';
        var AsyncLock = function () {
            this.queue = [];
            this.ownerToken = null;
            this.token = 0;
        };

        AsyncLock.prototype.enter = function (callback) {
            if (this.ownerToken !== null) {
                this.queue.push(callback);
            } else {
                this.token++;
                this.ownerToken = this.token;
                callback(this.token);
            }
        };

        AsyncLock.prototype.leave = function (token) {
            if (this.ownerToken === null || this.ownerToken !== token) {
                throw new Error("Owner token mismatch. Expected " + this.ownerToken + " but received " + token);
            }

            var callback;

            if (this.queue.length > 0) {
                this.token++;
                this.ownerToken = this.token;
                callback = this.queue.shift();
                callback(this.token);
            } else {
                this.ownerToken = null;
            }
        };

        AsyncLock.prototype.clear = function (token) {
            if (this.ownerToken === null || this.ownerToken !== token) {
                throw new Error("Owner token mismatch. Expected " + this.ownerToken + " but received " + token);
            }

            this.queue = [];
            this.ownerToken = null;
        };

        return AsyncLock;

    })
    .service('AsyncLocksService', [

    function () {
            'use strict';

            this.print = function () {
                console.log('Hello World');
            };
}]);