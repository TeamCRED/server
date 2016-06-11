var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  res.send('please enter a beer')
})

router.get('/:beer', function(req, res, next) {
  var message = 'hello ' + req.params.beer
  res.send(message);
});

module.exports = router;
