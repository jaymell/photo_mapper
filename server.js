// Load required packages
var express = require('express');

// Create our Express application
var app = express();

// Add content compression middleware
//app.use(compression());

// Add static middleware
var oneDay = 86400000;
app.use(express.static(__dirname + '/static', {maxAge: oneDay}));

// Create our Express router
var router = express.Router();

// Initial dummy route for testing
router.get('/', function(req, res) {
  res.end('Twitatron');
});

// Register all our routes
app.use(router);

// Start the server
app.listen(3000);
