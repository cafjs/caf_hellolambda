var AppDispatcher = require('../dispatcher/AppDispatcher');
var AppConstants = require('../constants/AppConstants');
var EventEmitter2 = require('eventemitter2').EventEmitter2;

var CHANGE_EVENT = 'change';

var newAppStore = function() {

    var server = new EventEmitter2();

    var state = {pinMode: {}, pinInputsValue:{}, pinOutputsValue:{}, secret: '',
                 isClosed: false};

    var that = {};

    var lastLateBundleDismissed = -1;
    
    var emitChange = function() {
        server.emit(CHANGE_EVENT);
    };

    that.addChangeListener = function(callback) {
        server.on(CHANGE_EVENT, callback);
    };

    that.removeChangeListener = function(callback) {
        server.removeListener(CHANGE_EVENT, callback);
    };

    that.getState = function() {
        return state;
    };

    var mixinState = function(newState) {
        Object.keys(newState)
            .forEach(function(key) { state[key] = newState[key]; });
    };

    var lateBundle = function() {
        if (lastLateBundleDismissed !== state.lastBundleIndex) {
            var acks = state.acks || [];
            return acks.some(function(x) {
                return ((x.index === state.lastBundleIndex) && (!x.result));
            });
        } else {
            return false;
        }

    };
    
    var f = function(action) {
        switch(action.actionType) {
        case AppConstants.APP_UPDATE:
            mixinState(action.state);
            if (lateBundle()) {
                lastLateBundleDismissed = state.lastBundleIndex;
                state.error = new Error('The last bundle was late, and it ' +
                                        'was ignored by the device. Please, ' +
                                        'increase the delay');
            }
            emitChange();
            break;
        case AppConstants.APP_NOTIFICATION:
            mixinState(action.state);
            emitChange();
            break;
        case AppConstants.APP_ERROR:
            state.error = action.error;
            console.log('Error:' + action.error);
            emitChange();
            break;
        case AppConstants.WS_STATUS:
            state.isClosed = action.isClosed;
            emitChange();
            break;
        default:
            console.log('Ignoring '+ JSON.stringify(action));
        }
    };

    AppDispatcher.register(f);
    return that;
};

module.exports = newAppStore();
