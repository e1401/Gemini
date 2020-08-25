const { app, BrowserWindow } = require('electron');
var express = require('express');
var express = express();
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:8080/callback'
});

express.listen(8080);


var scopes = ['user-read-private', 'user-read-email', 'user-read-currently-playing', 'user-modify-playback-state'],
  state = '';
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

var win;
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 840,
    webPreferences: {
        nodeIntegration: true,
        devTools: false
    }
  });

  // and load the index.html of the app.
  win.menuBarVisible = false;
  win.loadURL(authorizeURL);
};

var isEnabled = false;
// Callback path after Spotify auth
express.get('/callback', function (req, res) {
  if (isEnabled == false) {
    isEnabled = true;
    var myCode = req.query.code;
    spotifyApi.authorizationCodeGrant(myCode).then(
      function(data) {
        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        win.loadFile('./index.html');
        setInterval(refresh, (data.body['expires_in'] - 10) * 1000);
      },
      function(err) {
        console.log(err);
      }
    );
  }
  else {
    res.send('Session has expired');
  };
});

// Token refresh function
function refresh() {
  spotifyApi.refreshAccessToken().then(
    function(data) {
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    function(err) {
      console.log('Refresh error: ', err);
    }
  );
};
express.get('/currently-playing', function(req, res) {
  spotifyApi.getMyCurrentPlayingTrack().then(
    function(data) {
      res.send(data);
    },
    function(err) {
      console.log(err);
    }
  );
});
express.get('/control', function (req, res) {
  switch (req.query.type) {
    case 'play':
      spotifyApi.play();
      break;
    case 'pause':
      spotifyApi.pause();
      break;
    case 'forward':
      spotifyApi.skipToNext();
      break;
    case 'backward':
      spotifyApi.skipToPrevious();
      break;
  };
  res.send();
});

app.whenReady().then(createWindow);