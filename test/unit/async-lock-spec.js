describe('Async Locks', function () {
  'use strict';
  var expect = chai.expect;

  describe('Async Locks Service', function () {
    var asyncLockService;
    var $timeout;
    var $q;
    var $rootScope;

    beforeEach(function () {
      module('boriskozo.async-locks');
      inject(function ($injector, _$timeout_, _$q_, _$rootScope_) {
        $timeout = _$timeout_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        asyncLockService = $injector.get('AsyncLockService');
      });
    });

    describe('Check if exists', function () {
      it('should return true for existing lock', function () {
        asyncLockService.lock('hello', function () { });
        expect(asyncLockService.lockExists('hello')).to.be.true;
      });

      it('should return false for non existing lock', function () {
        expect(asyncLockService.lockExists('hello')).to.be.false;
      });


      it('should not allow non string lock name', function () {
        expect(function () {
          asyncLockService.lockExists({});
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lockExists('');
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lockExists();
        }).to.throw('The name must be a non empty string');

      });


    });

    describe('Check is locked', function () {
      it('should check if a non existing lock is locked', function () {
        expect(asyncLockService.isLocked('foo')).to.be.null;
      });

      it('should check if an existing unlocked lock is locked', function (done) {
        asyncLockService.lock('foo', function (leave) {
          leave();
          expect(asyncLockService.isLocked('foo')).to.be.false;
          done();
        });
        $timeout.flush();

      });

      it('should check if an existing locked lock is locked', function (done) {
        asyncLockService.lock('foo', function () {
          expect(asyncLockService.isLocked('foo')).to.be.true;
          done();
        });
        $timeout.flush();
      });

      it('should not allow non string lock name', function () {
        expect(function () {
          asyncLockService.isLocked({});
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.isLocked('');
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.isLocked();
        }).to.throw('The name must be a non empty string');

      });
    });

    describe('Get queue size', function () {
      it('should get the size of non existing lock', function () {
        expect(asyncLockService.queueSize('foo')).to.be.null;
      });

      it('should get the queue size of empty lock', function (done) {
        asyncLockService.lock('foo', function (leave) {
          leave();
          expect(asyncLockService.queueSize('foo')).to.be.equal(0);
          done();
        });
        $timeout.flush();

      });

      it('should get the queue size of non empty lock', function (done) {
        asyncLockService.lock('foo', function (leave) {
          leave();
          expect(asyncLockService.queueSize('foo')).to.be.equal(0);
        });

        asyncLockService.lock('foo', function (leave) {
          done();
        });
        expect(asyncLockService.queueSize('foo')).to.be.equal(1);
        $timeout.flush();

      });


      it('should not allow non string lock name', function () {
        expect(function () {
          asyncLockService.isLocked({});
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.isLocked('');
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.isLocked();
        }).to.throw('The name must be a non empty string');

      });
    });

    describe('Get options', function () {
      it('should not get options of non existing lock', function () {
        expect(asyncLockService.getOptions('hello')).to.be.null;
      });

      it('should get options of existing lock', function () {
        asyncLockService.setOptions('lol', { a: 'a' });
        var options = asyncLockService.getOptions('lol');
        expect(options).to.be.ok;
        expect(options.a).to.be.equal('a');
        expect(options.maxQueueSize).to.be.defined;
      });
    });

    describe('Set options', function () {
      it('should set options of non existing lock', function () {
        asyncLockService.setOptions('lol', { a: 'a' });
        var options = asyncLockService.getOptions('lol');
        expect(options).to.be.ok;
        expect(options.a).to.be.equal('a');
        expect(options.maxQueueSize).to.be.defined;
      });

      it('should set options of existing lock', function (done) {
        asyncLockService.lock('lol', function (leave) {
          asyncLockService.setOptions('lol', { a: 'a' });
          var options = asyncLockService.getOptions('lol');
          expect(options).to.be.ok;
          expect(options.a).to.be.equal('a');
          expect(options.maxQueueSize).to.be.defined;
          done();
        });
        var originalOptions = asyncLockService.getOptions('lol')
        expect(originalOptions).to.be.ok;
        expect(originalOptions.a).to.be.undefined;
        $timeout.flush();
      });
    });

    describe('Lock', function () {

      it('should execute the first entrant', function (done) {
        asyncLockService.lock('A', function () {
          done();
        });
        $timeout.flush();
      });

      it('should allow only one execution within a lock', function (done) {

        asyncLockService.lock('A', function () {
          asyncLockService.lock('A', function () {
            done('Should not be here');
          });
          done();
        });
        $timeout.flush();
      });

      it('should not allow non string lock name', function () {
        var foo = function () { };
        expect(function () {
          asyncLockService.lock({}, foo);
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lock('', foo);
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lock(null, foo);
        }).to.throw('The name must be a non empty string');
      });

      it('should not allow entering with a non function', function () {
        expect(function () {
          asyncLockService.lock('moo');
        }).to.throw('Callback must be a function');
      });

      it('should allow lock after unlocked by first entrant', function (done) {
        asyncLockService.lock('A', function (leave) {
          leave();
        });

        asyncLockService.lock('A', function () {
          done();
        });

        $timeout.flush();
      });

      it('should not call the callback if the timeout has expired and do call it if not expired', function (done) {
        asyncLockService.lock('A', function (leave) {
          setTimeout(function () {
            leave();
            $timeout.flush();
          }, 100);
        });


        asyncLockService.lock('A', function () {
          done('error');
        }, 10);

        asyncLockService.lock('A', function () {
          done();
        }, 1000);

        $timeout.flush();
      });
    });

    describe('Lock Promise', function () {

      var resolvedFunc = function () {
        var deferred = $q.defer();
        deferred.resolve('ok');
        return deferred.promise;
      }

      var rejectedFunc = function () {
        var deferred = $q.defer();
        deferred.reject('error');
        return deferred.promise;
      }


      it('should execute the first entrant and resolve', function (done) {
        asyncLockService.lockPromise('A', resolvedFunc).then(function (result) {
          expect(result).to.be.equal('ok');
          done();
        });
        $timeout.flush();
      });

      it('should execute the first entrant and reject', function (done) {
        asyncLockService.lockPromise('A', rejectedFunc).then(function (result) {
          done('Should not reach here');
        }, function (result) {
          expect(result).to.be.equal('error');
          done();
        });
        $timeout.flush();
      });


      it('should allow only one execution within a lock', function (done) {

        asyncLockService.lockPromise('A', function () {
          var deferred = $q.defer();
          deferred.resolve('ok');
          asyncLockService.lockPromise('A', function () {
            done('Should not be here');
          });
          return deferred.promise;

        }).then(function () {
          done();
        });
        $timeout.flush();
      });

      it('should allow only one execution within a lock (regular inside promise)', function (done) {
        asyncLockService.lockPromise('A', function () {
          var deferred = $q.defer();
          deferred.resolve('ok');
          asyncLockService.lock('A', function () {
            done('Should not be here');
          });
          return deferred.promise;

        }).then(function () {
          done();
        });
        $timeout.flush();
      });

      it('should allow only one execution within a lock (promise inside regular)', function (done) {

        asyncLockService.lock('A', function () {
          asyncLockService.lockPromise('A', function () {
            done('Should not be here');
          });
          done();
        });
        $timeout.flush();
      });

      it('should not allow non string lock name', function () {
        var foo = function () { };
        expect(function () {
          asyncLockService.lockPromise({}, foo);
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lockPromise('', foo);
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lockPromise(null, foo);
        }).to.throw('The name must be a non empty string');
      });

      it('should not allow entering with a non function', function () {
        expect(function () {
          asyncLockService.lockPromise('moo');
        }).to.throw('Callback must be a function');
      });

      it('should allow lock after unlocked by first entrant', function (done) {
        asyncLockService.lockPromise('A', resolvedFunc).then(function () {
          asyncLockService.lockPromise('A', resolvedFunc).then(function () {
            done();
          });
        });
        $timeout.flush();
      });

      it('should pass arguments to the callback function', function (done) {
        asyncLockService.lockPromise('A', function (a, b) {
          expect(a).to.be.equal(1);
          expect(b).to.be.equal('a');
          done();
        }, 1, 'a');
        $timeout.flush();
      });
    });
  });

  describe('Async Lock', function () {

    var AsyncLock;
    var $timeout;

    beforeEach(function () {
      module('boriskozo.async-locks');
      inject(function ($injector, _$timeout_) {
        $timeout = _$timeout_;
        AsyncLock = $injector.get('AsyncLockFactory');
      });
    });

    describe('Real examples', function () {
      function delay(balance, callback) {
        setTimeout(function () {
          callback(balance);
        }, 10);
      }

      it('should calculate incorrect balance without the lock', function (done) {
        var count = 0;
        var balance = { //Simulate a value stored on a remote server
          value: 100
        };

        function updateBalance() {
          delay(balance.value, function (value) { //simulate reading the balance from remote server
            value -= 10;
            delay(value, function (value) { // simulate writing the balance back to remove server
              balance.value = value;
              if (count === 0) {
                count++;
                return;
              }
              expect(balance.value).to.be.equal(90);
              done();
            });
          });
        }

        updateBalance();
        updateBalance();
      });

      it('should calculate correct balance with the lock', function (done) {
        var count = 0;
        var balance = {
          value: 100
        };
        this.timeout(5000);
        var lock = new AsyncLock();

        function updateBalance() {
          lock.enter(function (token) {
            delay(balance.value, function (value) {
              value -= 10;
              delay(value, function (value) {
                balance.value = value;
                if (count === 0) {
                  count++;
                  lock.leave(token);
                  $timeout.flush();
                  return;
                }
                expect(balance.value).to.be.equal(80);
                done();
              });
            });
          });
        }

        updateBalance();
        updateBalance();
        $timeout.flush();
      });
    });

    describe('Helper functions', function () {
      it('should create tokens with different ids', function () {
        var lock = new AsyncLock();
        var token1 = lock.createToken();
        var token2 = lock.createToken();
        expect(token1.id).not.to.be.equal(token2.id);
      });

      it('should execute a callback asynchronously', function (done) {
        var lock = new AsyncLock();
        var flag = true;
        var callback = function () {
          expect(flag).to.be.false;
          done();
        };
        var token = lock.createToken(callback);
        lock.executeCallback(token);
        flag = false;
        $timeout.flush();
      });

      describe('Reduce Queue', function () {
        it('should return an empty list if maxQueueSize is not a number', function () {
          var lock = new AsyncLock();
          var queue = [];
          expect(lock.reduceQueue(queue, { maxQueueSize: 'a' }).length).to.be.equal(0);
          expect(lock.reduceQueue(queue, { maxQueueSize: NaN }).length).to.be.equal(0);
        });

        it('should return an empty list if overflowStrategy is not one of first,last,this', function () {
          var lock = new AsyncLock();
          var queue = ['a', 'b', 'c', 'd'];
          expect(lock.reduceQueue(queue, { maxQueueSize: 1, overflowStrategy: 'moo' }).length).to.be.equal(0);
        });

        it('should return an empty list if maxQueueSize is larger than actual queue size', function () {
          var lock = new AsyncLock();
          var queue = ['a', 'b', 'c', 'd'];
          expect(lock.reduceQueue(queue, { maxQueueSize: 5, overflowStrategy: 'last' }).length).to.be.equal(0);
        });

        it('should reduce the last elements of the queue if overflowStrategy is last', function () {
          var lock = new AsyncLock();
          var queue = ['a', 'b', 'c', 'd'];
          var reducedQueue = lock.reduceQueue(queue, { maxQueueSize: 2, overflowStrategy: 'last' });
          expect(queue.length).to.be.equal(2);
          expect(queue[0]).to.be.equal('a');
          expect(queue[1]).to.be.equal('d');
          expect(reducedQueue.length).to.be.equal(2);
          expect(reducedQueue[0]).to.be.equal('b');
          expect(reducedQueue[1]).to.be.equal('c');

        });

        it('should reduce the first elements of the queue if overflowStrategy is first', function () {
          var lock = new AsyncLock();
          var queue = ['a', 'b', 'c', 'd'];
          var reducedQueue = lock.reduceQueue(queue, { maxQueueSize: 2, overflowStrategy: 'first' });
          expect(queue.length).to.be.equal(2);
          expect(queue[0]).to.be.equal('c');
          expect(queue[1]).to.be.equal('d');
          expect(reducedQueue.length).to.be.equal(2);
          expect(reducedQueue[0]).to.be.equal('a');
          expect(reducedQueue[1]).to.be.equal('b');
        });

        it('should reduce only the last element of the queue if overflowStrategy is this', function () {
          var lock = new AsyncLock();
          var queue = ['a', 'b', 'c', 'd'];
          var reducedQueue = lock.reduceQueue(queue, { maxQueueSize: 2, overflowStrategy: 'this' });
          expect(queue.length).to.be.equal(3);
          expect(queue[0]).to.be.equal('a');
          expect(queue[1]).to.be.equal('b');
          expect(queue[2]).to.be.equal('c');
          expect(reducedQueue.length).to.be.equal(1);
          expect(reducedQueue[0]).to.be.equal('d');
        });

      });

    });

    describe('Enter a lock', function () {

      it('should return a token', function (done) {
        var lock = new AsyncLock();
        var token = lock.enter(function (innerToken) {
          expect(token.id).to.be.equal(innerToken.id);
          done();
        });
        $timeout.flush();
      });

      it('should execute the first entrant', function (done) {
        var lock = new AsyncLock();
        lock.enter(function () {
          done();
        });
        $timeout.flush();
      });

      it('should allow only one execution within a lock', function (done) {
        var lock = new AsyncLock();
        lock.enter(function () {
          lock.enter(function () {
            done('Should not be here');
          });
          done();
        });
        $timeout.flush();
      });

      it('should not allow entering with a non function', function () {
        var lock = new AsyncLock();
        expect(function () {
          lock.enter('hello world');
        }).to.throw('Callback must be a function');
      });

      it('should throw if createToken returns null', function () {
        var lock = new AsyncLock();
        lock.createToken = function () { return null; };
        expect(function () {
          lock.enter(function () { });
        }).to.throw('Token cannot be null or undefined');
      });

      it('should not call the callback if the timeout has expired and do call it if not expired', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (innerToken) {
          setTimeout(function () {
            lock.leave(innerToken);
            $timeout.flush();
          }, 100);
        });
        lock.enter(function () {
          done('error');
        }, 10);

        lock.enter(function () {
          done();
        }, 1000);
        $timeout.flush();
      });

      describe('Enter with queue options', function () {
        it('should not allow queuing locks if overflowStrategy is this', function (done) {
          var lock = new AsyncLock({ maxQueueSize: 0, overflowStrategy: 'this' });
          lock.enter(function (token) {
            lock.enter(function () {
              done('Should not get here');
            });
            expect(lock.queueSize()).to.be.equal(0);
            token.leave();
            done();
          });
          $timeout.flush();
        });

        it('should not allow queuing locks if overflowStrategy is first', function (done) {
          var lock = new AsyncLock({ maxQueueSize: 1, overflowStrategy: 'first' });
          lock.enter(function (token) {
            token.leave();
          });
          lock.enter(function (token) {
            done('This should not be called');
          });
          lock.enter(function (token) {
            done();
          });
          expect(lock.queueSize()).to.be.equal(1);
          $timeout.flush();
        });

        it('should not allow queuing locks if overflowStrategy is last', function (done) {
          var lock = new AsyncLock({ maxQueueSize: 1, overflowStrategy: 'last' });
          lock.enter(function (token) {
            token.leave();
          });
          lock.enter(function (token) {
            done('This should not be called');
          });
          lock.enter(function (token) {
            done();
          });

          expect(lock.queueSize()).to.be.equal(1);
          $timeout.flush();
        });

        it('should not allow queuing locks if overflowStrategy is this', function (done) {
          var lock = new AsyncLock({ maxQueueSize: 1, overflowStrategy: 'this' });
          lock.enter(function (token) {
            token.leave();
          });
          lock.enter(function (token) {
            done();
          });
          lock.enter(function (token) {
            done('This should not be called');
          });

          expect(lock.queueSize()).to.be.equal(1);
          $timeout.flush();
        });

      });
    });

    describe('Leave a lock', function () {

      it('should throw if token is null or undefined', function () {
        var lock = new AsyncLock();
        expect(function () {
          lock.leave(null);
        }).to.throw('Token cannot be null or undefined');

        expect(function () {
          lock.leave(undefined);
        }).to.throw('Token cannot be null or undefined');

      });

      it('should throw if leave was called when there was no pending token', function () {
        var lock = new AsyncLock();
        expect(function () {
          lock.leave('');
        }).to.throw('There is no pending token in the lock but received ""');

      });

      it('should throw if leave was called with incorrect token', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          token.id = 11;
          expect(function () {
            lock.leave(token);
          }).to.throw('Owner token mismatch. Expected 0 but received 11');
          done();
        });
        $timeout.flush();
      });

      it('should allow enter after leave was called', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          lock.leave(token);
          $timeout.flush();
        });
        lock.enter(function () {
          done();
        });
        $timeout.flush();
      });

      it('should allow enter after token.leave was called', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          token.leave();
          $timeout.flush();
        });
        lock.enter(function () {
          done();
        });
        $timeout.flush();
      });

      it('should allow queuing of several entrants', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          token.leave();
          $timeout.flush();
        });
        lock.enter(function (token) {
          token.leave();
          $timeout.flush();
        });
        lock.enter(function (token) {
          token.leave();
          $timeout.flush();
        });
        lock.enter(function () {
          done();
        });

        $timeout.flush();
      });


      it('should execute the next entrant when leave was called', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          setTimeout(function () {
            lock.leave(token);
            $timeout.flush();
          }, 100);
        });
        lock.enter(function () {
          done();
        });
        $timeout.flush();
      });

      it('should not execute the next entrant when leave was called if that token was canceled', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          setTimeout(function () {
            lock.leave(token);
          }, 100);
        });
        var token = lock.enter(function () {
          done('Should not be here');
        });

        token.isCanceled = true;

        setTimeout(done, 300);
      });

      it('should have positive elapsed time when leaving after some time', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          setTimeout(function () {
            expect(token.elapsed()).to.be.above(0);
            done();
          }, 100);
        });
        $timeout.flush();

      });

      it('should not execute the next entrants when leave was called and abort pending is true', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          setTimeout(function () {
            lock.leave(token, true);
            expect(lock.queueSize()).to.be.equal(0);
            expect(tempToken.isCanceled).to.be.true;
          }, 100);
        });

        var tempToken = lock.enter(function () {
          done('Should not be here');
        });

        lock.enter(function () {
          done('Should not be here 2');
        });

        setTimeout(done, 300);
      });
    });

    describe('Check is locked', function () {
      it('should be unlocked if no one entered the lock', function () {
        var lock = new AsyncLock();
        expect(lock.isLocked()).to.be.false;
      });

      it('should be unlocked if everyone left the lock', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          lock.leave(token);
          expect(lock.isLocked()).to.be.false;
          done();
        });
        $timeout.flush();
      });

      it('should be locked someone locked it', function (done) {
        var lock = new AsyncLock();
        lock.enter(function () {
          expect(lock.isLocked()).to.be.true;
          done();
        });
        $timeout.flush();
      });
    });

    describe('Get queue size', function () {
      it('should get a queue size of 0 if the lock is unlocked', function () {
        var lock = new AsyncLock();
        expect(lock.queueSize()).to.be.equal(0);
      });

      it('should get a queue size of 0 inside the callback', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          expect(lock.queueSize()).to.be.equal(0);
          done();
        })
        $timeout.flush();
      });

      it('should get a queue size of 2 when two callbacks are pending', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          expect(lock.queueSize()).to.be.equal(2);
          done();
        })
        lock.enter(function () { });
        lock.enter(function () { });
        $timeout.flush();
      });


    });

    describe('Create with options', function () {
      it('should have options if they were specified', function () {
        var lock = new AsyncLock({
          maxQueueSize: 5,
          overflowStrategy: 'aa'
        });
        expect(lock.options.maxQueueSize).to.be.equal(5);
        expect(lock.options.overflowStrategy).to.be.equal('aa');
      });

      it('should have partial options if they were specified', function () {
        var lock = new AsyncLock({
          maxQueueSize: 5,
        });
        expect(lock.options.maxQueueSize).to.be.equal(5);
        expect(lock.options.overflowStrategy).to.be.equal(AsyncLock.defaultOptions.overflowStrategy);
      });

      it('should have default options if they were not specified', function () {
        var lock = new AsyncLock();
        expect(lock.options.maxQueueSize).to.be.equal(Infinity);
        expect(lock.options.overflowStrategy).to.be.equal(AsyncLock.defaultOptions.overflowStrategy);
      });
    });
  });

  describe('Reset Event', function () {

    var ResetEvent;

    beforeEach(function () {
      module('boriskozo.async-locks');
      inject(function ($injector) {
        ResetEvent = $injector.get('ResetEventFactory');
      });
    });

    describe('Helper functions', function () {
      it('should create tokens with different ids', function () {
        var resetEvent = new ResetEvent();
        var token1 = resetEvent.createToken();
        var token2 = resetEvent.createToken();
        expect(token1.id).not.to.be.equal(token2.id);
      });

      it('should execute a callback synchronously', function (done) {
        var resetEvent = new ResetEvent();
        var callback = function () {
          done();
        };
        var token = resetEvent.createToken(callback);
        resetEvent.executeCallback(token);
      });

      describe('Reduce Queue', function () {
        it('should return an empty list if maxQueueSize is not a number', function () {
          var resetEvent = new ResetEvent();
          var queue = [];
          expect(resetEvent.reduceQueue(queue, { maxQueueSize: 'a' }).length).to.be.equal(0);
          expect(resetEvent.reduceQueue(queue, { maxQueueSize: NaN }).length).to.be.equal(0);
        });

        it('should return an empty list if overflowStrategy is not one of first,last,this', function () {
          var resetEvent = new ResetEvent();
          var queue = ['a', 'b', 'c', 'd'];
          expect(resetEvent.reduceQueue(queue, { maxQueueSize: 1, overflowStrategy: 'moo' }).length).to.be.equal(0);
        });

        it('should return an empty list if maxQueueSize is larger than actual queue size', function () {
          var resetEvent = new ResetEvent();
          var queue = ['a', 'b', 'c', 'd'];
          expect(resetEvent.reduceQueue(queue, { maxQueueSize: 5, overflowStrategy: 'last' }).length).to.be.equal(0);
        });

        it('should reduce the last elements of the queue if overflowStrategy is last', function () {
          var resetEvent = new ResetEvent();
          var queue = ['a', 'b', 'c', 'd'];
          var reducedQueue = resetEvent.reduceQueue(queue, { maxQueueSize: 2, overflowStrategy: 'last' });
          expect(queue.length).to.be.equal(2);
          expect(queue[0]).to.be.equal('a');
          expect(queue[1]).to.be.equal('d');
          expect(reducedQueue.length).to.be.equal(2);
          expect(reducedQueue[0]).to.be.equal('b');
          expect(reducedQueue[1]).to.be.equal('c');

        });

        it('should reduce the first elements of the queue if overflowStrategy is first', function () {
          var resetEvent = new ResetEvent();
          var queue = ['a', 'b', 'c', 'd'];
          var reducedQueue = resetEvent.reduceQueue(queue, { maxQueueSize: 2, overflowStrategy: 'first' });
          expect(queue.length).to.be.equal(2);
          expect(queue[0]).to.be.equal('c');
          expect(queue[1]).to.be.equal('d');
          expect(reducedQueue.length).to.be.equal(2);
          expect(reducedQueue[0]).to.be.equal('a');
          expect(reducedQueue[1]).to.be.equal('b');
        });

        it('should reduce only the last element of the queue if overflowStrategy is this', function () {
          var resetEvent = new ResetEvent();
          var queue = ['a', 'b', 'c', 'd'];
          var reducedQueue = resetEvent.reduceQueue(queue, { maxQueueSize: 2, overflowStrategy: 'this' });
          expect(queue.length).to.be.equal(3);
          expect(queue[0]).to.be.equal('a');
          expect(queue[1]).to.be.equal('b');
          expect(queue[2]).to.be.equal('c');
          expect(reducedQueue.length).to.be.equal(1);
          expect(reducedQueue[0]).to.be.equal('d');
        });

      });

    });

    describe('Create with options', function () {
      it('should create the reset event with appropriate signaled state', function () {
        var resetEvent = new ResetEvent(true);
        expect(resetEvent.isSignaled).to.be.true;
        resetEvent = new ResetEvent(false);
        expect(resetEvent.isSignaled).to.be.false;
        resetEvent = new ResetEvent();
        expect(resetEvent.isSignaled).to.be.false;
      });

      it('should create the reset event with appropriate options', function () {
        var resetEvent = new ResetEvent(true);
        expect(resetEvent.options.maxQueueSize).to.be.equal(ResetEvent.defaultOptions.maxQueueSize);
        expect(resetEvent.options.overflowStrategy).to.be.equal(ResetEvent.defaultOptions.overflowStrategy);
        expect(resetEvent.options.autoResetCount).to.be.equal(ResetEvent.defaultOptions.autoResetCount);

        var resetEvent = new ResetEvent(true, { maxQueueSize: 10, overflowStrategy: 'monkey', autoResetCount: 15 });
        expect(resetEvent.options.maxQueueSize).to.be.equal(10);
        expect(resetEvent.options.overflowStrategy).to.be.equal('monkey');
        expect(resetEvent.options.autoResetCount).to.be.equal(15);

        var resetEvent = new ResetEvent(true, { autoResetCount: 15 });
        expect(resetEvent.options.maxQueueSize).to.be.equal(ResetEvent.defaultOptions.maxQueueSize);
        expect(resetEvent.options.overflowStrategy).to.be.equal(ResetEvent.defaultOptions.overflowStrategy);
        expect(resetEvent.options.autoResetCount).to.be.equal(15);

      });

    });

    describe('Reset', function () {
      it('should trow if reset was called on a non signaled event', function () {
        var resetEvent = new ResetEvent(false);
        expect(function () {
          resetEvent.reset();
        }).to.throw('The reset event is already in a non signaled state');
      });

      it('should make the reset event non signaled', function () {
        var resetEvent = new ResetEvent(true);
        resetEvent.reset();
        expect(resetEvent.isSignaled).to.be.false;
      });
    });

    describe('Set', function () {
      it('should trow if reset was called on a signaled event', function () {
        var resetEvent = new ResetEvent(true);
        expect(function () {
          resetEvent.set();
        }).to.throw('The reset event is already in a signaled state');
      });

      it('should make the reset event signaled', function () {
        var resetEvent = new ResetEvent(false);
        resetEvent.set();
        expect(resetEvent.isSignaled).to.be.true;
      });

      it('should execute all the waiting callbacks', function () {
        var resetEvent = new ResetEvent(false);
        var count = 0;

        resetEvent.wait(function () {
          count++;
        });

        resetEvent.wait(function () {
          count++;
        });
        expect(count).to.be.equal(0);
        resetEvent.set();
        expect(count).to.be.equal(2);
      });

      it('should not execute canceled callbacks', function () {
        var resetEvent = new ResetEvent(false);
        var count = 0;

        resetEvent.wait(function () {
          count++;
        });

        resetEvent.wait(function () {
          count++;
        }).isCanceled = true;
        expect(count).to.be.equal(0);
        resetEvent.set();
        expect(count).to.be.equal(1);
      });

      it('should not execute timeout callbacks', function (done) {
        var resetEvent = new ResetEvent(false);
        var count = 0;

        resetEvent.wait(function () {
          count++;
        }, 10);

        resetEvent.wait(function () {
          count++;
        });
        expect(count).to.be.equal(0);
        setTimeout(function () {
          resetEvent.set();
          expect(count).to.be.equal(1);
          done();
        }, 100);
      });


    });

    describe('Wait', function () {
      it('should throw if callback is not a function', function () {
        var resetEvent = new ResetEvent();
        expect(function () {
          resetEvent.wait();
        }).to.throw('Callback must be a function');

        expect(function () {
          resetEvent.wait(10);
        }).to.throw('Callback must be a function');

      });


      it('should throw if create token returns undefined', function () {
        var resetEvent = new ResetEvent();
        resetEvent.createToken = function () { };
        expect(function () {
          resetEvent.wait(function () { });
        }).to.throw('Token cannot be null or undefined');
      });

      it('should return a token with timeoutId if timeout was provided', function () {
        var resetEvent = new ResetEvent();
        var token = resetEvent.wait(function () { }, 100);
        expect(token).to.be.ok;
        expect(token.timeoutId).to.be.ok;
      });

      it('should execute immediately if the event is signaled', function (done) {
        var resetEvent = new ResetEvent(true);
        resetEvent.wait(function () {
          done();
        });
      });

      it('should not execute immediately if the event is not signaled', function (done) {
        var resetEvent = new ResetEvent(false);
        resetEvent.wait(function () {
          done('should not get here');
        });

        expect(resetEvent.queueSize()).to.be.equal(1);
        done();
      });

      describe('Wait with queue options', function () {
        it('should not allow queuing if overflowStrategy is this', function (done) {
          var resetEvent = new ResetEvent(false, { maxQueueSize: 1, overflowStrategy: 'this' });

          resetEvent.wait(function () {
            done();
          });

          resetEvent.wait(function () {
            done('Should not be here');
          });

          expect(resetEvent.queueSize()).to.be.equal(1);
          resetEvent.set();
        });

        it('should not allow queuing if overflowStrategy is first', function (done) {
          var resetEvent = new ResetEvent(false, { maxQueueSize: 1, overflowStrategy: 'first' });

          resetEvent.wait(function () {
            done('Should not be here');
          });

          resetEvent.wait(function () {
            done();
          });

          expect(resetEvent.queueSize()).to.be.equal(1);
          resetEvent.set();
        });

        it('should not allow queuing if overflowStrategy is last', function (done) {
          var resetEvent = new ResetEvent(false, { maxQueueSize: 2, overflowStrategy: 'last' });

          resetEvent.wait(function () {
          });

          resetEvent.wait(function () {
            done('Should not be here');
          });

          resetEvent.wait(function () {
            done();
          });


          expect(resetEvent.queueSize()).to.be.equal(2);
          resetEvent.set();
        });

      });
    });

    describe('Queue size', function () {
      it('should get queue size of an empty event', function () {
        var resetEvent = new ResetEvent();
        expect(resetEvent.queueSize()).to.be.equal(0);
      });

      it('should get queue size of a waited event', function () {
        var resetEvent = new ResetEvent();
        resetEvent.wait(function () { });
        resetEvent.wait(function () { });
        expect(resetEvent.queueSize()).to.be.equal(2);
      });

    });

    describe('Signaled state', function () {
      it('should create the reset event with appropriate signaled state', function () {
        var resetEvent = new ResetEvent(true);
        expect(resetEvent.isSignaled).to.be.true;
        resetEvent = new ResetEvent(false);
        expect(resetEvent.isSignaled).to.be.false;
        resetEvent = new ResetEvent();
        expect(resetEvent.isSignaled).to.be.false;
      });
    });

    describe('Auto reset', function () {
      it('Should auto reset after the specified number of calls', function (done) {
        var resetEvent = new ResetEvent(false, { autoResetCount: 1 });
        resetEvent.wait(function () {

        });

        resetEvent.wait(function () {
          done('This should not be called');
        });

        resetEvent.wait(function () {
          done('This should not be called');
        });

        resetEvent.set();
        done();
      })

      it('Should auto reset after the specified number of calls with canceled', function (done) {
        var resetEvent = new ResetEvent(false, { autoResetCount: 1 });
        resetEvent.wait(function () {
        }).isCanceled = true;

        resetEvent.wait(function () {
          done();
        });

        resetEvent.wait(function () {
          done('This should not be called');
        });

        resetEvent.set();
      });

      it('Should auto reset after the specified number of calls with timeout', function (done) {
        var resetEvent = new ResetEvent(false, { autoResetCount: 1 });
        resetEvent.wait(function () {
          done();
        }, 100);

        resetEvent.wait(function () {
          done('This should not be called');
        });

        resetEvent.wait(function () {
          done('This should not be called');
        });

        resetEvent.set();
      });

      it('Should auto reset after the specified number of calls on wait', function (done) {
        var resetEvent = new ResetEvent(false, { autoResetCount: 1 });
        resetEvent.wait(function () {
        });

        resetEvent.set();

        resetEvent.wait(function () {
          done('This should not be called');
        });

        done();

      });

    });
  });
});
