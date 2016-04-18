Parse.Cloud.define('oneSignalPush', function(request, response) {
    var promise = new Parse.Promise();
    var params = request.params;
  
    var custom = params.custom;//JSON string of push
    var users = params.attenders;//ids of relevant users
    console.log("#### Push Data " + custom);
    
    var jsonObject= JSON.parse(custom);
    var alert = jsonObject.alert;
    var session_alert = jsonObject.session_alert;
    var push_title = jsonObject.push_title;
    var push_type = jsonObject.push_type;
    var message_object_id = jsonObject.message_object_id;
    var push_notification_id = jsonObject.push_notification_id;
    var push_object_id = jsonObject.push_object_id;
    console.log("#### Push Type " + push_type);
  
    var pushTagKey = "session_changed_push";//Default
    var pushTagRelation = "=";//Default
    var pushTagValue = "true";//Default
    switch (push_type) {
        case 0:
            pushTagKey = "session_changed_push";
            console.log("#### session_changed_push");
            break;
        case 1:
            pushTagKey = "user_followed_push";
            console.log("#### user_followed_push");
            break;
        case 2:
            pushTagKey = "session_attender_push";
            console.log("#### session_attender_push");
            break;
        case 3:
            pushTagKey = "new_follower_push";
            console.log("#### new_follower_push");
            break;
        case 4:
            //NOTHING TO FILTER
            console.log("#### session_deleted_push");
            break;
        case 5:
            pushTagKey = "session_message_push";
            console.log("#### session_message_push");
            break;
        default:
            pushTagKey = "session_changed_push";
            console.log("#### session_changed_push");
            break;
    }
    
    var jsonBody = { 
      app_id: process.env.ONE_SIGNAL_APP_ID, 
      included_segments: ["All"],
      contents: {
        en: alert,
      },
      headings: {
        en: push_title,
      },
      data: {
        custom: custom,
      },
      tags: [{"key": pushTagKey, "relation": pushTagRelation, "value": pushTagValue}]
    };
    
    // var jsonBody = { 
    //   app_id: process.env.ONE_SIGNAL_APP_ID, 
    //   included_segments: ["All"],
    //   contents: {en: "English Message"},
    //   include_player_ids: users,
    //   tags: pushTags,
    //   data: {
    //     "title": push_title,
    //     "message": alert,
    //     "custom": custom,
    //   }
    // };
    
    Parse.Cloud.httpRequest({
      method: "POST",
      url: "https://onesignal.com/api/v1/notifications",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Authorization": "Basic "+ process.env.ONE_SIGNAL_REST_API_KEY
      },
      body: JSON.stringify(jsonBody)
    }).then(function (httpResponse) {
      promise.resolve(httpResponse)
    },
    function (httpResponse) {
      promise.reject(httpResponse);
    });
  
    return promise;
});

Parse.Cloud.define('pushChannelMedidate', function(request, response) {

  // request has 2 parameters: params passed by the client and the authorized user
  var params = request.params;
  var user = request.user;

  var custom = params.custom;//JSON string of push
  var users = params.attenders;//ids of relevant users
  console.log("#### Push Data " + custom);
  
  //Parsing Json for iOS Platforms
  var jsonObject= JSON.parse(custom);
  var alert = jsonObject.alert;
  var session_alert = jsonObject.session_alert;
  var push_title = jsonObject.push_title;
  var push_type = jsonObject.push_type;
  var message_object_id = jsonObject.message_object_id;
  var push_notification_id = jsonObject.push_notification_id;
  var push_object_id = jsonObject.push_object_id;
  
  console.log("#### Push Type " + push_type);

  //Filter only users with thier ids in it
  var userQuery = new Parse.Query(Parse.User);
  userQuery.containedIn("objectId", users);
  for (var i = 0; i < users.length; i++) {
    console.log("#### User Id Before Filtering " + users[i]);
  }

  var pushQuery = new Parse.Query(Parse.Installation);
  switch (push_type) {
      case 0:
          pushQuery.equalTo("session_changed_push", true);
          console.log("#### session_changed_push");
          break;
      case 1:
          pushQuery.equalTo("user_followed_push", true);
          console.log("#### user_followed_push");
          break;
      case 2:
          pushQuery.equalTo("session_attender_push", true);
          console.log("#### session_attender_push");
          break;
      case 3:
          pushQuery.equalTo("new_follower_push", true);
          console.log("#### new_follower_push");
          break;
      case 4:
          //NOTHING TO FILTER
          console.log("#### session_deleted_push");
          break;
      case 5:
          pushQuery.equalTo("session_message_push", true);
          console.log("#### session_message_push");
          break;
      default:
          pushQuery.equalTo("session_changed_push", true);
          console.log("#### session_changed_push");
          break;
  }
  pushQuery.matchesQuery('user', userQuery);
  // pushQuery.containedIn('user', userQuery);

  // Note that useMasterKey is necessary for Push notifications to succeed.
  Parse.Push.send({
      where: pushQuery, 
      data: {
        alert: alert,
        session_alert: session_alert,
        push_title: push_title,
        push_type: push_type,
        headings: {
            en: push_title,
        },
        message_object_id: message_object_id,
        push_notification_id: push_notification_id,
        push_object_id: push_object_id,
        custom: custom
      }
  }, { success: function() {
    console.log("#### PUSH OK");
  }, error: function(error) {
    console.log("#### PUSH ERROR" + error.message);
  }, useMasterKey: true});

  response.success('success');
});

Parse.Cloud.define('saveAndroidUserDeviceToken', function(request, response) {
  Parse.Cloud.useMasterKey();
  var params = request.params;
  var user = request.user;
  var token = params.token;//GCM TOKEN
  var installation = params.installation;//ids of relevant users
  console.log("#### Installation Id To Save Token " + installation[0]);
  console.log("#### User GCM Token " + token);

  var installationQuery = new Parse.Query(Parse.Installation);
  installationQuery.equalTo('objectId', installation[0]);
  installationQuery.find({
    success: function(installations) {
        console.log("#### Successfully retrieved Installation" + installations.length);
        var userInstallation = installations[0];
        userInstallation.set("deviceToken", token);
        userInstallation.save(null, {
            success: function (listing) {
                console.log("#### Saved Token");
                response.success('success');
            },
            error: function (error) {
                console.log("#### Did Not Save Token...");
                response.error(error);
            }
        });
    },
    error: function(error) {
        console.log("#### Error: " + error.code + " " + error.message);
        response.error(error);
    }
  });
});

//NEW CODE FOR RE-OCCURRENCE
Parse.Cloud.define('updateRecurringSessions', function(request, response) {
  console.log("#### updateRecurringSessions");
  var excludeMinusOccurences = [0, -1, -2, -3];
  var then = new Date();
  then.setHours(then.getHours() - 1);
  
  var pushQuery = new Parse.Query("MSession");
  pushQuery.lessThanOrEqualTo("date", then);
  pushQuery.notContainedIn("occurrence",excludeMinusOccurences);
  pushQuery.find({
    success: function(results) {
    console.log("#### Sessions to Reoccurre " + results.length);
    if(results.length > 0){
          for (var i = 0 ; i < results.length ; i++) {
            var continueScanning = false;
            var newSession = results[i].clone();//This one is going to be saved into MSessions with new occurrence values
            newSession.set("attenders_count", 0);
            var date =  new Date(newSession.get("date").getTime());
               switch (newSession.get("occurrence")){
                   case 1: 
                      do {
                        //  date.setHours(then.getHours() + 24);
                         date.setDate(date.getDate() + 1);
                      } while (date <= then);
                   break;
                
                   case 2: 
                      do {
                        //  date.setHours(then.getHours() + 7 * 24);
                          date.setDate(date.getDate() + 7);
                      } while (date <= then);
                   break;
                
                   case 3: 
                        //  date.setHours(then.getHours() + 4 * 7 * 24);
                         date.addMonths(1);
                   break;
                   default:  ;
                }
                newSession.set("date", date);
                newSession.set("day", date.getDay() + 1);

                //Start copying old session with everything (including attenders!)
                var oldSession = results[i];//This is going to be deleted at the end
                oldSession.set("occurrence", -1 * results[i].get("occurrence"));
                var HistorySession = Parse.Object.extend("HistorySession");
                var copiedSession = new HistorySession();//This is the actual oldSession, but go inside "HistorySession"
                var keySet = Object.keys(oldSession.toJSON());
                console.log("#### Obtained Old Session Keys " + keySet.length);
                
                for (var j=0 ; j<keySet.length ; j++) {
                    //------------------RELATIONS CAN'T BE COPIED!!!-------------------------
                    if (keySet[j] != "attenders" && keySet[j] != "messages" && keySet[j] != "objectId" 
                        && keySet[j] != "createdAt" && keySet[j] != "updatedAt") {
                        console.log("#### Session Key to Copy " + keySet[j]);
                        copiedSession.set(keySet[j], oldSession.get(keySet[j]));
                    }
                }

                //Duplicate attenders into new session that reoccurred
                var attenders = oldSession.relation("attenders");
                var attendersQuery = attenders.query();
                attendersQuery.find({
                    success: function(attendersRelation) {
                        console.log("#### Copy Attenders From Old Session " + attendersRelation.length);
                        var newAttenders = copiedSession.relation("attenders");
                        for(var k=0 ; k<attendersRelation.length ; k++){
                            newAttenders.push(attendersRelation[k]);
                        }
                        
                        //Save copiedSession into HistorySession with his attenders
                        copiedSession.save(null, {
                            success: function(copiedSession) {
                                console.log("#### Saved copiedSession with his attenders");
                                newSession.save(null, {
                                    success: function(newSession) {
                                        console.log("#### Saved newSession with his new date, time and occurrence");
                                        response.success('Saved newSession with his new date, time and occurrence');
                                        oldSession.destroy({
                                                        success:function() {
                                                             continueScanning = true;
                                                             response.success('oldSession deleted...');
                                                        },
                                                        error:function(error) {
                                                             continueScanning = true;
                                                             response.error('Could not delete object.');
                                                        }
                                                   });
                                  },
                                  error: function(newSession, error) {
                                                             continueScanning = true;
                                    response.error('ERROR: Did not save newSession...');
                                  },
                                });
                                response.success('Saved copiedSession with everything..');
                          },
                          error: function(error) {
                            continueScanning = true;
                            response.error('ERROR: Did not save copiedSession...');
                          },
                        });
                    },
                    error: function() {
                        continueScanning = true;
                        response.error("attenders from relation lookup failed");
                    }
                });
                while(continueScanning == false){
                    
                }
          }
        }
      response.success('Found Recurring Sessions' + results.length);
    },
    error: function() {
      response.error('Wasnt able to find Recurring Sessions');
    }
  });
//   response.success('Saved Reoccurred Sessions');
  
    Date.isLeapYear = function (year) { 
        return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
    };
    
    Date.getDaysInMonth = function (year, month) {
        return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    };
    
    Date.prototype.isLeapYear = function () { 
        return Date.isLeapYear(this.getFullYear()); 
    };
    
    Date.prototype.getDaysInMonth = function () { 
        return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
    };
    
    Date.prototype.addMonths = function (value) {
        var n = this.getDate();
        this.setDate(1);
        this.setMonth(this.getMonth() + value);
        this.setDate(Math.min(n, this.getDaysInMonth()));
        return this;
    };
    
});
