var express = require('express');
var router = express.Router();
var COLLECTION = 'photo_mapper';
var config = require('../config.js');

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index', { 
		title: 'Photo Map',
		gmapsKey: config.gmapsKey,
	});
});

router.get('/pictures', function(req, res) {
    var db = req.db;
    var collection = db.get(COLLECTION);
    collection.find({},{},function(e,docs){
        res.render('pictures', {
            "pictures" : docs
        });
    });
});

router.get('/json', function(req, res) {
	var db = req.db;
	var collection = db.get(COLLECTION);
	collection.find({}, {}, function(e,docs) {
		res.json(docs);
	});
});

module.exports = router;
