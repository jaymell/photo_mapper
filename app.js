// here's a pic with that's rotated incorrectly:
// 90 degrees counter-clockwise:
// 43b28e693579d1b495ace80bf4324780
// 5cebc610a99bb9da315b69d017bd94ad
// correct: 50339893aab76d0da206670663a4cb49

// Load required packages
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');

// Create our Express application
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', routes);
app.use('/magnific', express.static(path.join(__dirname, './node_modules/magnific-popup/dist')));

// Add static middleware
var oneDay = 86400000;
app.use(express.static(__dirname + '/public', {maxAge: oneDay}));

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;

// Start the server if initial
// DB connection is successful:
var PORT = 5001;
var url = 'mongodb://localhost:27017/photo_mapper';
var db = require('./db');
db.connect(url, function(err) {
	if(err) {
		console.log('Unable to connect to Mongo.');
		process.exit(1);
	} else {
		console.log('Connected to DB. Starting app');
		app.listen(PORT, function() {
			console.log('Listening on port ' + PORT);
		});
	}
});

