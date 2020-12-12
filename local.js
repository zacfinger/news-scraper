// Pulls news items from Google News RSS feed
// Stores data in database

// Load config settings
const config = require('./config');
let useSQL = config.useSQL; // Boolean: use SQL or Firestore for db

// Require RSS dependencies
let Parser = require('rss-parser');
let parser = new Parser();

// Instantiate dependency objects
// Later load conditionally based on config
let mysql = null; // mysql object

// Firestore objects
let admin = null;
let serviceAccount = null;
let db = null;

// Conditionally load dependencies
if (useSQL) {
    mysql = require('./dbcon.js');
} else {
    admin = require('firebase-admin');
    serviceAccount = require(config.jsonPath);

    // Get Firestore values if needed
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
}

// Main
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
                if(useSQL) {
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
                else {
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
