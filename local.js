// Pulls news items from Google News RSS feed
// Stores data in database

// Require dependencies
let Parser = require('rss-parser');
let parser = new Parser();
var mysql = require('./dbcon.js');
const config = require('./config');
const admin = require('firebase-admin');
let serviceAccount = require(config.jsonPath);

// Boolean config value to use SQL or Firestore
let useSQL = config.useSQL;

// Get Firestore values if needed
let db = null;
if (!useSQL)
{
	admin.initializeApp({
  		credential: admin.credential.cert(serviceAccount)
	});

	db = admin.firestore();
}

(async() => {

    // Get Date.now and subtract one hour
    let oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    // Pull local headlines
    let feed = await parser.parseURL('https://news.google.com/rss/search?q=' + config.locale);

    // TODO: Account for multiple stories in <ol> tag in description
    feed.items.forEach(item => {
        var date = new Date(item.pubDate);
        
        // If the news item was published within last 60 minutes
        if (date >= oneHourAgo) {
		
		// TODO: Check if item.link contains word in denylist
		(async() => {
			if(useSQL)
			{
				// TODO: Check guid does not exceed the column limit
				// TODO: Check guid does not exist
				mysql.pool.query(
					'insert into linksToProcess (`guid`, `link`, `pubDate`) values (?, ?, ?)',
					[item.guid, item.link, date],
					(err, result) => {
						if(err)
						{
							console.log(err);
						}
						else
						{
							console.log(result);
						}
					}
				);
			}
			else
			{
				// Populate to firestore db
				db.collection('linksToProcess').doc(item.guid).set({
					url: item.link,
					time: date
				});
			}
		})();

        }

    });
})();
