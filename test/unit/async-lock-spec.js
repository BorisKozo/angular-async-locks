describe('Async Locks', function () {
    'use strict';
    var expect = chai.expect;

    describe('Async Locks Service', function () {

        //        beforeEach(module('myApp.controllers'));
        //
        //
        //        it('should ....', inject(function ($controller) {
        //            //spec body
        //            var myCtrl1 = $controller('MyCtrl1', {
        //                $scope: {}
        //            });
        //            expect(myCtrl1).toBeDefined();
        //        }));
        //
        //        it('should ....', inject(function ($controller) {
        //            //spec body
        //            var myCtrl2 = $controller('MyCtrl2', {
        //                $scope: {}
        //            });
        //            expect(myCtrl2).toBeDefined();
        //        }));
    });

    describe('Async Lock', function () {

        var AsyncLock;

        beforeEach(function () {
            module('boriskozo.async-locks');
            inject(function ($injector) {
                AsyncLock = $injector.get('AsyncLockFactory');
            });
        });

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
});