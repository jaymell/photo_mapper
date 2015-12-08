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
	console.log('attempting to delete: ', toDelete);
	// regex to verify an md5sum was actually passed:
	if(!/^[a-fA-F0-9]{32}$/.test(toDelete)) {
		console.log("unable to delete -- doesn't match regex");
		res.status(400).send();
	}
	var collection = db.get().collection(COLLECTION);
	collection.deleteOne({'md5sum': toDelete}, function(err, r) {
		if (err) res.status(500).send({error: err});
		if (r.deletedCount != 1) {
			res.status(404).send();
		} else {
			// database delete was successful
			res.status(200).send(); 
		}
	});
});

module.exports = router;
