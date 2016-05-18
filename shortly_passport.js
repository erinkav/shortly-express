var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var passport = require('passport');
// var LocalStrategy = require('passport-local').Strategy;
var GitHubStrategy = require('passport-github2');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');


var GITHUB_CLIENT_ID = "89e0a8ce1db205c49fda";
var GITHUB_CLIENT_SECRET = "f4c247c7c27855db847e1d0bad253f0bb2e13fb7";

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: "http://127.0.0.1:3000/auth/github/callback"
},
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'random-string',
  // cookie: { 
  //   secure: true
  // }
}));
app.use(passport.initialize());
app.use(passport.session());

// var sess;
// var checkUser = function(req, res, next) {
//   if (req.session.loggedIn) {
//     next();
//   } else {
//     console.log('header', req.header);
//     res.redirect('/login');
//   }
// };

// passport.serializeUser(function(user, done) {
//   var sessionData = {};

//   sessionData.user = user._id;

//   // store workingAt to build socket.io rooms
//   if(user.workingAt){
//     sessionData.workingAt = user.workingAt;
//   }

//   done(null, sessionData);
// });

//   // deserialize sessions
// passport.deserializeUser(function(sessionData, done) {
//   User.findById(sessionData.user, function (error, user) {
//     if(error){
//       done(error);
//     } else {
//       done(null, user);
//     }
//   });
// });

var checkUser = function(req, res, next) {
  console.log('passport session:', req.session.passport);
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/', checkUser,
function(req, res) {
  console.log("ChECK REQUEST SESSION", req.session); 
  res.render('index');
});

app.get('/create', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', checkUser,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', checkUser,
function(req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    res.status(404);
    return res.send();
  }
  new Link({ url: uri }).fetch({withRelated: ['users']}).then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }
        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function (req, res) {
  res.status(200).render('login');
});

// app.post('/login', passport.authenticate('local', { 
//   successRedirect: '/', 
//   failureRedirect: '/login',
//   failureFlash: false
// }), function(req, res) {
//   res.redirect('/');
// });
//   function (req, res) {
//   sess = req.session;
//   var username = req.body.username;
//   var pw = req.body.password; 
//   Users.search(username, function(pwhash) {
//     bcrypt.compare(pw, pwhash[0].password, function (err, result) {
//       if (err) {
//         throw err;
//       } else if (result === true) {
//         sess.loggedIn = true;
//         res.redirect('/');
//       } else if (result === false) {
//         res.redirect('/login');
//       }
//     });
//   });
// }

app.get('/signup', function (req, res) {
  res.render('signup'); 
});  

app.post('/signup', function (req, res) {
  var user = req.body;
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(user.password, salt);
  Users.create({
    username: user.username,
    password: hash,
  })
  .then(function() {
    res.status(201).redirect('/');
  });
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/login');
  // req.session.destroy(function() {
  //   res.redirect('/login'); 
  // }); 
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });
      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
