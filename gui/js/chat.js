const JsonDB = require('node-json-db');
const request = require('request');
const ReconnectingWebSocket = require('reconnecting-websocket');

// For testing. Change out when finished.
var testuserid = 178871;

// Startup 
// This function grabs all of the user and channel info that could change possibly change.
function startUp(){
    var dbAuth = new JsonDB("./user-settings/auth", true, false);
    var username = dbAuth.getData("/streamer/username");
    var userID = dbAuth.getData("/streamer/userID");

    request({
        url: "https://beam.pro/api/v1/channels/"+username
    }, function(err, res) {
        var data = JSON.parse(res.body);

        // Get Partner Status
        dbAuth.push("/streamer/partnered", data.partnered);

        // Get Sub Badge url
        if(data.partnered === true){
          dbAuth.push("/streamer/chat/subIcon", data.badge.url);
        } else {
          dbAuth.push("/streamer/chat/subIcon", "");
        }        
    });

    request({
        url: "https://beam.pro/api/v1/chats/"+userID
    }, function(err, res) {
        var data = JSON.parse(res.body);

        // Get Partner Status
        dbAuth.push("/streamer/chat/endpoints", data.endpoints);
    });

    // Start up the connection
    // Send over channel ID of chat you want to connect to.
    beamSocketConnect(testuserid);
}

// CHAT
// Connect to Beam Websocket
function beamSocketConnect(channelID){
    var dbAuth = new JsonDB("./user-settings/auth", true, false);
    var endpoints = dbAuth.getData("/streamer/chat/endpoints");
    var subIcon = dbAuth.getData("/streamer/chat/subIcon")

    // Open a websocket connection.
    var randomEndpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
    var ws = new ReconnectingWebSocket(randomEndpoint);
    console.log('Connected to '+randomEndpoint);

    ws.onopen = function(){
      // Web Socket is connected, send data using send()
      var connector = JSON.stringify({type: "method", method: "auth", arguments: [channelID], id: 1});
      ws.send(connector);
      $("<div class='chatmessage' id='status-message'>Connection is open.</div>").appendTo(".chat");
      console.log('Connection Opened...');
    };

    ws.onmessage = function (evt){
      chat(evt, subIcon);
      //console.log(evt);
    };

    ws.onclose = function(){
      // websocket is closed.
      $("<div class='chatmessage' id='status-message'>Connection is closed... reconnecting.</div>").appendTo(".chat");
      console.log("Connection is closed...");
    };
}

// Chat Messages
function chat(evt, subIcon){
    var evtString = $.parseJSON(evt.data);
    var eventType = evtString.event;
    var eventMessage = evtString.data;

    if (eventType == "ChatMessage"){
      var username = eventMessage.user_name;
      var userAvatar = "https://beam.pro/api/v1/users/"+eventMessage.user_id+"/avatar"
      var userrolesSrc = eventMessage.user_roles;
      var userroles = userrolesSrc.toString().replace(/,/g, " ");
      var usermessage = eventMessage.message.message;
      var messageID = eventMessage.id;
      var completeMessage = "";

        $.each(usermessage, function() {
          var type = this.type;

          if (type == "text"){
            var messageTextOrig =  this.data;
            var messageText = messageTextOrig.replace(/([<>&])/g, function (chr) {
                return chr === "<" ? "&lt;" : chr === ">" ? "&gt;" : "&amp;";
            });
            completeMessage += messageText;
          } else if (type == "emoticon"){
            var emoticonSource = this.source;
            var emoticonPack = this.pack;
            var emoticonCoordX = this.coords.x;
            var emoticonCoordY = this.coords.y;
            if (emoticonSource == "builtin"){
              completeMessage += '<div class="emoticon" style="background-image:url(https:\/\/beam.pro/_latest/emoticons/'+emoticonPack+'.png); background-position:-'+emoticonCoordX+'px -'+emoticonCoordY+'px; height:24px; width:24px; display:inline-block;"></div>';
            } else if (emoticonSource == "external"){
              completeMessage += '<div class="emoticon" style="background-image:url('+emoticonPack+'); background-position:-'+emoticonCoordX+'px -'+emoticonCoordY+'px; height:24px; width:24px; display:inline-block;"></div>';
            }       
          } else if (type == "link"){
            var chatLinkOrig = this.text;
            var chatLink = chatLinkOrig.replace(/(<([^>]+)>)/ig, "");
            completeMessage += chatLink;
          } else if (type == "tag"){
            var userTag = this.text;
            completeMessage += userTag;
          }
      });

        // Place the completed chat message into the chat area.
        chatBuilder(username, userAvatar, userroles, subIcon, messageID, completeMessage);

    } else if (eventType == "ClearMessages"){
      // If someone clears chat, then clear all messages on screen.
      $('.chatmessage').remove();
    } else if (eventType == "DeleteMessage"){
      // If someone deletes a message, delete it from screen.
      $('#'+eventMessage.id).remove();
    }
}

// Chat Builder
// This takes parts of a message, puts it together, and throws it in chat.
function chatBuilder(username, userAvatar, userroles, subIcon, messageID, completeMessage){
  var alternator = lastChatter(username);
  var messageTemplate = `<div class="chatmessage ${alternator}" id="${messageID}" style="display:none">
                            <div class="useravatar">
                              <img src="${userAvatar}">
                            </div>
                            <div class="chatusername ${userroles}">
                              ${username}
                            </div>
                            <div class="badge">
                              <img src="${subIcon}">
                            </div>
                            <div class="messagetext">
                              ${completeMessage}
                            </div>
                        </div>`

  $(messageTemplate).appendTo(".chat");
  $('#'+messageID).fadeIn('fast', function() {
    scrollCheck();
  });
}

// Scroller
// This will scroll to the bottom of chat unless the user scrolls up.
function scrollCheck(){
  var isScrolledToBottom = $('.chat')[0].scrollHeight - $('.chat')[0].clientHeight <= $('.chat')[0].scrollTop + 1;

  // scroll to bottom if needed
  if(isScrolledToBottom)
    console.log('scrolling');
    $('.chat')[0].scrollTop = $('.chat')[0].scrollHeight - $('.chat')[0].clientHeight;
}

// Last Chatter
// This checks to see if the last person that sent a message is the same is different than the current message.
function lastChatter(username){
    var dbSettings = new JsonDB("./app-settings/settings", true, false);
    try{
      var lastChatter = dbSettings.getData("/lastchatter");
    }catch(err){
      var lastChatter = "";
    }
    
    if (username !== lastChatter){
      dbSettings.push("/lastchatter", username);
      return "alternateChat";
    } else {
      return "repeatChat";
    }
};


// Start Button Pressed
// This checks if the start button has been pressed. If so, it kicks off the chat connection.
$( ".start-chat" ).click(function() {
    startUp();
});