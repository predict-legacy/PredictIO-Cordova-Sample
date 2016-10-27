/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var fs    = require('fs');     // nodejs.org/api/fs.html
var plist = require('plist');  // www.npmjs.com/package/plist

var FILEPATH = 'platforms/ios/ExampleCordova/ExampleCordova-Info.plist';

module.exports = function (context) {
    var xml = fs.readFileSync(FILEPATH, 'utf8');
    var jsonObj = plist.parse(xml);
    var jsonString = JSON.stringify(jsonObj);
    jsonObj = JSON.parse(jsonString.replace(/null/g, "\"\""));
    jsonObj.CFBundleDisplayName = 'PredictIO Cordova';
    jsonObj.CFBundleVersion = '2016.09.28.01';
    jsonObj.NSLocationAlwaysUsageDescription = 'Data stays secure on your phone. GPS will help you find parking. Vacancy will be posted anonymously.';
    jsonObj.UIBackgroundModes = ['location', 'remote-notification'];
    jsonObj.NSMotionUsageDescription = 'Data stays secure on your phone. Motion activity help us to detect arrivals and departures. Data will be posted anonymously.';
    xml = plist.build(jsonObj);
    fs.writeFileSync(FILEPATH, xml, { encoding: 'utf8' });
};
