// 1. on the hour grab the stories on google news from the last hour and store in db
// 2. for each link stored
// // find oldest link in collection
// // grab summary from API
// // identify parts of speech
// // use thesaurus API
// // swap out ordering of clauses
// // post in DB
// // delete link

const config = require('./config');

const admin = require('firebase-admin');

let serviceAccount = require(config.jsonPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

const getURLofOldestStory = async () => {
    
    // Pull all links in the collection
    // https://stackoverflow.com/questions/59081736/synchronously-iterate-through-firestore-collection
    // https://stackoverflow.com/questions/53524187/query-firestore-database-on-timestamp-field
    const links = await db.collection("linksToProcess").get();

    var oldestDate = new Date();
    var oldestIndex = -1
    var id = -1
    var url = ""
    
    // Iterate through list and find index of document with oldest time stamp
    for(let index = 0; index < links.docs.length; index++){
        
        var pubDate = links.docs[index].data().time;
        
        if(pubDate < oldestDate){
            
            oldestIndex = index;
            oldestDate = pubDate;
            id = links.docs[index].id;
        }
        
    }

    if(oldestIndex >= 0){
        url = links.docs[oldestIndex].data().url;
    }

    return url;
}

(async() => {
    
    var url = await getURLofOldestStory();

    console.log(url);

})();