var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');

var ShowURL = {

    doDismiss: function(ev) {
        AppActions.setLocalState({
            deviceURL : null
        });
    },

    render: function() {
        return cE(rB.Modal,{show: this.props.deviceURL,
                            onHide: this.doDismiss,
                            animation: false},
                  cE(rB.Modal.Header, {
                      className : "bg-primary text-primary",
                      closeButton: true},
                     cE(rB.Modal.Title, null, "Device URL")
                    ),
                  cE(rB.ModalBody, null,
                     cE('p', null, "Cut/paste to file 'caURL'" +
                        " in your S3 bucket"
                       ),
                     cE(rB.Input, {
                         type:"textarea",
                         label: "caURL",
                         value:  this.props.deviceURL
                     })
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.Button, {onClick: this.doDismiss}, "Continue")
                    )
                 );
    }
};

module.exports = React.createClass(ShowURL);
