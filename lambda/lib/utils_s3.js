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
var AWS = require('aws-sdk');

var s3 = new AWS.S3();

var getMany = exports.getMany = function(bucket, all, cb0) {
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
                result[key] = res[i].Body.toString().trim();
            });
            console.log(JSON.stringify(result));
            cb0(err, result);
        }
    });
};

var putMany = exports.putMany = function(bucket, all, cb0) {
    var keys = Object.keys(all);
    async.map(keys, function(key, cb1) {
        s3.putObject({
            Bucket: bucket,
            Key: key,
            Body : all[key]
        }, cb1);
    }, cb0);
};


var deleteMany = exports.deleteMany = function(bucket, all, cb0) {
    var keys = Object.keys(all);
    async.map(keys, function(key, cb1) {
        s3.deleteObject({
            Bucket: bucket,
            Key: key
        }, cb1);
    }, cb0);

};

var comboMany = exports.comboMany = function(bucket, all, cb0) {
    var keys = Object.keys(all);
    async.map(keys, function(key, cb1) {
        if (key === 'delete') {
            deleteMany(bucket, all[key], cb1);
        } else if (key === 'put') {
            putMany(bucket, all[key], cb1);
        } else if (key === 'get') {
            getMany(bucket, all[key], cb1);
        } else {
            console.log('Ignoring key ' + key);
            cb1(null);
        }
    },  function(err, res) {
        if (err) {
            cb0(err);
        } else {
            var result = {};
            keys.forEach(function(key, i) {
                result[key] = res[i];
            });
            cb0(err, result);
        }
    });
};

var listAll = exports.listAll = function(bucket, cb0) {
    s3.listObjects({
        Bucket: bucket
    }, cb0);    
};
