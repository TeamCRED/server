'use strict';

const express = require('express');
const router = express.Router();
const unirest = require('unirest');

router.get('/', (req, res) => {
  res.send('please enter a beer')
});

router.get('/beer', (req, res) => {
  let quote = req.query.quote;
  let tank = req.query.tank;
  let time = req.query.time;
  let date = req.query.date;
  if (!time || !date) {
    res.json({error: "make sure to include date and time"})
  }
  res.json({beerId: `fetching data for ${time} and ${date}`})
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
