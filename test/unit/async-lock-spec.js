describe('Async Locks', function () {
    'use strict';
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

        it('should calculate the first 5 elements of the fibonacci series', function (done) {
            var data = [0, 1];

            var retrieveData = function (callback) {
                var x = data[data.length - 1];
                var y = data[data.length - 2];
                setTimeout(function () {
                    callback(x, y);
                }, 0);
            };

            var calculateSum = function (x, y, callback) {
                var sum = x + y;
                setTimeout(function () {
                    callback(sum);
                }, 0);
            };

            var addSum = function (sum, callback) {
                data.push(sum);
                setTimeout(callback, 0);
            };

            var i, lock = new AsyncLock();

            var fibonacci = function (token) {
                retrieveData(function (x, y) {
                    calculateSum(x, y, function (sum) {
                        addSum(sum, function () {
                            asyncMutex.leave(token);
                            if (data.length === 5) {
                                data[2].should.equal(1);
                                data[3].should.equal(2);
                                data[4].should.equal(3);
                                done();
                            }
                        });
                    });
                });
            };

            for (i = 0; i < 3; i++) {
                lock.enter(fibonacci);
            }

        });
    });
});