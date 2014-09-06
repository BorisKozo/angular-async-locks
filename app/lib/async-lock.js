angular.module('boriskozo.async-locks', [])
    .factory('AsyncLockFactory', ['$timeout', function ($timeout) {
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
       * @param {object} options - optional set of options for this lock
       */
      var AsyncLock = function (options) {
        this.queue = [];
        this.ownerTokenId = null;
        this.options = angular.extend({}, AsyncLock.defaultOptions, options);
      };

      AsyncLock.defaultOptions = {
        maxQueueSize: Infinity,
        overflowStrategy: 'this'
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
       * Removes items from the given queue based on the given options
       * @param {array} queue - The queue of tokens
       * @param {object} options - The options that control the reduction algorithm
       * @returns an array of the tokens which were removed from the queue
       */
      AsyncLock.prototype.reduceQueue = function (queue, options) {
        var result = [];
        if ((typeof options.maxQueueSize !== 'number') || Number.isNaN(options.maxQueueSize)) {
          return result;
        }

        if (queue.length > options.maxQueueSize) {
          if (options.overflowStrategy === 'last') {
            var last = queue.pop();
            while (queue.length && queue.length > (options.maxQueueSize - 1)) {
              result.unshift(queue.pop());
            }
            queue.push(last);
            return result;
          }

          if (options.overflowStrategy === 'first') {
            while (queue.length && queue.length > options.maxQueueSize) {
              result.push(queue.shift());
            }
            return result;
          }

          if (queue.length && options.overflowStrategy === 'this') {
            result.push(queue.pop());
            return result;
          }
        }

        return result;
      };

      /**
       * A function that is used to execute the user callback. Default implementation invokes the callback asynchronously.
       * Override if needed.
       * @param {object} token - The the token which contains the callback to call.
       */
      AsyncLock.prototype.executeCallback = function (token) {
        $timeout(function () {
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

          var i, reducedTokens = this.reduceQueue(this.queue, this.options);
          for (i = 0; i < reducedTokens.length; i++) {
            reducedTokens[i].isCanceled = true;
            if (reducedTokens[i].timeoutId) {
              clearTimeout(reducedTokens[i].timeoutId);
            }
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
          break;
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

      /**
      * Returns the number of pending callbacks
      */
      AsyncLock.prototype.queueSize = function () {
        return this.queue.length;
      };


      return AsyncLock;

    }])
    .service('AsyncLockService', ['AsyncLockFactory', '$q',

    function (AsyncLock, $q) {
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

      /**
      * Enters a critical section with the given name but expects the callback to return a $q promise.
      * When the promise is either resolved or rejected the lock will be unlocked.
      * @param {string} name - The name of the lock, every call to this function with the same name will enter the same lock
      * @param {function} callback - The callback that will be called once the lock is entered. The lock will be unlocked when the promise from this callback is either resolved or rejected
      */
      this.lockPromise = function (name, callback) {
        if (!name || typeof name !== 'string') {
          throw new Error('The name must be a non empty string');
        }

        if (!angular.isFunction(callback)) {
          throw new Error('Callback must be a function');
        }

        if (!locks[name]) {
          locks[name] = new AsyncLock();
        }

        var deferred = $q.defer();
        var args = Array.prototype.slice.call(arguments, 2);
        var lock = locks[name];
        lock.enter(function (token) {
          var innerPromise = callback.apply(null, args).then(function (successData) {
            deferred.resolve(successData);
            lock.leave(token);
          }, function (failData) {
            deferred.reject(failData);
            lock.leave(token);
          }, function (updateData) {
            deferred.notify(updateData);
          });
        });

        return deferred.promise;
      };

      /**
       * Returns true if a lock with the given name exists and false otherwise
       */
      this.lockExists = function (name) {
        if (!name || typeof name !== 'string') {
          throw new Error('The name must be a non empty string');
        }

        return Boolean(locks[name]);
      };

      /**
       * Returns true if the lock with the given name is locked and false otherwise
       * If the lock doesn't exist returns null
       */
      this.isLocked = function (name) {
        if (this.lockExists(name)) {
          return locks[name].isLocked();
        }
        return null;
      };

      /**
       * Returns the number of pending callbacks
       * If the lock doesn't exist returns null
       */
      this.queueSize = function (name) {
        if (this.lockExists(name)) {
          return locks[name].queueSize();
        }
        return null;
      };

      /**
       * Sets the options of a lock with the given name
       * If a lock with the given name doesn't exist, creates a lock
       */
      this.setOptions = function (name, options) {
        if (this.lockExists(name)) {
          locks[name].options = angular.extend(locks[name].options, options);
        } else {
          locks[name] = new AsyncLock(options);
        }
      };

      /**
       * Returns a copy of the options of the lock with the given name
       * If the lock doesn't exist returns null
       */
      this.getOptions = function (name) {
        if (this.lockExists(name)) {
          return angular.copy(locks[name].options);
        }

        return null;
      };

    }]);