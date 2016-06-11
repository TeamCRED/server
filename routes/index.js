'use strict';

const express = require('express');
const router = express.Router();
const unirest = require('unirest');
const knex = require('../db/knex');
const moment = require('moment');

function Batches() {
  return knex('batches')
}

router.get('/', (req, res) => {
  res.send('please enter a beer')
});

router.get('/beer', (req, res) => {
  let quote = req.query.quote || '';
  let tank = req.query.tank || '';
  let time = req.query.time || '';
  let date = req.query.date || '';
  let beer_id = req.query.beer_id;
  if (!beer_id) {
    return res.json({
      error: "make sure to include beer_id"
    })
  }
  var query = Batches().where('beer_id', beer_id)

  if (quote) query.andWhere('quote', quote);
  if (date) query.andWhere('date', moment(date).format('MM-DD-YYYY'));
  if (time) query.andWhere('time', time);
  if (tank) query.andWhere('tank', tank);

  query.then(batches => {
    if (batches.length > 1 || batches.length == 0) {
      return res.json({
        error: "Not enough information to find your brew. :("
      })
    } else {
      var batch = batches[0];
      console.log(batch)
      Promise.all([
        knex('employee_batches')
        .where('batch_id', batch.id)
        .join('employees', 'employees.id', 'employee_id').join('title', 'title.id', 'title_id'),
        knex('user_batches').select('user_batches.user_id', 'user_batches.batch_id', 'users.first_name', 'users.last_name', 'users.id')
        .where('batch_id', batch.id)
        .join('users', 'users.id', 'user_id')
      ]).then(function(result) {

        res.json({
          batch: batch,
          employees: result[0],
          users: result[1]
        });
      })
    }
  }).catch(err => {
    return res.json({
      error: err
    })
  })
});

router.get('/awards', (req, res, next) =>{
  if(req.user && req.user.id){
    getAwards(req.user.id).then(function(awards){
      res.json(awards)
    })
  }
})

router.get('/awards/:id', (req, res, next) => {
  getAwards(req.params.id).then(function(awards){
    res.json(awards)
  })
})

router.get('/:beer', (req, res, next) => {
  let beer = req.params.beer;
  let url = 'http://apis.mondorobot.com/beers/'
  unirest.get(url + beer)
    .end(response => {
      let beerData = response.body.beer
      res.json(beerData);
    })
});

function getAwards (id) {
  return knex('user_awards').where('user_id', id).join('awards', 'awards.id', 'award_id')
}


module.exports = router;
