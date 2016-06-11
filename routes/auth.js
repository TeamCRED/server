'use strict';

const express = require('express');
const router = express.Router();
const knex = require('../db/knex')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const validator = require('validator');
const moment = require('moment');

var LocalStrategy = require('passport-local').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;

require('dotenv').load();

var Users = function() {
  return knex('users');
}

passport.use(new LocalStrategy({
  usernameField: 'email'
}, function(email, password, done) {
  console.log('Logging in...')
  findUserByEmail(email).then(function(user) {
    if (user && user.password !== null && bcrypt.compareSync(password, user.password)) {
      return done(null, user);
    } else {
      return done(new Error('Invalid Email or Password'));
    }
  }).catch(function(err) {
    return done(err);
  })
}));

passport.use(new BearerStrategy(function(token, done) {
  jwt.verify(token, process.env.TOKEN_SECRET, function(err, decoded) {
    if (err) return done(err);
    done(null, decoded.user);
  });
}));

function findUserByID(id) {
  return Users().where('id', id).first()
    .then(function(user) {
      if (user) {
        return user;
      } else {
        return Promise.reject({
          notFound: true
        });
      }
    }).catch(function(err) {
      return Promise.reject(err);
    });
}

function findUserByEmail(email) {
  return Users().where('email', email).first()
    .then(function(user) {
      if (user) {
        return user;
      } else {
        return Promise.reject({
          notFound: true
        });
      }
    }).catch(function(err) {
      return Promise.reject(err);
    });
}

function validPassword(p) {
  return typeof p !== 'undefined' && p !== null && typeof p == 'string' && p.trim() !== '';
}

function validBirthday(b) {
  return moment().diff(b, 'years') >= 21;
}

function validName(firstName, lastName) {
  return validPassword(firstName) && validPassword(lastName);
}

function createUser(user) {
  if (!validator.isEmail(user.email)) return Promise.reject('Invalid email');
  if (!validPassword(user.password)) return Promise.reject('Password cannot be blank');
  if (!validName(user.first_name, user.last_name)) return Promise.reject('You must provide a first and last name');
  user.birthday = moment(user.birthday).format('MM-DD-YYYY');
  if (!validBirthday(user.birthday)) return Promise.reject('You must be 21 to use this site');

  var hash = bcrypt.hashSync(user.password, 8);
  user = {
    email: user.email,
    password: hash,
    first_name: user.first_name,
    last_name: user.last_name,
    birthday: user.birthday
  };

  return Users().insert(user, 'id').then(function(id) {
    user.id = id[0];
    return user;
  }).catch(function(err) {
    console.log('Error inserting user');
    return Promise.reject(err);
  });
}

function createToken(user) {
  return new Promise(function(resolve, reject) {
    delete user.password;
    var data = {
      user: user
    }

    jwt.sign(data, process.env.TOKEN_SECRET, {
        expiresIn: '1d'
      },
      function(error, token) {
        if(error) return reject(error);
        resolve(token);
      });
  });
}

router.post('/signup', function(req, res, next) {
  findUserByEmail(req.body.email).then(function(user) {
    next(new Error('Email is in use'));
  }).catch(function(err) {
    if (err.notFound) {
      createUser({
        email: req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        birthday: req.body.birthday
      }).then(function(user) {
        createToken(user).then(function(token) {
          res.json({
            token: token
          });
        });
      }).catch(function(err) {
        next(err);
      });;
    } else {
      next(err);
    }
  });
});

router.post('/login', function(req, res, next) {
  passport.authenticate('local',
    function(err, user, info) {
      if (err) return next(err);
      if (user) {
        createToken(user).then(function(token) {
          res.json({
            token: token
          });
        });
      } else {
        next('Invalid Login');
      }
    })(req, res, next);
});

module.exports = {
  router: router,
  authenticate: function(req, res, next) {
    passport.authenticate('bearer', function(err, user, info) {
      req.user = user;
      next();
    })(req, res, next);
  }
};
