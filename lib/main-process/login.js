const {ipcMain} = require('electron')
const {BrowserWindow} = require('electron')

// Login Button Pressed
// This works in conjunction with the render login.js file and acts when a login button has been pressed.
// It grabs the auth token and then sends it back to the render process login.js.
ipcMain.on('oauth-login', function(event) {
    var options = {
        client_id: '26d4958aedc51787530ae4228b0f21a155e40350125061ac',
        scopes: ["chat:bypass_links","chat:bypass_slowchat","chat:change_ban","chat:change_role","chat:chat","chat:clear_messages","chat:connect","chat:purge","chat:remove_message","chat:timeout","chat:view_deleted","chat:whisper"] // Scopes limit access for OAuth tokens.
    };

    var authWindow = new BrowserWindow({
        width: 400,
        height: 900,
        resizable: true,
        alwaysOnTop: true,
        show: true,
        webPreferences: {
            nodeIntegration: false,
            partition: 'persist:interactive'
        }
    });

    // Reset the authWindow on close
    authWindow.on('close', function() {
        authWindow = null;
    }, false);

    var url = "https://beam.pro/oauth/authorize?";
    var authUrl = url + "client_id=" + options.client_id + "&scope=" + options.scopes.join(' ') + "&redirect_uri=http://localhost/callback" + "&response_type=token";
    authWindow.loadURL(encodeURI(authUrl));
    authWindow.show();

    function handleCallback(url) {
        var raw_token = /token=([^&]*)/.exec(url) || null;
        var token = (raw_token && raw_token.length > 1) ? raw_token[1] : null;
        var error = /\?error=(.+)$/.exec(url);

        if (token) {
            // Send token back to render process.
            event.sender.send('oauth-complete', token);
        }
        if (error) {
            authWindow.close();
        }
        authWindow.close();
    }

    authWindow.webContents.on('will-navigate', function(event, url) {
        handleCallback(url);
    });

    authWindow.webContents.on('did-get-redirect-request', function(event, oldUrl, newUrl) {
        handleCallback(newUrl);
    });

});