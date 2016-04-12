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
var APP_SESSION = 'default';
var IOT_SESSION = 'iot';

var notifyIoT = function(self, msg) {
    var $$ = self.$.sharing.$;
    var notif = {msg: msg, fromCloud:  $$.fromCloud.dump()};
    self.$.session.notify([notif], IOT_SESSION);
};

var notifyWebApp = function(self, msg) {
    self.$.session.notify([msg], APP_SESSION);
};

exports.methods = {

    // Called by the framework
    
    '__ca_init__' : function(cb) {
        this.state.pinInputsValue = {};
        this.state.pinOutputsValue = {};
        this.state.pinMode = {};
        this.$.session.limitQueue(1, APP_SESSION); // only the last notification
        this.$.session.limitQueue(1, IOT_SESSION); // only the last notification
        this.state.fullName = this.__ca_getAppName__() + '#' +
            this.__ca_getName__();
        this.state.trace__iot_sync__ = 'traceSync';
        this.state.trace__iot_resume__ = 'traceResume';
        var rule = this.$.security.newSimpleRule('handleLambda'); //anybody
        this.$.security.addRule(rule);
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

    'handleLambda' : function(list, key, value,  cb) {
        assert(typeof key === 'string');
        assert(typeof value === 'string');
        this.$.log.debug('Calling handleLambda: list' + JSON.stringify(list) +
                         ' key ' + key + ' value ' + value);
        var getSet = {};
        getSet[key] = true;
        cb(null, {id: 1, get: getSet , put : {'fromCloud/bar' : 'foo'},
                  delete : {secret: true}});
    },

    'handleLambdaResponse' : function(req, resp,  cb) {
        this.$.log.debug('Calling handleLambdaResp: req' + JSON.stringify(req) +
                         ' res ' + JSON.stringify(resp));
        cb(null);
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

