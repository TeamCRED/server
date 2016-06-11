'use strict';

const express = require('express');
const router = express.Router();
const unirest = require('unirest');
const knex = require('../db/knex');
const moment = require('moment');

function Batches() {
  return knex('batches')
}

let beers = null;
let beersByID = {};

router.get('/', (req, res) => {
  res.send('please enter a beer')
});

router.get('/batches/:user_id', (req, res, next) => {
  if (req.params.user_id) {
    knex('user_batches')
    .where('user_id', req.params.user_id)
    .join('batches', 'batches.id', 'batch_id')
    .then(function (batches) {
      res.json(batches);
    })
  } else {
    res.json({error: 'Invalid user id'})
  }
});

router.post('/user_batch', (req, res, next) => {
  if(req.user && req.user.id) {
    if(req.body.batch_id) {
      Batches().where('id', req.body.batch_id)
      .first().then(function (batch) {
        if(batch) {
          knex('user_batches')
          .where('batch_id', batch.id)
          .andWhere('user_id', req.user.id)
          .first()
          .then(function (userBatch) {
            if(userBatch) {
              res.json({error: 'That batch has already been added!'})
            } else {
              knex('user_batches').insert({
                user_id: req.user.id,
                batch_id: batch.id
              }, 'id').then(function (id) {
                console.log(id);
                res.json({id: id[0], batch: batch})
              })
            }
          })
        } else {
          res.json({error: 'Invalid batch id'})
        }
      });
    } else {
      res.json({error: 'Invalid batch id'})
    }
  } else {
    res.json({error: 'Unauthorized'})
  }
});

router.get('/buddies/:user_id', (req, res, next) => {
  if (req.params.user_id) {
    knex('user_batches').where('user_id', req.params.user_id)
    .then(batches => {
      var ids = batches.map(b => b.batch_id);
      knex('user_batches')
      .whereIn('batch_id', ids)
      .whereNot('user_id', req.params.user_id)
      .join('users', 'users.id', 'user_id')
      .select('users.first_name', 'users.last_name', 'users.id', 'image_url')
      .then(users => {
        var userCounts = {};
        var uniqueUsers = [];

        users.forEach(u => {
          if (userCounts[u.id]) {
            userCounts[u.id]++;
          } else {
            userCounts[u.id] = 1;
            uniqueUsers.push(u);
          }
        });

        uniqueUsers.forEach(u => {
          u.count = userCounts[u.id];
        });

        res.json(uniqueUsers);
      })
    })
  } else {
    res.json({error: 'Invalid user id'})
  }
});

router.get('/batch/:batch_id/buddies/:user_id', (req, res, next) => {
  if (req.params.user_id) {
    knex('user_batches').where('batch_id', req.params.batch_id)
    .then(batches => {
      var ids = batches.map(b => b.user_id);
      console.log(ids)
      knex('user_batches')
      .whereIn('user_id', ids)
    .whereNot('user_id', req.params.user_id)
    .join('users', 'users.id', 'user_id')
    .select('users.first_name', 'users.last_name', 'users.id')
    .then(users => {
      var userCounts = {};
      var uniqueUsers = [];

      users.forEach(u => {
        if (userCounts[u.id]) {
          userCounts[u.id]++;
        } else {
          userCounts[u.id] = 1;
          uniqueUsers.push(u);
        }
      });

      uniqueUsers.forEach(u => {
        u.count = userCounts[u.id];
      });

      res.json(uniqueUsers);
    })
  })
  } else {
    res.json({error: 'Invalid user id'})
  }
});

router.get('/employees/:user_id', (req, res, next) => {
  if (req.params.user_id) {
    knex('user_batches')
    .where('user_batches.user_id', req.params.user_id)
    .join('batches', 'batches.id', 'user_batches.batch_id')
    .join('employee_batches', 'employee_batches.batch_id', 'user_batches.batch_id')
    .join('employees', 'employees.id', 'employee_batches.employee_id')
    .join('title', 'title.id', 'employees.title_id')
    .then(function (employees) {
      var employeeCounts = {};
      var uniqueEmployees = [];

      employees.forEach(u => {
        if (employeeCounts[u.employee_id]) {
          employeeCounts[u.employee_id]++;
        } else {
          employeeCounts[u.employee_id] = 1;
          uniqueEmployees.push(u);
        }
      });

      uniqueEmployees.forEach(u => {
        u.count = employeeCounts[u.employee_id];
      });

      res.json(uniqueEmployees);
    })
  } else {
    res.json({error: 'Invalid user id'})
  }
});

router.get('/awards', (req, res, next) =>{
  if(req.user && req.user.id){
    getAwards(req.user.id).then(function(awards){
      res.json(awards)
    }).catch(err => {
      res.json({error: err})
    })
  } else {
    res.json({error: "You are not logged in"});
  }
})

router.get('/awards/:id', (req, res, next) => {
  getAwards(req.params.id).then(function(awards){
    res.json(awards)
  }).catch(err => {
    res.json({error: err});
  })
})

router.get('/user/:id', (req, res, next) => {
  if(typeof req.params.id != 'undefined') {
    knex('users')
    .select('first_name', 'last_name', 'image_url')
    .where('id', req.params.id)
    .first()
    .then(user => {
      res.json(user);
    });
  } else {
    res.json({error: 'Error? Yes. An error.'});
  }
});

router.get('/beer/:id', (req, res, next) => {
  let id = req.params.id;
  if(beersByID.hasOwnProperty(id)) {
    res.json(beersByID[id]);
  } else {
    let url = 'http://apis.mondorobot.com/beers/'
    unirest.get(url + id)
    .end(response => {
      let beerData = response.body.beer;
      beersByID[id] = beerData;
      res.json(beerData);
    })
  }
});

router.get('/beers', (req, res, next) => {
  if(beers) {
    res.json(beers);
  } else {
    let url = 'http://apis.mondorobot.com/beers/'
    unirest.get(url)
    .end(response => {
      beers = response.body.beers;
      res.json(response.body.beers);
    })
  }
});

router.get('/points/:id', (req, res, next) => {
  let id = req.params.id
  getAwards(id).then(function(awards){
    var points = 0;
    for(var i=0; i<awards.length; i++) {
      points += awards[i].points
    }
    res.json(points)
  })
})

function getAwards (id) {
  return knex('user_awards').where('user_id', id).join('awards', 'awards.id', 'award_id')
}

module.exports = router;
