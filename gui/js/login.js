const JsonDB = require('node-json-db');
const request = require('request');
const {ipcRenderer} = require('electron')

// JSON DBs
var dbAuth = new JsonDB("./user-settings/auth", true, false);

// Beam OAuth
// Takes info recieved from main process and processes it to save oauth info and such.
ipcRenderer.on('oauth-complete', function (event, token){
    requestBeamData(token);
})

// Beam User Info
// After OAuth is successful, this will grab info and save it. Then kick off putting info on the page.
function requestBeamData(token) {
    request({
        url: 'https://beam.pro/api/v1/users/current',
        auth: {
            'bearer': token
        }
    }, function(err, res) {
        if(err){
            console.error('Error: ',err)
        } else {
            var data = JSON.parse(res.body);

            //Load up avatar and such on login page. 
            login(data.channel.id, data.channel.userId, data.username, token, data.avatarUrl);
        }
    });
};

// Log in
// This takes the saved login info and puts things onto the login page such as the user avatar.
function login(channelID, userID, username, token, avatar){
    dbAuth.push('/streamer', { "channelID": channelID, "userID": userID, "username": username, "token": token, "avatarUrl": avatar });

    $('.streamer .username h2').text(username);
    $('.streamer .avatar img').attr('src', avatar);
    $('.streamer .loginOrOut button').text('Logout').attr('status', 'logout');
}

// Log out
// This sets everything back to default and deletes relevant user info.
function logout(){
    var defaultAvatar = "./images/placeholders/default.jpg";

    dbAuth.delete('/streamer');

    $('.streamer .username h2').text('Streamer');
    $('.streamer .avatar img').attr('src', defaultAvatar);
    $('.streamer .loginOrOut button').text('Login').attr('status', 'login');
}

// Initial Load
// Checks to see if there is any login info saved, and if so then load up related ui elements.
function initialLogin(){
    try {
        var streamer = dbAuth.getData("/streamer");
        var username = streamer.username;
        var avatar = streamer.avatarUrl;
        $('.streamer .username h2').text(username);
        $('.streamer .avatar img').attr('src', avatar);
        $('.streamer .loginOrOut button').text('Logout').attr('status', 'logout');
    } catch(error) {
        
    }
}

// Login or out button pressed
// This checks if button is logging in or out a person or bot. If logging in then it sends message to main process.
$( ".streamer-login" ).click(function() {
    var status = $(this).attr('status');

    if(status == "login"){
        ipcRenderer.send('oauth-login');
    } else if (status == "logout"){
        logout();
    }
});


// Run on App Load
initialLogin();