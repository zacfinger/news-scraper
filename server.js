var express = require('express');
var mysql = require('./dbcon.js');
var CORS = require('cors');
var weather = require('./weather');

// Instantiate app
var app = express();
app.set('port', 9000);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(CORS());

app.get('/api/stories', function(req, res, next) {
	mysql.pool.query('select Story.id, sm_api_title, tagline, gpt_neo_content, img from storyContent join Story on Story.id = storyContent.id where status = 5 order by Story.id desc limit 20;', (err, rows, fields) => {
		if (err) {
			next(err);
			return;
		}
		res.json(rows);
	});
});

app.get('/api/story/:id', function (req, res, next) { 
	mysql.pool.query('select sm_api_title, gpt_neo_content, img from storyContent where id=?',
		[req.params.id],
		(err, rows) => {
			if (err) {
				next(err);
				return;
			}
			res.json(rows[0]);

	});
});

app.get('/api/weather/', function (req, res, next) {
	mysql.pool.query('select * from weather limit 1', async (err, rows, fields) => {
		if (err) {
			next(err);
			return;
		}

		var pubDate = rows[0].pubDate;
		var dt90secondsAgo = new Date(Date.now() - 90000);

		// If weather was last updated within last 90 seconds
		if (pubDate >= dt90secondsAgo) {
			res.json(rows[0]);
		}
		else {
			// If weather has not been updated in over 90 seconds
			var currentWeather = await weather.getWeather();
			res.json(currentWeather);
		}
	});
});

app.listen(app.get('port'), function(){
	console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
