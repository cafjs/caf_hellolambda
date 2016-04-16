/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";
var assert = require('assert');
var caf = require('caf_core');
var app = require('../public/js/app.js');
var caf_comp = caf.caf_components;
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var json_rpc = caf.caf_transport.json_rpc;
var diff = require('diff');

var APP_SESSION = 'default';
var IOT_SESSION = 'iot';
var CHANGES_PREFIX = 'Changes.';
var GPIO_PREFIX = 'gpio';
var FROM_CLOUD_PREFIX = '';

var notifyIoT = function(self, msg) {
    var $$ = self.$.sharing.$;
    var notif = {msg: msg, fromCloud:  $$.fromCloud.dump()};
    self.$.session.notify([notif], IOT_SESSION);
};

var notifyWebApp = function(self, msg) {
    self.$.session.notify([msg], APP_SESSION);
};

var lambdaUpdate = function(changes, allFiles, doNotDelete) {
    var toDelete =  Object.keys(changes).filter(function(x) {
        return (x.indexOf(CHANGES_PREFIX) === 0);
    });

    var toPut = {};
    Object.keys(allFiles).forEach(function(x) {
        toPut[FROM_CLOUD_PREFIX + x] = allFiles[x];
    });
    
    return {put : toPut, delete: (doNotDelete ? [] : toDelete)};
};

var patchFiles = function(self, commits, changes) {
    commits.forEach(function(x) {
        var key = CHANGES_PREFIX + x;
        var change = changes[key];
        self.$.log.debug('Patching file: ' + key + ' change:' + change);
        var p = diff.parsePatch(change);
        p.forEach(function(y) {
            self.$.log.debug('>>Patch: ' + JSON.stringify(y));
            var fileName = y.newFileName.split('/').slice(1).join('/');
            var target = self.state.allFiles[fileName] || '';
            self.$.log.debug('>>Before: ' + target);
            self.state.allFiles[fileName] = diff.applyPatch(target, y);
            self.$.log.debug('>>After: ' + self.state.allFiles[fileName]);
        });
        self.state.lastCommit = x;
    });
};

var patchGPIO = function(self) {
    var pinChanges = [];
    var allGPIO = Object.keys(self.state.allFiles);
    
    allGPIO.forEach(function(x) {
        self.$.log.debug('PatchGPIO: ' + x + ' value: ' +
                         self.state.allFiles[x]);
        if (x.indexOf(GPIO_PREFIX) === 0) {
            var pin = parseInt(x.split(GPIO_PREFIX)[1]);
            var value = JSON.parse(self.state.allFiles[x].trim());
            var newMode = !self.state.pinMode[pin] ||
                    self.state.pinMode[pin].input ||
                    !self.state.pinMode[pin].initialState;
            if (newMode || (self.state.pinOutputsValue[pin] !== value)) {
                pinChanges.push ({pin : pin, value: value, newMode: newMode});
            }
        }
    });
    return pinChanges;
};

exports.methods = {

    // Called by the framework
    
    '__ca_init__' : function(cb) {
        this.state.pinInputsValue = {};
        this.state.pinOutputsValue = {};
        this.state.pinMode = {};
        this.state.allFiles = {};
        this.state.lastCommit = 0;
        this.$.session.limitQueue(1, APP_SESSION); // only the last notification
        this.$.session.limitQueue(1, IOT_SESSION); // only the last notification
        this.state.fullName = this.__ca_getAppName__() + '#' +
            this.__ca_getName__();
        this.state.trace__iot_sync__ = 'traceSync';
        this.state.trace__iot_resume__ = 'traceResume';
        cb(null);
    },
    '__ca_pulse__' : function(cb) {
        this.$._.$.log && this.$._.$.log.debug('calling PULSE!!!');
        this.$.react.render(app.main, [this.state]);
        cb(null, null);
    },

    // Called by the web app
    
    'hello' : function(key, tokenStr, cb) {
        this.$.react.setCacheKey(key);
        this.$.iot.registerToken(tokenStr);
        this.getState(cb);
    },
    'changePinMode' : function(pin, input, floating, cb) {
        var $$ = this.$.sharing.$;
        var self = this;
        var newMode = (input ?  {
            input: true,
            internalResistor: { pullUp: this.$.props.resistorPullUp }
        } : {
            input: false,
            initialState: { high: this.$.props.initialStateHigh }
        });
        if (floating) {
            delete newMode.initialState;
        }
        
        this.deletePin(pin, function(err) {
            if (err) {
                cb(err);
            } else {
                self.state.pinMode[pin] = newMode;
                $$.fromCloud.set('meta', myUtils.deepClone(self.state.pinMode));
                notifyIoT(self, 'Changed pin mode');
                self.getState(cb);
            }
        });
    },
    'changePinValue' : function(pin, value, cb) {
        if (this.state.pinMode[pin] && !this.state.pinMode[pin].input
            && this.state.pinMode[pin].initialState) {
            var $$ = this.$.sharing.$;
            this.state.pinOutputsValue[pin] = value;
            $$.fromCloud.set('out', myUtils.deepClone(this.state
                                                      .pinOutputsValue));
            notifyIoT(this, 'Changed pin values');
            this.getState(cb);
        } else {
            var error = new Error('Cannot change pin value');
            error.pin = pin;
            error.pinMode = this.state.pinMode[pin];
            error.value = value;
            cb(error);
        }
    },
    'deletePin' : function(pin, cb) {
        var $$ = this.$.sharing.$;
        if (this.state.pinMode[pin]) {
            delete this.state.pinMode[pin];
            $$.fromCloud.set('meta', myUtils.deepClone(this.state.pinMode));
        }
        if (typeof  this.state.pinOutputsValue[pin] === 'boolean') {
            delete this.state.pinOutputsValue[pin];
            $$.fromCloud.set('out', myUtils.deepClone(this.state
                                                      .pinOutputsValue));
        }
        delete this.state.pinInputsValue[pin];
        this.getState(cb);
    },
    'getState' : function(cb) {
        this.$.react.coin();
        cb(null, this.state);
    },
    
    //Called by the Lambda function

    'handleLambda' : function(changes,  cb) {
        var self  = this;
        assert(typeof changes === 'object');
        this.$.log.debug('Calling handleLambda: changes' +
                         JSON.stringify(changes));

        var commits = Object.keys(changes).map(function(x) {
            if (x.indexOf(CHANGES_PREFIX) === 0) {
                return parseInt(x.split(CHANGES_PREFIX)[1]);
            } else {
                return -1;
            }
        }).filter(function(x) {
            return (x > self.state.lastCommit);
        }).sort();
        
        if ((commits.length > 0) &&
            (commits[0] ===  self.state.lastCommit + 1)) {

            patchFiles(this, commits, changes);

            // type {pin : number, value: object, newMode: boolean}
            var pinChanges = patchGPIO(this);
        
            async.eachSeries(pinChanges, function(pc, cb0) {
                async.series([
                    function(cb1) {
                        if (pc.newMode) {
                            self.changePinMode(pc.pin, false, false, cb1);
                        } else {
                            cb1(null);
                        }
                    },
                    function(cb1) {
                        self.changePinValue(pc.pin, pc.value, cb1);
                    }
                ], cb0);
            }, function(err) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, lambdaUpdate(changes, self.state.allFiles)); 
                }
            });
        } else {
            cb(null, lambdaUpdate(changes, this.state.allFiles, true));
        }
    },
    
    // Called by the IoT device
    
    'traceSync' : function(cb) {
        var $$ = this.$.sharing.$;
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Syncing!!:' + now);
        this.state.pinInputsValue =  myUtils.deepClone($$.toCloud.get('in'));
        notifyWebApp(this, 'New inputs');
        cb(null);
    },
    'traceResume' : function(cb) {
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Resuming!!:' + now);
        cb(null);
    }
};


caf.init(module);

