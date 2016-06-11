'use strict';

const express = require('express');
const router = express.Router();
const unirest = require('unirest');
const knex = require('../db/knex');

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
    res.json({error: "make sure to include beer_id"})
  }
  Batches().select()
    .where('beer_id', beer_id)
    // .orWhere('date', date)
    // .orWhere('time', time)
    .orWhere('tank', tank)
    .orWhere('quote', quote)
    .then(beer => {
    res.json({
      query: `fetching data for ${beer_id}`,
      result: beer,
    })
  })
});

router.get('/:beer', (req, res, next) => {
  let beer = req.params.beer;
  let url = 'http://apis.mondorobot.com/beers/'
  unirest.get(url + beer)
    .end(response => {
      let beerData = response.body.beer
      res.json(beerData);
    })
});

module.exports = router;
