 /*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var sdkEvent = {
    DEPARTING : 0,
    DEPARTED : 1,
    CANCELEDDEPARTURE : 2,
    STMPCALLBACK : 3,
    SUSPECTEDARRIVAL : 4,
    ARRIVED : 5,
    SEARCHING : 6,
    STMP_CAR : 7,
    STMP_NONCAR : 8,
    STMP_UNDETERMINED : 9,
    STMP_BICYCLE : 10,
    STATIONARY_AFTER_ARRIVAL_TRUE : 11,
    STATIONARY_AFTER_ARRIVAL_FALSE : 12,
    TRAVELED_BY_ARIPLANE : 13
};

var trackerState = {
    STARTED : "Started",
    STOPPED : "Stopped"
};

var stmpMode = {
    CAR : "Car",
    NONCAR : "NonCar",
    UNDETERMINED : "Undetermined",
    BICYCLE : "Bicycle"
}

var trackerStateKey = "TrackerState";

var db = null;
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    onDeviceReady: function() {
        if (localStorage.getItem(trackerStateKey) === trackerState.STARTED) {
            startPredictIOTracker();
        }
        db = window.sqlitePlugin.openDatabase({name: 'PredictIODemo.db', location: 'default'});
        db.transaction(function(tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS Event (eventId integer primary key autoincrement,latitude double, longitude double, timeStamp real, type integer)');
        }, function(error) {
        }, function() {
            app.reloadTableView();
        });
		// Register back press event listener
        document.addEventListener("backbutton", onBackKeyDown, false);
        setupPushNotifications();
    },
    insertRow : function(latitude, longitude, timeStamp, type) {
        db.transaction(function(tx) {
            tx.executeSql('INSERT INTO Event VALUES (?,?,?,?,?)', [null, latitude, longitude, timeStamp, type]);
        }, function(error) {
        }, function() {
            db.transaction(function(tx) {
                tx.executeSql('SELECT * FROM Event ORDER BY eventId DESC',
                [], function(tx, rs) {
                    app.insertRowItemAtTopOfTableView(rs.rows.item(0));
                }, function(tx, error) {
                    
                });
            });
        });
    },
    reloadTableView : function() {
        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM Event ORDER BY eventId DESC',
            [], function(tx, rs) {
                if (rs !== null && rs.rows !== null && rs.rows.length > 0) {
                    for(var counter = 0; counter < rs.rows.length; counter++) {
                        app.appendRowItemToTableView(rs.rows.item(counter));
                    }
                }
            }, function(tx, error) {
            });
        });
    },
    appendRowItemToTableView : function(rowItem) {
        var ul = document.querySelector(".table-view");
        var li = app.makeTableViewRow(rowItem);
        ul.appendChild(li);
    },
    insertRowItemAtTopOfTableView : function(rowItem) {
        var ul = document.querySelector(".table-view");
        var li = app.makeTableViewRow(rowItem);
        ul.insertBefore(li, ul.childNodes[0]);
    },
    makeTableViewRow : function(rowItem) {
        var li = document.createElement("li");
        var a  = document.createElement("a");
        var span = document.createElement("span");
        span.setAttribute("class", "badge");
        a.setAttribute("class", "navigate-right");
        var callbackFuncWithParams = "slideOnTap(1," + rowItem.eventId + ")";
        a.setAttribute("onclick", callbackFuncWithParams);
        li.setAttribute("class", "table-view-cell media");
        li.setAttribute("id", "" + rowItem.eventId);
        var date = new Date(rowItem.timeStamp);
        span.appendChild(document.createTextNode(moment(date).format('MMM Do YYYY, H:mm')));
        a.appendChild(span);
        a.appendChild(document.createTextNode(app.sdkEventTypeToString(rowItem.type)));
        li.appendChild(a);
        return li;
    },
    sdkEventTypeToString : function(type) {
        var sdkEventArray = ['Departing', 'Departed', 'Canceled Departure', 
            'STMP Callback', 'Arrival Suspected', 'Arrived', 'Searching', 'STMP-Car',
            'STMP-NonCar', 'STMP-Undetermined', 'STMP-Bicycle', 'Stationary-True',
            'Stationary-False', 'Traveled By Airplane'];
        return sdkEventArray[type];
    }
};

app.initialize();

function toggleTracker() {
    var state = localStorage.getItem(trackerStateKey);
    if (state === null || state === trackerState.STOPPED) {
        startPredictIOTracker();
    } else {
        stopPredictIOTracker();
    }
}

function startPredictIOTracker() {
    localStorage.setItem(trackerStateKey, trackerState.STARTED);
    document.getElementById('start-stop-btn').innerHTML = 'Stop';
    cordova.exec(function successCallback() { },
                function errorCallback(error) { 
                    stopPredictIOTracker();
                    alert(error);
                },
                'PredictIOPlugin',
                'start',
                ['80e3b81e78800087da979fd7724297a7fa75e42a466ab4a9ca1805d155d21b53']);
}

function stopPredictIOTracker() {
    localStorage.setItem(trackerStateKey, trackerState.STOPPED);
    document.getElementById('start-stop-btn').innerHTML = 'Start';
    cordova.exec(function successCallback() { }, function errorCallback() { },
                'PredictIOPlugin',
                'stop',
                []);
}

// PredictIO callbacks

function departing(departingParam) { 
    var param = JSON.parse(departingParam);
    app.insertRow(param.departureLatitude, param.departureLongitude, new Date().getTime(), sdkEvent.DEPARTING);
}

function departed(departedParam) {
    var param = JSON.parse(departedParam);
    app.insertRow(param.departureLatitude, param.departureLongitude, new Date().getTime(), sdkEvent.DEPARTED);
}

function canceledDeparture(canceledDepartureParam) {
    var param = JSON.parse(canceledDepartureParam);
    app.insertRow(param.departureLatitude, param.departureLongitude, new Date().getTime(), sdkEvent.CANCELEDDEPARTURE);
}

function detectedTransportationMode(transportationModeParam) { 
    var param = JSON.parse(transportationModeParam);
    var type = sdkEventForTransportationMode(param);
    app.insertRow(0.0, 0.0, new Date().getTime(), type);
}

function suspectedArrival(suspectedArrivalParam) { 
    var param = JSON.parse(suspectedArrivalParam);
    app.insertRow(param.arrivalLatitude, param.arrivalLongitude, new Date().getTime(), sdkEvent.SUSPECTEDARRIVAL);
}

function arrived(arrivedParam) { 
    var param = JSON.parse(arrivedParam);
    app.insertRow(param.arrivalLatitude, param.arrivalLongitude, new Date().getTime(), sdkEvent.ARRIVED);
}

function searchingInPerimeter(searchingInPerimeterParam) { 
    var param = JSON.parse(searchingInPerimeterParam);
    app.insertRow(param.latitude, param.longitude, new Date().getTime(), sdkEvent.SEARCHING);
}

function beingStationaryAfterArrival(stationaryParam) {
    var param = JSON.parse(stationaryParam);
    var type = sdkEventForStationaryAfterArrival(param);
    app.insertRow(param.arrivalLatitude, param.arrivalLongitude, new Date().getTime(), type);
}

function traveledByAirplane(traveledByAirplaneParam) {
    var param = JSON.parse(traveledByAirplaneParam);
    app.insertRow(param.departureLatitude, param.departureLongitude, new Date().getTime(), sdkEvent.TRAVELED_BY_ARIPLANE);
}

function sdkEventForTransportationMode(param) {
    var type = sdkEvent.STMP_UNDETERMINED;
    if (param.transportationMode === stmpMode.CAR) {
        type = sdkEvent.STMP_CAR;
    } else if (param.transportationMode === stmpMode.NONCAR) {
        type = sdkEvent.STMP_NONCAR;
    } else if (param.transportationMode === stmpMode.BICYCLE) {
        type = sdkEvent.STMP_BICYCLE;
    }
    return type;
}

function sdkEventForStationaryAfterArrival(param) {
    var type = sdkEvent.STATIONARY_AFTER_ARRIVAL_FALSE;
    if (param.stationaryAfterArrival) {
        type = sdkEvent.STATIONARY_AFTER_ARRIVAL_TRUE;
    }
    return type;
}

// Manipulating Ratchet Sliders

function slideOnTapToPage(index) {
    // Get slide width
    var slide = document.querySelector('.slide');
    var offset = index * slide.offsetWidth;

    // Move slide
    var slider = document.querySelector('.slide-group');
    slider.style['-webkit-transition-duration'] = '.2s';
    slider.style.webkitTransform = 'translate3d(-' + offset + 'px,0,0)';
}

function updateStyleHeightOfSlider(index) {
    var mainSlider = document.querySelector(".slider");
    var sliderGroup = document.querySelector('.slide-group');
    if (index === 0) {
        mainSlider.style['height'] = 'auto';
        sliderGroup.style['height'] = 'auto';
    } else {
        mainSlider.style['height'] = '100%';
        sliderGroup.style['height'] = '100%';
    }
}

function slideOnTap(index,eventId) {
    var backBtn = document.getElementById("back-btn");
    slideOnTapToPage(index);
    updateStyleHeightOfSlider(index);
    if (index === 0) {
        backBtn.style.display = "none";
        scrollToTableRow(lastSelectedRow);
    } else {
        backBtn.style.display = "block";
        showMap(eventId);
        lastSelectedRow = eventId;
    }
}

var lastSelectedRow = 0;
function scrollToTableRow(liID) {
    var tableView = document.querySelector(".content");
    var tableViewRow = document.getElementById("" + liID);
    tableView.scrollTop = tableViewRow.offsetTop;
}

// Show google maps

var map;
function showMap(eventId) {
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM Event WHERE eventId=?',
        [eventId], function(tx, rs) {
            var latitude = rs.rows.item(0).latitude;
            var longitude = rs.rows.item(0).longitude;
            var centerLocation = {lat: latitude, lng: longitude};
            map = new google.maps.Map(document.getElementById('map'), {
                center: centerLocation, zoom: 16});
            google.maps.event.addListenerOnce(map, 'idle', function() {
                google.maps.event.trigger(map, 'resize');
                map.setCenter(centerLocation);
                new google.maps.Marker({position: centerLocation, map: map}); 
            });
        }, function(tx, error) {
        });
    });
}
// Handle the back button
function onBackKeyDown() {
    cordova.exec(function successCallback() { },
                    function errorCallback(error) { },
                    'PredictIOPlugin',
                    'minimize',
                    []);
}

//Remote Notifications
function setupPushNotifications() {
    window.FirebasePlugin.grantPermission();
    window.FirebasePlugin.onTokenRefresh(function(token) {
        // save this server-side and use it to push notifications to this device
        setPushNotificationToken(token);
        setPushNotificationWebhookUrl();
    }, function(error) {
        console.error(error);
    });
    window.FirebasePlugin.onNotificationOpen(function(notification) {
        alert(JSON.stringify(notification));
    }, function(error) {
        console.error(error);
    });
}

function setPushNotificationToken(token) {
    cordova.exec(function successCallback() { },
                function errorCallback(error) { },
                'PredictIOPlugin',
                'setCustomParameter',
                ['device_token', token]);
}

function setPushNotificationWebhookUrl() {
    cordova.exec(function successCallback() { },
                function errorCallback(error) { },
                'PredictIOPlugin',
                'setWebhookURL',
                ['https://api.parktag.mobi/demo/notifications/send_notification']);
}
