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

(async() => {
    // https://stackoverflow.com/questions/59081736/synchronously-iterate-through-firestore-collection
    const links = await db.collection("links").get();
    
    for(let index = 0; index < links.docs.length; index++){
        console.log(links.docs[index].data().title);
    }
})();