# angular-async-locks

A set of asynchronous lock patterns for Angular.js

## Documentation

This readme file contains basic usage examples and 
details on the full API, including methods, 
attributes and helper functions.
To use the library, include  ```lib/async-lock.js``` in your
index.html file after angular.js.


## Async-Lock Components:

All components are contained within the ```boriskozo.async-locks``` angular.js module.

* **AsyncLockFactory** Allows you to create an async lock.
* **AsyncLockService** Wraps around the AsyncLockFactory to provide management for your locks.


## AsyncLockFactory

A factory which allows the creation of the async lock.

### Basic Usage

Create an async lock and use the enter function to create a critical section.

```js
    var lock = new AsyncLock();
    lock.enter(function (token) {
        //this code will be executed by only one caller at a time
        //...
        lock.leave(token);
    });
});
```

### Helper Functions

AsyncLockFactory uses several helper functions (on the prototype) which can be overridden to provide custom functionality.

#### AsyncLockFactory#createToken(callback) -> token

A function that creates the token which will be used in this lock.
The token has the following fields:

* **id** - A unique id for each token, must be comparable using === operator.
* **isCanceled** - A boolean representing the cancelation state of the token.
* **callback** - The callback to be called when the token is ready to execute.
* **elapsed** - [optional] A function which returns the elapsed time between the creation of the token and now.
* **start** - [optional] The start time of when this token was created.
* **lock** - [optional] A reference to the lock that created this token.
* **leave** - [optional] A convenience function to leave the lock using this token.

#### AsyncLockFactory#executeCallback(token)

A function which is used to execute the callback on the token.
The default implementation will execute the callback asynchronously 
after successful acquiring of the lock.

### AsyncLockFactory API

The main API of the AsyncLock object created by the AsyncLockFactory.
_AsyncLockInstance_ represents an instance created by calling ````new AsyncLockFactory()````

#### AsyncLockInstance#enter(callback,[timeout]) -> token

Tries to acquire the lock and when successful executes the _callback_. If the lock
cannot be acquired waits (asynchronously) until the lock is freed. 
The callback function signiture is _callback(token)_, it will receive the token returned by the enter function.
If _timeout_ is provided will wait only the given amount of milliseconds and then discard the call.
If _timeout_ is not provided will wait indefinitely.

```js
 var lock = new AsyncLockFactory();
 var token = lock.enter(function (innerToken) {
          // innerToken === token
          // write the safe code here
          lock.leave(innerToken);
        });
      });
```

#### AsyncLockInstance#leave(token)

Leaves the lock and allows the execution of the next called to _enter_.
The _token_ must be the token that acquired the lock otherwise an exception will be thrown.
The callback of the next caller to _enter_ will be triggered based on the _executeCallback_ function (default is asynchronous).

```js
 var lock = new AsyncLockFactory();
 lock.enter(function (innerToken) {
        setTimeout(function(){
            console.log('First');
            lock.leave(innerToken);
        },2000);
    });
 });

 lock.enter(function (innerToken) {
     console.log('Second');
     lock.leave(innerToken);
 });
    
//Prints: First Second
```

#### AsyncLockInstance#stop(token)

Aborts the execution of all the pending callbacks on this lock.
The _token_ must be the token that acquired the lock otherwise an exception will be thrown.

```js
 var lock = new AsyncLockFactory();
 lock.enter(function (innerToken) {
        setTimeout(function(){
            console.log('First');
            lock.stop(innerToken);
        },2000);
    });
 });

 lock.enter(function (innerToken) {
     console.log('Second');
     lock.leave(innerToken);
 });
    
    //Prints: First
    //Second callback was aborted by stop
```

#### AsyncLockInstance#isLocked() -> boolean

Returns true if the lock is currently acquired and false otherwise.

```js
 var lock = new AsyncLockFactory();
 lock.isLocked(); //false
 lock.enter(function (innerToken) {
          // innerToken === token
          // write the safe code here
          lock.isLocked(); //true   
          lock.leave(innerToken);
        });
      });
```


## Unit Tests

1. Be sure you have NodeJS and NPM installed on your system

2. Run `npm install` to install Karma and Mocha

3. From the project folder, run `npm run-script test1` to execute the unit tests

##License
(MIT License)
Copyright (c) 2014 Boris Kozorovitzky, 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


