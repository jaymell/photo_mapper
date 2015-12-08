var express = require('express');
var router = express.Router();
var COLLECTION = 'photo_mapper';
var config = require('../cfg/config.js');
var db = require('../db');

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
    var collection = db.get().collection(COLLECTION);
    collection.find({},{}).toArray(function(e,docs){
        res.render('pictures', {
            'pictures' : docs
        });
    });
});

router.get('/photos', function(req, res) {
	var collection = db.get().collection(COLLECTION);
	collection.find({}, {}).toArray(function(e,docs) {
		res.json(docs.sort(function(a,b) {
			return new Date(a.date) - new Date(b.date)
		}));	
	});
});

router.delete('/photos', function(req, res) {
	var toDelete = req.body.id;
	console.log('deleting: ', toDelete);
	var collection = db.get().collection(COLLECTION);
	collection.remove({'md5sum': 'nonexistent'}, function(err) {
		if (err) res.status(500).send({error: err});
		else res.status(200).send({response: "I think I deleted it"});
	});
});

router.get('/test', function(req, res) {
	res.json({
		'req.params': req.params,
		'req.body': req.body,
	});
});

module.exports = router;
