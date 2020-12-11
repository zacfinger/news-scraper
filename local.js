let Parser = require('rss-parser');
let parser = new Parser();
const config = require('./config');
const admin = require('firebase-admin');

let serviceAccount = require(config.jsonPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

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
            // Populate to firestore db
            (async() => {
                db.collection('linksToProcess').doc(item.guid).set({
                    url: item.link,
                    time: date
                });
            })();

        }

    });
})();