// 1. on the hour grab the stories on google news from the last hour and store in db
// 2. every 15 mins
// // for each link stored
// // // find oldest link in collection
// // // grab summary from API
// // // identify parts of speech
// // // use thesaurus API
// // // swap out ordering of clauses
// // // post in DB
// // // delete link

// Load config settings
const config = require('./config');

// Require dependencies
const fetch = require("node-fetch");
const pos = require('pos');
const thesaurus = require("thesaurus");
const app = require('./app'); // Common app functions

// Instantiate dependency objects
// Later load conditionally based on config
let mysql = null; // mysql object
let admin = null; // Firestore objects
let serviceAccount = null;
let db = null;

// Conditionally load dependencies
if (config.useSQL) {
    mysql = require('./dbcon.js');
    util = require('util');
    // https://stackoverflow.com/questions/44004418/node-js-async-await-using-with-mysql
    // https://mhagemann.medium.com/create-a-mysql-database-middleware-with-node-js-8-and-async-await-6984a09d49f4
    mysql.conn.query = util.promisify(mysql.conn.query).bind(mysql.conn);
} else {
    // Get Firestore values if needed
    admin = require('firebase-admin');
    serviceAccount = require(config.jsonPath);

    // Check if app already initialized
    // https://stackoverflow.com/questions/57763991/initializeapp-when-adding-firebase-to-app-and-to-server
    if (!admin.apps.length){
        admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
        });
    }

    db = admin.firestore();
}

// Parameter to store URL of oldest story
// TODO: Use story objects with members URL, summary etc
var url = "";

const getURLofOldestStorySQL = async () => {

    var guid = null;
    var oldestURL = "";

    try {
        // Find story with oldest time stamp
        // https://stackoverflow.com/questions/19827388/mysql-select-top-n-max-values
        var rows = await mysql.conn.query('select * from linksToProcess order by pubDate asc limit 1');

        if(rows.length > 0){
            guid = rows[0].guid;
            oldestURL = rows[0].link;
        }

        // Delete oldest story
        if(guid) {
            await mysql.conn.query('delete from linksToProcess where guid = ?', [guid]);
        }
        
    }
    catch (ex) {
        console.log(ex);
    }

    return oldestURL;

}

const getURLofOldestStory = async () => {

    var oldestURL = ""

    try {

        // Pull all links in the collection
        // https://stackoverflow.com/questions/59081736/synchronously-iterate-through-firestore-collection
        // https://stackoverflow.com/questions/53524187/query-firestore-database-on-timestamp-field
        const links = await db.collection("linksToProcess").get();
        //console.log(links.docs);

        var oldestDate = new Date();
        var oldestIndex = -1
        
        // Iterate through list and find index of document with oldest time stamp
        for(let index = 0; index < links.docs.length; index++){
            
            var pubDate = links.docs[index].data().time;
            
            if(pubDate < oldestDate){
                
                oldestIndex = index;
                oldestDate = pubDate;
            }
            
        }

        if(oldestIndex >= 0){
            
            oldestURL = links.docs[oldestIndex].data().url;
            
            // Delete document reference
            // https://stackoverflow.com/questions/47180076/how-to-delete-document-from-firestore-using-where-clause
            links.docs[oldestIndex].ref.delete();

        }

    } catch (error) {
        console.log(error);
        //throw error;
    }

    return oldestURL;
}

const getSummary = async (url) => {
    try {
        const response = await fetch(("http://api.smmry.com/&SM_API_KEY=" + config.smmry_key 
        + "&SM_WITH_BREAK=true" + "&SM_LENGTH=40" + "&SM_URL=" + url), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        // TODO: replace all double quotes with single quotes 
        const json = await response.json();
        //console.log(json);

        if(!("sm_api_error" in json)){
            return json.sm_api_content;
        }
 
    } catch (error) {
        console.log(error);
        //throw error;
    }

    return ""
}

const thesaurusize = (sourceText) => {

    // TODO: Include credit at beginning of second paragraph
    // "According to <domain.com>, <first_sentence>."
    // "<first_sentence>, according to a new report from <domain.com> on <day_of_week>"
    // "Local outlet <domain.com> reported on <day_of_week> that <first_sentence>"
    // "Sources confirmed to <domain.com> that <first_sentence>"

    var newSummary = ""
    var words = sourceText.split(" ");
    var tagger = new pos.Tagger();
    var newWords = [];
    var newWord = undefined;
    var sourceCited = false;

    // Iterate through summary word for word
    for (i in words){

        if(sourceCited == false && words[i].includes("[BREAK]")){
            newSummary += words[i] + " According to a report by " + app.getDomain(url) + ",";
            sourceCited = true;
        }
        else {
            newWord = undefined;
        
            // Identify POS of word
            var tag = tagger.tag([words[i]]);
            
            // If the word is any kind of ADVERB or ADJECTIVE
            // TODO: Possibly use https://www.npmjs.com/package/thesaurus-com instead
            if(tag[0][1] == "RB" || tag[0][1] == "JJ" ||
               tag[0][1] == "JJR" || tag[0][1] == "JJS" ||
               tag[0][1] == "RBR" || tag[0][1] == "RBS"){
                
                newWords = thesaurus.find(words[i])
    
                newWord = newWords[Math.floor(Math.random() * newWords.length)];
            }
            // Protect against no words found
            if(newWord == undefined){
                newSummary += words[i];
            }
            else {
                newSummary += newWord;
            }
        }
        
        newSummary += " ";
    }

    return newSummary;
}

(async() => {
    
    var summary = ""

    try {

        // Find oldest non-processed story and remove from database
        if(config.useSQL){
            url = await getURLofOldestStorySQL();
        }
        else {
            url = await getURLofOldestStory();
        }
        
        if(url.length > 0){
            summary = await getSummary(url);
        }

        if(summary.length > 0){
            summary = thesaurusize(summary);
        }
        
        console.log(summary);

    } finally {
        if(config.useSQL && mysql.conn && mysql.conn.end) {
        mysql.conn.end(); }
    }

})();