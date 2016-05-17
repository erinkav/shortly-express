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

Users.search = function(username, password, callback) {
  console.log(username, password); 
  return db.knex.select('password').from('users').where({username:username})
    .then(function(pwhash) {
      console.log('pwhash', pwhash); 
      callback(pwhash); 
    });
};

Users.model = User;

module.exports = Users;
