describe('Async Locks', function () {
  'use strict';
  var expect = chai.expect;

  describe('Async Locks Service', function () {
    var asyncLockService;

    beforeEach(function () {
      module('boriskozo.async-locks');
      inject(function ($injector) {
        asyncLockService = $injector.get('AsyncLockService');
      });
    });

    describe('Check is locked', function () {
      it('should check if a non existing lock is locked', function () {
        expect(asyncLockService.isLocked('foo')).to.be.false;
      });

      it('should check if an existing unlocked lock is locked', function (done) {
        asyncLockService.lock('foo', function (leave) {
          leave();
          expect(asyncLockService.isLocked('foo')).to.be.false;
          done();
        });

      });

      it('should check if an existing locked lock is locked', function (done) {
        asyncLockService.lock('foo', function (leave) {
          expect(asyncLockService.isLocked('foo')).to.be.true;
          done();
        });
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

    describe('Lock', function () {

      it('should execute the first entrant', function (done) {
        asyncLockService.lock('A', function(){
          done();
        });
      });

      it('should allow only one execution within a lock', function (done) {
       
        asyncLockService.lock('A',function () {
          asyncLockService.lock('A', function () {
            done('Should not be here');
          });
          done();
        });
      });

      it('should not allow non string lock name', function () {
        var foo = function () { };
        expect(function () {
          asyncLockService.lock({},foo);
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lock('',foo);
        }).to.throw('The name must be a non empty string');

        expect(function () {
          asyncLockService.lock(null,foo);
        }).to.throw('The name must be a non empty string');
      });

      it('should not allow entering with a non function', function () {
        expect(function () {
          asyncLockService.lock('moo');
        }).to.throw('Callback must be a function');
      });
    });

  });

  describe('Async Lock', function () {

    var AsyncLock;

    beforeEach(function () {
      module('boriskozo.async-locks');
      inject(function ($injector) {
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
      });

    });

    describe('Enter a lock', function () {

      it('should return a token', function (done) {
        var lock = new AsyncLock();
        var token = lock.enter(function (innerToken) {
          expect(token.id).to.be.equal(innerToken.id);
          done();
        });
      });

      it('should execute the first entrant', function (done) {
        var lock = new AsyncLock();
        lock.enter(function () {
          done();
        });
      });

      it('should allow only one execution within a lock', function (done) {
        var lock = new AsyncLock();
        lock.enter(function () {
          lock.enter(function () {
            done('Should not be here');
          });
          done();
        });
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
      });

      it('should allow enter after leave was called', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          lock.leave(token);
        });
        lock.enter(function () {
          done();
        });
      });

      it('should execute the next entrant when leave was called', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          setTimeout(function () {
            lock.leave(token);
          }, 100);
        });
        lock.enter(function () {
          done();
        });
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
    });

    describe('Stop a lock', function () {

      it('should throw if token is null or undefined', function () {
        var lock = new AsyncLock();
        expect(function () {
          lock.stop(null);
        }).to.throw('Token cannot be null or undefined');

        expect(function () {
          lock.stop(undefined);
        }).to.throw('Token cannot be null or undefined');

      });

      it('should throw if stop was called when there was no pending token', function () {
        var lock = new AsyncLock();
        expect(function () {
          lock.stop('');
        }).to.throw('There is no pending token in the lock but received ""');

      });

      it('should throw if stop was called with incorrect token', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          token.id = 11;
          expect(function () {
            lock.stop(token);
          }).to.throw('Owner token mismatch. Expected 0 but received 11');
          done();
        });
      });

      it('should allow enter after stop was called', function (done) {
        var lock = new AsyncLock();
        lock.executeCallback = function (token) {
          token.callback(token);
        };
        lock.enter(function (token) {
          lock.stop(token);
        });
        lock.enter(function () {
          done();
        });
      });


      it('should not execute the next entrant when stop was called', function (done) {
        var lock = new AsyncLock();
        lock.enter(function (token) {
          setTimeout(function () {
            lock.stop(token);
          }, 100);
        });
        lock.enter(function () {
          done('Should not be here');
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
        
      });

      it('should be locked someone locked it', function (done) {
        var lock = new AsyncLock();
        lock.enter(function () {
          expect(lock.isLocked()).to.be.true;
          done();
        });
      });
    });
  });
});
