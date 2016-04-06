var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');

var Secret = {
    handleSecret: function() {
        AppActions.setLocalState({
            secret: this.refs.secret.getValue()
        });
    },
    
    doSecret: function() {
        var secret = this.refs.secret.getValue();
        if (typeof secret === 'string') {
            AppActions.setSecret(secret);
        } else {
            AppActions.setError(new Error('Invalid secret:' +
                                          this.refs.secret.getValue())); 
        }
    },

    updateSecret : function(ev) {
        if (ev.key === 'Enter') {
            this.handleSecret();
            this.doSecret();
        }
    },

    render: function() {
        return cE(rB.Grid, null,
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:4, xs:4},
                        cE(rB.Input, {
                            type: 'password',
                            ref: 'secret',
                            value: this.props.secret,
                            onChange: this.handleSecret,
                            onKeyDown: this.updateSecret,
                            placeholder: 'Device Secret'
                        })
                       ),
                     cE(rB.Col, {sm:8, xs:9},
                        cE(rB.Button, {onClick: this.doSecret},'Submit')
                       )
                    )
                 );
    }
};


module.exports = React.createClass(Secret);
