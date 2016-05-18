var db = require('../config');
var path = require('path');
var User = require('../models/user');
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '../../db/shortly.sqlite')
  },
  useNullAsDefault: true
});

var Users = new db.Collection();

Users.search = function(username, callback) {
  return db.knex.select('password').from('users').where({username: username})
    .then(function(pwhash) {
      callback(pwhash); 
    });
};

Users.findOne = function(username, callback) {
  console.log(username);
  return db.knex.select('username', 'password').from('users').where({username: username.username})
    .then(function(user) {
      callback(JSON.stringify(user[0])); 
      console.log('user ', user[0]);
    });
};



Users.model = User;

module.exports = Users;
