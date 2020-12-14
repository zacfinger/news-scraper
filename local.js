// Pulls news items from Google News RSS feed
// Stores data in database

// Load config settings
const config = require('./config');

// Require RSS dependency
let Parser = require('rss-parser');
let parser = new Parser();

// Instantiate dependency objects
// Later load conditionally based on config
let mysql = null; // mysql object
let util = null; // node native promisify
let query = null; // Object to use promisified mysql connection
let admin = null; // Firestore objects...
let serviceAccount = null;
let db = null;

// Conditionally load dependencies
if (config.useSQL) {
    mysql = require('./dbcon.js');
    util = require('util');
    mysql.conn.query = util.promisify(mysql.conn.query).bind(mysql.conn);
} else {
    // Get Firestore values if needed
    admin = require('firebase-admin');
    serviceAccount = require(config.jsonPath);

    // Check if app already initialized
    if (!admin.apps.length){
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
    }

    db = admin.firestore();
}

// Main
(async() => {

    // Get Date.now and subtract one hour
    let timeToCheck = new Date();
    timeToCheck.setMinutes(timeToCheck.getMinutes() - config.minutesAgo);
    
    // Pull local headlines
    let feed = await parser.parseURL('https://news.google.com/rss/search?q=' + config.locale);
try{
    // TODO: Account for multiple stories in <ol> tag in description
    feed.items.forEach(item => {
        var date = new Date(item.pubDate);
        
        // If the news item was published within last 60 minutes
        if (date >= timeToCheck) {
		
            // TODO: Check if item.link contains word in denylist
            (async() => {
                if(config.useSQL) {
                    // TODO: Check guid does not exceed the column limit
                    // TODO: Check guid does not exist
		    try {					
                    	var result = await mysql.conn.query(
                        'insert into linksToProcess (`guid`, `link`, `pubDate`) values (?, ?, ?)',
                        [item.guid, item.link, date]);
			console.log(result);
		    }
		    catch(ex) {
			    //console.log(ex);
			    console.log("Some error");
		    }
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
}finally{
	if(config.useSQL && mysql.conn && mysql.conn.end) {
	mysql.conn.end(); }
}
})();

