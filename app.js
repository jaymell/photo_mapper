// here's a pic with that's rotated incorrectly:
// 90 degrees counter-clockwise:
// 43b28e693579d1b495ace80bf4324780
// 5cebc610a99bb9da315b69d017bd94ad
// correct: 50339893aab76d0da206670663a4cb49

var DB = 'photo_mapper';

// Load required packages
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/'+DB);

// Create our Express application
var app = express();

// Make our db accessible to our router
// Note: binding it to EVERY HTTP request
// sub-optimal performance-wise:
app.use(function(req,res,next){
    req.db = db;
    next();
});

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

// Create our Express router
//var router = express.Router();

// Register all our routes
//app.use(router);

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

// Start the server
var PORT = 5001;
app.listen(PORT);

