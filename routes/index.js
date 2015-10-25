var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/test', function(req, res) {
    res.render('index', { title: 'Express' });
});

router.get('/pictures', function(req, res) {
    res.render('pictures', { title: 'Pictures' });
});


module.exports = router;
