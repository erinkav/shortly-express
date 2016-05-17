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
  return db.knex.select('username', 'password').from('users').where({username:username, password: password})
    .then(function(userObject) {
      console.log('userobject', userObject); 
      callback(userObject); 
    });
};

Users.model = User;

module.exports = Users;
