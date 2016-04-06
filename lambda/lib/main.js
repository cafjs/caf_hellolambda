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

var AWS = require('aws-sdk');
var caf_comp = require('caf_components');
var async = caf_comp.async;
var myUtils = caf_comp.myUtils;
var caf_cli = require('caf_cli');

var s3 = new AWS.S3();

var SECRET_KEY = 'secret';

var getMany = function(bucket, all) {
    return function(cb0) {
        var keys = Object.keys(all);
        async.map(keys, function(key, cb1) {
            s3.getObject({
                Bucket: bucket,
                Key: key
            }, cb1);
        }, function(err, res) {
            if (err) {
                cb0(err);
            } else {
                var result = {};
                keys.forEach(function(key, i) {
                    result[key] = res[i].toString();
                });
                cb0(err, result);
            }
        });
    };
};

exports.handler = function(event, context) {

    var bucket =  event.Records[0].s3.bucket.name;
    var key =  decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    var allKeys = {secret: true, caURL : true };
    allKeys[key] = true;
    
    async.waterfall([        

        getMany(bucket, allKeys),
        
        function (all, cb0) {
            var cbOnce0 = myUtils.callJustOnce(function(err) {
                err && console.log('Ignoring >1 calls ' + myUtils.errToPrettyStr(err));
            }, cb0);
            
            var cli = new caf_cli.Session(all.caURL, {
                disableBackchannel : true
            });
            
            cli.onopen = function() {
                cli.handleLambda(all.secret, key, all[key], function(err, res) {
                    cli.onclose = function(error) {
                        if (err || error) {
                            cbOnce0(err || error);
                        } else {
                            cbOnce0(null, res);
                        }
                    };
                    cli.close();
                });
            };

            cli.onerror = function(err) {
                cbOnce0(err);
            };
        }
    ], function(err, res) {
        context.done(err, res);
    });
};
