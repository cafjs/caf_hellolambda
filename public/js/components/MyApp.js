var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppStore = require('../stores/AppStore');
var AppActions = require('../actions/AppActions');
var Pins = require('./Pins');
var ShowURL = require('./ShowURL');
var AppStatus = require('./AppStatus');
var DisplayError = require('./DisplayError');

var MyApp = {
    getInitialState: function() {
        return AppStore.getState();
    },
    componentDidMount: function() {
        AppStore.addChangeListener(this._onChange);
    },
    componentWillUnmount: function() {
        AppStore.removeChangeListener(this._onChange);
    },
    _onChange : function(ev) {
        this.setState(AppStore.getState());
    },
    doDisplayURL : function() {
        AppActions.setLocalState({
            deviceURL : window.location.href
        });
    },
    render: function() {
        return cE("div", {className: "container-fluid"},
                  cE(DisplayError, {
                      error: this.state.error
                  }),
                  cE(ShowURL, {
                      deviceURL: this.state.deviceURL
                  }),                  
                  cE(rB.Panel, {
                      header: cE(rB.Grid, null,
                                 cE(rB.Row, null,
                                    cE(rB.Col, {sm:1, xs:1},
                                       cE(AppStatus, {
                                           isClosed: this.state.isClosed
                                       })
                                      ),
                                    cE(rB.Col, {
                                        sm: 5,
                                        xs:10,
                                        className: 'text-right'
                                    }, "Lambda Example"),
                                    cE(rB.Col, {
                                        sm: 5,
                                        xs:11,
                                        className: 'text-right'
                                    }, this.state.fullName)
                                   )
                                )
                  },
                     cE(rB.Panel, {header: "Display caURL file"},
                        cE(rB.Grid, null,
                           cE(rB.Row, null,
                              cE(rB.Col, {xs:12, sm:6},
                                 cE(rB.Button, {
                                     onClick: this.doDisplayURL,
                                     bsStyle: 'primary'
                                 },
                                    'Show')
                                )
                             )
                          )
                       ),
                     cE(rB.Panel, {header: "Pins"},
                        cE(Pins, {
                            pinNumber: this.state.pinNumber,
                            pinMode: this.state.pinMode,
                            pinOutputsValue: this.state.pinOutputsValue,
                            pinInputsValue: this.state.pinInputsValue
                        })
                       )
                    )
                 );
    }
};

module.exports = React.createClass(MyApp);
