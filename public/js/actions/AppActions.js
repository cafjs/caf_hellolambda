var AppDispatcher = require('../dispatcher/AppDispatcher');
var AppConstants = require('../constants/AppConstants');
var AppSession = require('../session/AppSession');
var json_rpc = require('caf_transport').json_rpc;
var caf_cli =  require('caf_cli');

var updateF = function(state) {
    var d = {
        actionType: AppConstants.APP_UPDATE,
        state: state
    };
    AppDispatcher.dispatch(d);
};


var errorF =  function(err) {
    var d = {
        actionType: AppConstants.APP_ERROR,
        error: err
    };
    AppDispatcher.dispatch(d);
};

var getNotifData = function(msg) {
    return json_rpc.getMethodArgs(msg)[0];
};

var notifyF = function(message) {
    var d = {
        actionType: AppConstants.APP_NOTIFICATION,
        state: getNotifData(message)
    };
    AppDispatcher.dispatch(d);
};

var wsStatusF =  function(isClosed) {
    var d = {
        actionType: AppConstants.WS_STATUS,
        isClosed: isClosed
    };
    AppDispatcher.dispatch(d);
};

var AppActions = {
    initServer: function(initialData) {
        updateF(initialData);
    },
    init: function(cb) {
        AppSession.hello(AppSession.getCacheKey(),
                         caf_cli.extractTokenFromURL(window.location.href),
                         function(err, data) {
                             if (err) {
                                 errorF(err);
                             } else {
                                 updateF(data);
                             }
                             cb(err, data);
                         });
    },
    setLocalState: function(data) {
        updateF(data);
    },
    resetError: function() {
        errorF(null);
    },
    setError: function(err) {
        errorF(err);
    }
};

['changePinMode', 'changePinValue', 'deletePin','getState','setSecret']
    .forEach(function(x) {
        AppActions[x] = function() {
            var args = Array.prototype.slice.call(arguments);
            args.push(function(err, data) {
                if (err) {
                    errorF(err);
                } else {
                    updateF(data);
                }
            });
            AppSession[x].apply(AppSession, args);
        };
    });


AppSession.onmessage = function(msg) {
    console.log('message:' + JSON.stringify(msg));
    AppActions.getState();
    //notifyF(msg);
};

AppSession.onclose = function(err) {
    console.log('Closing:' + JSON.stringify(err));
    wsStatusF(true);
};


module.exports = AppActions;
