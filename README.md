angular-async-locks
==========================================
[![Build Status](https://travis-ci.org/BorisKozo/angular-async-locks.png?branch=master)](https://travis-ci.org/BorisKozo/angular-async-locks)


A set of asynchronous lock patterns for Angular.js

## Documentation

This readme file contains basic usage examples and 
details on the full API, including methods, 
attributes and helper functions.
To use the library, include  ````dist/async-lock.js```` or ````dist/async-lock.min.js```` in your
index.html file **after** angular.js.


## Async-Lock Components:

All components are contained within the ```boriskozo.async-locks``` angular.js module.

* **AsyncLockFactory** Allows you to create an async lock.
* **AsyncLockService** Wraps around the AsyncLockFactory to provide management for your locks.


## Why do you need async lock on a single threaded environment?
While your JavaScript code runs in a single threaded fashion (i.e. there is only a single thread running each function in the same context), the entire code runs in a multi threaded environment.
Consider a function that gets some data from the server, updates it and saves it back to the server. Your code would look something like this:

```js
function update(){
   readData('some_url', function callback(data){
       ... do some manipulation on data ...
       wrtieData('some_url', function ack(){
       });
   })
}
```

This code contains three separate functions - _update_, _callback_, and _ack_. While you know the order in which these
three functions will be called in a single flow, you cannot be sure in which order they are called in multiple flows. For example
if _update_ is called twice the order may be - update, update, callback, callback, ack, ack. In this case the second call to callback
function is manipulating an outdated version of the data because the updated version is still inside the first call to callback and was not
yet written to the server. An async lock is a pattern which can help you ensure the correct calls order between the functions:

```js
function update(token){
   readData('some_url', function callback(data){
       ... do some manipulation on data ...
       wrtieData('some_url', function ack(){
          token.leave();
       });
   })
}

var asyncLock = new AsyncLock();

function safeUpdate(){
    asyncLock.enter(update);
}
```
The _safeUpdate_ function uses an async lock to asynchronously block any subsequent calls to update until
_ack_ call is returned from the server. Once the the token calls the _leave_ function on the async lock it will automatically
trigger the next call to _update_ if such exists (you can always cancel the calls using timeouts or manually). This code
ensures that the order of calls is always: update, callback, ack, update, callback, ack.

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

AsyncLockFactory uses several helper functions (on the **prototype**) which can be overridden to provide custom functionality.

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

#### AsyncLockFactory#reduceQueue(queue, options)

A function which is used to reduce the lock queue size when a call to _enter_ is made.
If the options are changed programmatically it is up to the user to call this function to adjust the queue size.
Override this function to create different queuing logic.

### AsyncLockFactory API

The main API of the AsyncLock object created by the AsyncLockFactory.
_AsyncLockInstance_ represents an instance created by calling ````new AsyncLockFactory()````

#### AsyncLockFactory#constructor(options) -> AsyncLockInstance

Creates a new AsyncLockInstance using the given options.
If no options are provided the default options are used. 
The default options defined on ````AsyncLockFactory.defaultOptions```` as:
```js
{
        maxQueueSize: Infinity,
        overflowStrategy: 'this'
}
```
Override any default option to make all future locks created with the new defaults. Locks within the ````AsyncLockService```` are
created with these options as well.

##### Supported Options

* **maxQueueSize** (number) [default Infinity] - The maximum number of queued pending callbacks. Note that an executing callback is not considered pending.
* **overflowStrategy** (string) [default 'this'] - The strategy that will be used when a callback causes the pending queue to exceed the _maxQueueSize_. 
The value refers to the items that are going to be removed from the queue. 
Possible values are: 'this' - The current (the callback that caused the queue to exceed _maxQueueSize_) callback is going to be removed from the queue. 
'first' - The first (oldest) callback is going to be removed and the current callback will be added at the end. 'last' - The last callback is going to be removed
and the current callback will take its place.

Assuming the queue contains the callbacks [A,B,C] the callback D is the current callback and _maxQueueSize_ is 3, the resulting queue is:
* 'this' - [A,B,C]
* 'first' - [B,C,D]
* 'last' - [A,B,D]

```js
 var lock = new AsyncLockFactory({maxQueueSize:3});
 var token = lock.enter(function (innerToken) {
          // innerToken === token
          // write the safe code here
          lock.leave(innerToken);
        });
      });
```

#### AsyncLockInstance#enter(callback,[timeout]) -> token

Tries to acquire the lock and when successful executes the _callback_. If the lock
cannot be acquired waits (asynchronously) until the lock is freed. 
The callback function signature is _callback(token)_, it will receive the token returned by the enter function.
If _timeout_ is provided will wait only the given amount of milliseconds and then cancel the call.
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

#### AsyncLockInstance#leave(token,abortPending)

Leaves the lock and allows the execution of the next called to _enter_.
The _token_ must be the token that acquired the lock otherwise an exception will be thrown.
The callback of the next caller to _enter_ will be triggered based on the _executeCallback_ function (default is asynchronous).
If _abortPending_ is (boolean) true then all the pending callbacks are canceled and will not be called. For each canceled callback
token.isCanceled is set to true.

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

#### AsyncLockInstance#queueSize() -> number

Returns the number of callbacks currently pending on the lock.
Note than inside a callback that callback is no longer pending.

```js
 var lock = new AsyncLockFactory();
 lock.enter(function (token) {
     lock.queueSize(); // 1
     token.leave();
 });
 lock.enter(function (token) {
    lock.queueSize(); // 0
    token.leave();
 });
```

#AsyncLockService

Gives you a simple to use interface around AsyncLocks without the 
need to create your own lock instances.

### Basic Usage

Use Angular.js dependency injection to get the ```AsyncLockService```

```js
    ['AsyncLockService',function(asyncLockService){
       asyncLockService.lock('myLock',function (leaveCallback) {
        //this code will be executed by only one caller at a time
        //...
        leaveCallback();
    });
}]
```

### AsyncLockService API

The AsyncLockService provides a minimalistic API.
The underlying data structure is the AsyncLockFactory, please refer to the helper functions
for details on how to customize some of the behavior.

#### AsyncLockService#lock(lockName,callback,[timeout])

Tries to acquire the lock with the name _lockName_ and when successful executes the _callback_. If the lock
cannot be acquired waits (asynchronously) until the lock is freed. 
The callback function signature is _callback(leave)_, it will receive a _leave_ function that must be call to free the lock.
If _timeout_ is provided will wait only the given amount of milliseconds and then cancel the call.
If _timeout_ is not provided will wait indefinitely.

```js
       asyncLockService.lock('foo',function (leave) {
         //Do something critical
        leave();
    });
```

#### AsyncLockService#lockPromise(lockName,callback,...args) -> promise

Tries to acquire the lock with the name _lockName_ and when successful executes the _callback_. If the lock
cannot be acquired waits (asynchronously) until the lock is freed. Expects _callback_ to return a _$q_ promise
the lock is automatically frees when the promise returned by _callback_ is either resolved or rejected.
The rest of the arguments are passed directly to the callback function, the _this_ in the callback function is null.

```js
       asyncLockService.lockPromise('foo',function () {
          var deferred = $q.defer();
          deferred.resolve('ok');
          return deferred.promise;
       }).then(function(message){
             //The lock is free here
       });
```

#### AsyncLockService#isLocked(lockName) -> boolean

Returns true if the lock with the name _lockName_ is currently acquired and false otherwise.

```js
       asyncLockService.isLocked('foo'); //false
       asyncLockService.lock('foo',function (leave) {
           asyncLockService.isLocked('foo'); //true
           //Do something critical
           leave();
       });
```

#### AsyncLockService#lockExists(lockName) -> boolean

Returns true if the lock with the name _lockName_ already exists in the service and false otherwise.

```js
       asyncLockService.lockExists('foo'); //false
       asyncLockService.lock('foo',function (leave) {
           //Do something critical
           leave();
       });
     asyncLockService.lockExists('foo'); //true
```

#### AsyncLockService#queueSize(lockName) -> number

Returns the number of callbacks currently pending on the lock with the given name.
Note than inside a callback that callback is no longer pending.

```js
 
 asyncLockService.lock('foo',function (leave) {
     asyncLockService.queueSize('foo'); // 1
     leave();
 });

 asyncLockService.lock('foo',function (leave) {
    asyncLockService.queueSize('foo'); // 0
    leave();
 });
```

#### AsyncLockService#getOptions(lockName) -> object

Returns a copy of the options of the lock with the given name, if the lock doesn't exist returns null

```js
       asyncLockService.lock('foo',function (leave) {
           //Do something critical
           leave();
       });
     var options = asyncLockService.getOptions('foo'); //returns the default options of an AsyncLock
```

#### AsyncLockService#setOptions(lockName, options)

 Extends the options of a lock with the given name with the given options. If a lock with the given name doesn't exist, 
 creates the lock and extends the default options with the given options. This function may be used to create a lock without entering it
 by calling ````asyncLockService.setOptions('foo');````

```js
    syncLockService.setOptions('foo',{maxQueueSize:3}); //sets the maximum queue size of the lock foo to 3 
                                                        //Other options remain unchanged
    asyncLockService.lock('foo',function (leave) {
           //Do something critical
           leave();
       });
     
```

#ResetEvent

## What is a ResetEvent?
The reset event is somewhat based on the C# [AutoResetEvent](http://msdn.microsoft.com/en-us/library/system.threading.autoresetevent(v=vs.110).aspx) and [ManualResetEvent](http://msdn.microsoft.com/en-us/library/system.threading.manualresetevent.aspx) classes.
It is somewhat similar to a promise only it can be used multiple times.
When a function begins an activity that must complete before other functions proceed, it calls _reset_ to put the ResetEvent in the non-signaled state. 
Functions that call _wait_ on the reset event will not execute immediately, awaiting the signal. When the running function completes the activity, it calls _set_ to signal that the waiting functions can proceed. 
All waiting functions are executed until the event becomes non-signaled.
Once it has been signaled, a reset event remains signaled until it is manually reset using the _reset_ function. That is, calls to _wait_ execute immediately.

### Basic Usage

Use Angular.js dependency injection to get the ```ResetEventFactory```

```js
    ['ResetEventFactory',function(ResetEventFactory){

     var resetEvent = new ResetEventFactory();
      var x = 0;
      resetEvent.wait(function(){
          x+=1;
       });

      resetEvent.wait(function(){
          console.log(x); //2
       });
       x++;
       resetEvent.set();
}]
```

### Helper Functions

ResetEventFactory uses several helper functions (on the **prototype**) which can be overridden to provide custom functionality.

#### ResetEventFactory#createToken(callback) -> token

A function that creates the token which will be used in this reset event.
The token has the following fields:

* **id** - A unique id for each token, must be comparable using === operator.
* **isCanceled** - A boolean representing the cancelation state of the token.
* **callback** - The callback to be called when the token is ready to execute.
* **elapsed** - [optional] A function which returns the elapsed time between the creation of the token and now.
* **start** - [optional] The start time of when this token was created.
* **resetEvent** - [optional] A reference to the reset event that created this token.

#### AsyncLockFactory#executeCallback(token)

A function which is used to execute the callback on the token.
The default implementation will execute the callback synchronously.

#### AsyncLockFactory#reduceQueue(queue, options)

A function which is used to reduce the reset event queue size when a call to _wait_ is made.
If the options are changed programmatically it is up to the user to call this function to adjust the queue size.
Override this function to create different queuing logic.


### ResetEventFactory API

The main API of the ResetEvemt object created by the ResetEventFactory.
_ResetEventInstance_ represents an instance created by calling ````new ResetEventFactory()````

#### ResetEventFactory#constructor(isSignaled, options) -> ResetEventInstance

Creates a new ResetEventInstance using the given signaled state and options.
If no options are provided the default options are used. 
The default options defined on ````ResetEventFactory.defaultOptions```` as:
```js
{
        maxQueueSize: Infinity,
        overflowStrategy: 'this',
        autoResetCount: Infinity
}
```
Override any default option to make all future reset events created with the new defaults.

##### Supported Options
See AsyncLock [Supported Options](#supported-options) and:

* **autoResetCount** (number) [default Infinity] - The number of callbacks to call before the event is auto reset (becomes non-signaled).


#### ResetEventInstance#reset()

Marks the reset event as not signaled. All further calls to _wait_ will not execute immediately.

```js
 var resetEvent = new ResetEventFactory(true);
 resetEvent.wait(function(){
    //This is executed
 });
 resetEvent.reset();
 resetEvent.wait(function(){
    //This is not executed
 });
```

#### ResetEventInstance#set()

Marks the reset event as signaled and executes all pending callbacks. All further calls to _wait_ will execute immediately.
if _autoResetCount_ count option was passed, it will execute only this number of callbacks (excluding canceled callbacks)
and then mark the event as non-signaled.

```js
 var resetEvent = new ResetEventFactory(false);
 var x;
 resetEvent.wait(function(){
    console.log(x); // 10
 });
 x = 10;
 resetEvent.set();
 resetEvent.wait(function(){
    console.log(x); // 10
 });
 x = 20;
 resetEvent.wait(function(){
    console.log(x); // 20
 });
```

#### ResetEventInstance#wait(callback,[timeout])->token
  
Waits until the reset event becomes signaled then executes the callback function. 
If the reset event is already signaled when wait is called, the callback is executed immediately.
The callback function signature is _callback(token)_, it will receive the token returned by the _wait_ function.
If _timeout_ is provided will wait only the given amount of milliseconds and then cancel the call.
If _timeout_ is not provided will wait indefinitely.
Returns a token which can be used to track the elapsed time.

```js
 var resetEvent = new ResetEventFactory(false);
 var x;
 resetEvent.wait(function(){
    console.log(x); // This is never called
 },100);

 x = 10;

 setTimeout(function(){
    resetEvent.set();
  },1000);

 resetEvent.wait(function(){
    console.log(x); // 20
 });

 x = 20;

 resetEvent.wait(function(){
    console.log(x); // 20
 });
```
  
#### ResetEventInstance#isSignaled() -> boolean

Returns true if the reset event is currently signaled and false otherwise.

```js
 var resetEvent = new ResetEventFactory();
 resetEvent.isSignaled(); //false;
 resetEvent.set();
 resetEvent.isSignaled(); //true;
 resetEvent.reset();
 resetEvent.isSignaled(); //false;

```

#### ResetEventInstance#queueSize() -> number

Returns the number of callbacks currently pending on the reset event.
Note than inside a callback that callback is no longer pending.

```js
 var resetEvent = new ResetEventFactory(false);
 
 resetEvent.wait(function(){
    console.log(resetEvent.queueSize()); // 0
 });

 console.log(resetEvent.queueSize()); // 1
 resetEvent.set();
```    

## Change Log

### 0.2.0 -> 0.3.0

* **Breaking** - AsyncLockInstance#stop removed, use AsyncLockInstance#leave with _abortPending = true_

* Added ResetEventFactory

* Minor documentation changes

### 0.1.2 -> 0.2.0



* **Breaking** - AsyncLockService#isLocked - returns null if a lock with the given name doesn't exist (previously returned false)

* Added - AsyncLockService#lockExists

* Added - AsyncLockService#queueSize

* Added - AsyncLockService#getOptions

* Added - AsyncLockService#setOptions

* Added - AsyncLockFactory#constructor options

* Added - AsyncLockFactoryInstance#queueSize


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


