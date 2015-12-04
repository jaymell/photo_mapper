var express = require('express');
var router = express.Router();
var COLLECTION = 'photo_mapper';
var config = require('../cfg/config.js');

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index', { 
		title: 'Photo Map',
		gmapsKey: config.gmapsKey,
	});
});

router.get('/edit', function(req, res) {
	res.render('edit', {
		title: 'Edit Photos'
	});
});

router.get('/pictures', function(req, res) {
    var db = req.db;
    var collection = db.get(COLLECTION);
    collection.find({},{},function(e,docs){
        res.render('pictures', {
            'pictures' : docs
        });
    });
});

router.get('/json', function(req, res) {
	var db = req.db;
	var collection = db.get(COLLECTION);
	collection.find({}, {}, function(e,docs) {
		res.json(docs.sort(function(a,b) {
			return new Date(a.date) - new Date(b.date)
		}));	
	});
});

router.get('/test', function(req, res) {
	res.json({
		'req.params': req.params,
		'req.body': req.body,
	});
});

module.exports = router;
