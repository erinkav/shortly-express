var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

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
  secret: 'random-string'
}));

var loggedIn = false;
var sess;

app.get('/', 
function(req, res) {
  sess = req.session;
  console.log('session ', sess);
  //if not logged in, then redirect
    if (!sess.loggedIn) {
      console.log('redirect to login');
      res.redirect('/login');
    }
  res.render('index');
});

app.get('/create', 
function(req, res) {
  //if not logged in, then redirect
  if (!sess.loggedIn) {
    res.redirect('/login');
  }
  res.render('index');
});

app.get('/links', 
function(req, res) {
  //if not logged in, then redirect
  if (!sess.loggedIn) {
    res.redirect('/login');
  }
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  // if (!loggedIn) {
  //   res.redirect('/login');
  // }

  var uri = req.body.url;

  // console.log('req', req);
  // console.log('res', res);

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
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
  // console.log('App.get Login ', req.body); 
  // Check in database if user exists

    // if user exists
      // redirect to homepage
    // else 
      // stay on login (and maybe display error message)


  res.render('login');
  loggedIn = true;
  // res.status(200).send();
});

app.post('/login', function (req, res) {
  // console.log('App.post Login ', req.body); 
  // Pull username and password from req.body
  var username = req.body.username;
  var pw = req.body.password; 
  console.log(username, pw); 
  
  res.render('login');
  sess.loggedIn = true;
  // res.status(201).send();
});

app.get('/signup', function (req, res) {

});  

app.post('/signup', function (req, res) {
  var user = req.body;
  Users.create({
    username: user.username,
    password: user.password,
  })
  .then(function() {
    res.status(201).redirect('/');
  });
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
