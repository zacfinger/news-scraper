var express = require('express');
var mysql = require('./dbcon.js');
var CORS = require('cors');

// Instantiate app
var app = express();
app.set('port', 9000);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(CORS());

app.get('/api/', function(req, res, next) {
	mysql.pool.query('select * from spunStories order by pubDate desc', (err, rows, fields) => {
		if (err) {
			next(err);
			return;
		}
		res.json(rows);
	});
});

app.get('/api/story/:guid', function (req, res, next) { 
	mysql.pool.query('select * from spunStories where guid=?',
		[req.params.guid],
		(err, rows) => {
			if (err) {
				next(err);
				return;
			}
			res.json(rows[0]);

	});
});

app.listen(app.get('port'), function(){
	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
