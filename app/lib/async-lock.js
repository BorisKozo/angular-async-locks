angular.module('boriskozo.async-locks', [])
    .factory('AsyncLockFactory', function () {
      'use strict';

      var tokenId = 0;

      function elapsed() {
        return new Date() - this.start;
      }

      function leave() {
        if (this.lock) {
          this.lock.leave(this);
        }
      }

      /**
       * An asynchronous lock.
       * @constructor
       */
      var AsyncLock = function () {
        this.queue = [];
        this.ownerTokenId = null;
      };

      /**
       * A function that is used to create a token. Override if needed.
       * @param {function} callback - The callback associated with the acquiring of this token.
       */
      AsyncLock.prototype.createToken = function (callback) {
        return {
          id: tokenId++,
          isCanceled: false,
          callback: callback,
          elapsed: elapsed,
          start: new Date(),
          lock: this,
          leave: leave
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
       * @param {function} callback - The callback which is going to be called when the lock is acquired
       * @param {number} [timeout] - The amount of time to wait in milliseconds before canceling the callback call.
       * The callback is of the form foo(token) (i.e. it will receive the acquired token as a parameter when called)
       * @returns The token which controls the lock for this callback.
       */
      AsyncLock.prototype.enter = function (callback, timeout) {

        if (!angular.isFunction(callback)) {
          throw new Error('Callback must be a function');
        }

        var token = this.createToken(callback);

        if (token === null || token === undefined) {
          throw new Error('Token cannot be null or undefined');
        }

        if (this.ownerTokenId !== null) {
          this.queue.push(token);
          if (timeout) {
            token.timeoutId = setTimeout(function () {
              token.isCanceled = true;
              token.timeoutId = null;
            }, timeout);
          }
        } else {
          this.ownerTokenId = token.id;
          this.executeCallback(token);
        }
        return token;
      };

      /**
       * Releases the lock and resumes the next waiting callback.
       * @param {object} token - The token which has acquired the lock. 
       * This token is used only to make sure that only the appropriate owner releases the lock.
       */

      AsyncLock.prototype.leave = function (token) {
        if (token === null || token === undefined) {
          throw new Error('Token cannot be null or undefined');
        }
        if (this.ownerTokenId === null) {
          throw new Error('There is no pending token in the lock but received ' + JSON.stringify(token));
        }

        if (this.ownerTokenId !== token.id) {
          throw new Error('Owner token mismatch. Expected ' + this.ownerTokenId + ' but received ' + JSON.stringify(token.id));
        }

        var queueToken;
        this.ownerTokenId = null;
        while (this.queue.length > 0) {
          queueToken = this.queue.shift();
          if (queueToken.timeoutId) {
            clearTimeout(queueToken.timeoutId);
          }

          if (queueToken.isCanceled) {
            continue;
          }
          this.ownerTokenId = queueToken.id;
          this.executeCallback(queueToken);
        }
      };

      /**
       * Releases the lock and aborts all pending callbacks on this lock.
       * @param {object} token - The token which has acquired the lock. 
       * This token is used only to make sure that only the appropriate owner releases the lock.
       */
      AsyncLock.prototype.stop = function (token) {
        if (token === null || token === undefined) {
          throw new Error('Token cannot be null or undefined');
        }
        if (this.ownerTokenId === null) {
          throw new Error('There is no pending token in the lock but received ' + JSON.stringify(token));
        }

        if (this.ownerTokenId !== token.id) {
          throw new Error('Owner token mismatch. Expected ' + this.ownerTokenId + ' but received ' + JSON.stringify(token.id));
        }
        var i;
        for (i = 0; i < this.queue.length; i++) {
          if (this.queue[i].tokenId) {
            clearTimeout(this.queue[i].tokenId);
          }
        }
        this.queue = [];
        this.ownerTokenId = null;
      };

      /**
       * Checks if this lock is currently locked
       */
      AsyncLock.prototype.isLocked = function () {
        return this.ownerTokenId !== null;
      };

      return AsyncLock;

    })
    .service('AsyncLockService', ['AsyncLockFactory',

    function (AsyncLock) {
      'use strict';
      var locks = {};
      /**
       * Enters a critical section with the given name
       * @param {string} name - The name of the lock, every call to this function with the same name will enter the same lock
       * @param {function} callback - The callback that will be called once the lock is entered. The callback will receive one argument which is a 'done' function which must be called to free the lock
       * @param {number} timeout - The amount of time in milliseconds to wait before canceling the lock
       */
      this.lock = function (name, callback, timeout) {
        if (!name || typeof name !== 'string') {
          throw new Error('The name must be a non empty string');
        }

        if (!angular.isFunction(callback)) {
          throw new Error('Callback must be a function');
        }

        if (!locks[name]) {
          locks[name] = new AsyncLock();
        }

        var lock = locks[name];
        lock.enter(function (token) {
          callback(function () {
            lock.leave(token);
          });
        }, timeout);
      };

      this.isLocked = function (name) {
        debugger;
        if (!name || typeof name !== 'string') {
          throw new Error('The name must be a non empty string');
        }

        return Boolean(locks[name] && locks[name].isLocked());
      };

    }]);