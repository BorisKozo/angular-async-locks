angular.module('boriskozo.async-locks', [])
    .factory('AsyncLockFactory', function () {
        'use strict';

        var tokenId = 0;

        function elapsed() {
            return new Date() - this.start;
        }

        /**
         * An asynchronous lock.
         * @constructor
         */
        var AsyncLock = function () {
            this.queue = [];
            this.ownerToken = null;
        };

        /**
         * A function that is used to create a token. Override if needed.
         * @param {function} callback - The callback assosiated with the aquring of this token.
         */
        AsyncLock.prototype.createToken = function (callback) {
            return {
                id: tokenId++,
                isCanceled: false,
                callback: callback,
                elapsed: elapsed,
                start: new Date()
            };
        };

        /**
         * A function that is used to execute the user callback. Default implementation invokes the callback asynchronously.
         * Override if needed.
         * @param {object} token - The the token which contains the callback to call.
         */
        AsyncLock.prototype.executeCallback = function (token) {
            setTimeout(function () { //this is because < IE10 doesn't support setTimeout with parameters
                token.callback(token);
            }, 0);
        };

        /**
         * Locks the lock and generates a token which can be used to control the lock.
         * @param {function} callback - The callback which is going to be called when the lock is aquired
         * The callback is of the form foo(token) (i.e. it will recieve the aquired token as a parameter when called)
         * @returns The token which controls the lock for this callback.
         */
        AsyncLock.prototype.enter = function (callback) {
            var token = this.createToken(callback);

            if (token === null || token === undefined) {
                throw new Error("Token cannot be null or undefined");
            }

            if (this.ownerToken !== null) {
                this.queue.push(token);
            } else {
                this.ownerToken = token;
                this.executeCallback(token);
            }
            return token;
        };

        /**
         * Releases the lock and resumes the next waiting callback.
         * @param {object} token - The token which has aquired the lock. This token is used only to make sure that only the appropriate owner releases the lock.
         */

        AsyncLock.prototype.leave = function (token) {
            if (token === null || token === undefined) {
                throw new Error("Token cannot be null or undefined");
            }
            if (this.ownerToken === null) {
                throw new Error("There is no pending token in the lock but receieved " + JSON.stringify(token));
            }

            if (this.ownerToken === null || this.ownerToken.id !== token.id) {
                throw new Error("Owner token mismatch. Expected " + this.ownerToken + " but received " + JSON.stringify(token));
            }

            var queueToken;
            this.ownerToken = null;
            while (this.queue.length > 0) {
                queueToken = this.queue.shift();
                if (queueToken.isCanceled) {
                    continue;
                }
                this.ownerToken = queueToken;
                this.executeCallback(queueToken);
            }
        };

        /**
         * Releases the lock and aborts all pending callbacks on this lock.
         * @param {object} token - The token which has aquired the lock. This token is used only to make sure that only the appropriate owner releases the lock.
         */

        AsyncLock.prototype.stop = function (token) {
            if (token === null || token === undefined) {
                throw new Error("Token cannot be null or undefined");
            }
            if (this.ownerToken === null) {
                throw new Error("There is no pending token in the lock but receieved " + JSON.stringify(token));
            }

            if (this.ownerToken === null || this.ownerToken.id !== token.id) {
                throw new Error("Owner token mismatch. Expected " + this.ownerToken + " but received " + JSON.stringify(token));
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