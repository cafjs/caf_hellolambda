/*!
Copyright 2015 Hewlett-Packard Development Company, L.P.

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
var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var caf_cli = require('caf_cli');
var utils_s3 = require('./utils_s3');


exports.handler = function(event, context) {

    var bucket =  event.Records[0].s3.bucket.name;
    var key =  decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    var allKeys = {caURL : true };
    allKeys[key] = true;
    var cli = null;
    var request = null;
    var listAll = null;
    async.waterfall([
        function(cb0) {
            utils_s3.listAll(bucket, cb0);
        },          
        function(list, cb0) {
            listAll = list;
            utils_s3.getMany(bucket, allKeys, cb0);
        },        
        function (all, cb0) {
            var cbOnce0 = myUtils.callJustOnce(function(err) {
                err && console.log('Ignoring >1 calls ' + myUtils.errToPrettyStr(err));
            }, cb0);

            cli = new caf_cli.Session(all.caURL, {
                disableBackchannel : true
            });

            cli.onclose = function(error) {
                cbOnce0(error || (new Error('Unexpected close')));
            };

            cli.onopen = function() {
                cli.handleLambda(listAll, key, all[key], cbOnce0);
            };
        },
        function (req, cb0) {
            request = req;
            utils_s3.comboMany(bucket, req, cb0);
        },
        function(resp, cb0) {
            var cbOnce0 = myUtils.callJustOnce(function(err) {
                err && console.log('Ignoring >1 calls ' + myUtils.errToPrettyStr(err));
            }, cb0);
            
            cli.onclose = function(error) {
                cbOnce0(error || (new Error('Unexpected close')));
            };

            cli.handleLambdaResponse(request, resp, cbOnce0);
        }
    ], function(err, res) {
        cli.onclose = function(error) {
            if (err || error) {
                 console.log(myUtils.errToPrettyStr(err || error));
            }
            context.done(err || error, res);
        };
        cli.close();
    });
};
