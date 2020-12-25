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
let util = null;
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

// Use story objects with members URL, summary etc
const Story = (title = null, guid = null, body = null, pubDate = null, link = null, img = null, wordBank = null) => {
    return {
        "title": title,     // Title of story
        "guid": guid,       // Google News GUID
        "body": body,       // Body of story
        "pubDate": pubDate, // Google News pubDate
        "link": link,       // Original URL
        "img": img,         // Image URL
        "error": true,      // Error
        "wordBank": wordBank
    }
}

const getOldestStoryFromSQL = async () => {

    let story = Story();
    
    try {
        // Find story with oldest time stamp
        // https://stackoverflow.com/questions/19827388/mysql-select-top-n-max-values
        var rows = await mysql.conn.query('select * from linksToProcess order by pubDate asc limit 1');

        if(rows.length > 0){
            story.guid = rows[0].guid;
            story.link = rows[0].link;
            story.pubDate = rows[0].pubDate;
        }

        // Delete oldest story
        if(story.guid) {
            await mysql.conn.query('delete from linksToProcess where guid = ?', [story.guid]);
        }

        story.error = false;
        
    }
    catch (ex) {
        console.log(ex);
    }

    return story;

}

const getOldestStoryFromFirestore = async () => {
    
    let story = Story();

    try {

        // Pull all links in the collection
        // https://stackoverflow.com/questions/59081736/synchronously-iterate-through-firestore-collection
        // https://stackoverflow.com/questions/53524187/query-firestore-database-on-timestamp-field
        const links = await db.collection("linksToProcess").get();

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

        if(oldestIndex != -1){
            
            story.link = links.docs[oldestIndex].data().url;
            story.guid = links.docs[oldestIndex].id;
            story.pubDate = oldestDate;
            
            // Delete document reference
            // https://stackoverflow.com/questions/47180076/how-to-delete-document-from-firestore-using-where-clause
            links.docs[oldestIndex].ref.delete();

            story.error = false;
        }

    } catch (error) {
        console.log(error);
        //throw error;
    }

    return story;
}

const summarizeStory = async (story) => {

    story.error = true;

    try {
        const response = await fetch(("http://api.smmry.com/&SM_API_KEY=" + config.smmry_key 
        /*+ "&SM_WITH_BREAK=true"*/ + "&SM_LENGTH=40" + "&SM_URL=" + story.link), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        // TODO: replace all double quotes with single quotes 
        const json = await response.json();
        console.log(json);
        
        if(!("sm_api_error" in json)){
            story.body = json.sm_api_content;
            story.title = json.sm_api_title;
            story.error = false;
        }
 
    } catch (error) {
        console.log(error);
        //throw error;
    }

    return story;
}

const getMostCommonWords = (sourceText) => {
    var wordCounts = { };
    var words = sourceText.split(/\b/);

    for(var i = 0; i < words.length; i++){
        // Count most common words
        // https://stackoverflow.com/questions/6565333/using-javascript-to-find-most-common-words-in-string
        wordCounts["_" + words[i]] = (wordCounts["_" + words[i]] || 0) + 1;
    }

    return wordCounts;
    
}

const thesaurusizeStory = (story) => {
    // account for most common words...
}

const thesaurusize = (sourceText) => {

    // TODO: Include credit at beginning of second paragraph
    // "According to <domain.com>, <first_sentence>."
    // "<first_sentence>, according to a new report from <domain.com> on <day_of_week>"
    // "Local outlet <domain.com> reported on <day_of_week> that <first_sentence>"
    // "Sources confirmed to <domain.com> that <first_sentence>"
    /*  if(sourceCited == false && words[i].includes("[BREAK]")){
            newSummary += words[i] + " According to a report by " + app.getDomain(url) + ",";
            sourceCited = true;
        }
    */

    var newSummary = ""
    var words = sourceText.split(/\b/);
    var tagger = new pos.Tagger();
    var newWords = [];
    var newWord = undefined;
    
    // Iterate through summary word for word
    for (i in words){
        
        newWord = undefined;
    
        // Identify POS of word
        var tag = tagger.tag([words[i]]);
        
        // If the word is not any kind of singular or plural PROPER NOUN
        // TODO: Possibly use https://www.npmjs.com/package/thesaurize instead
        if(tag[0][1].toLowerCase() != "NNP" && tag[0][1].toLowerCase() != "NNPS" && tag[0][1].toLowerCase() != "in"){
            
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

    return newSummary;
}

const spinStory = async(story) => {

    story.error = true;

    try {
        story.body = await spinner(story.body);
        story.error = false;
    }
    catch(ex){
        console.log(ex);
    }

    return story;
}

const spinner = async(sourceText) => {

    try {

        var request = "email_address=" + config.spinRewriter_email;
        request += "&api_key=" + config.spinRewriter_key;
        request += "&action=unique_variation";
        request += "&text=\"" + sourceText + "\"";
        //request += "&auto_sentences=true";
        //request += "&auto_paragraphs=true";
        //request += "&auto_new_paragraphs=true";
        request += "&reorder_paragraphs=true";
        request += "&use_only_synonyms=true";
        request += "&auto_sentence_trees=true";
        request += "&auto_protected_terms=true";
        request += "&nested_spintax=true"
    
        var response = await fetch("https://www.spinrewriter.com/action/api", {
            method: 'POST',
            body: request,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
        });
    
        // TODO: Account for API credential error
        const json = await response.json();
    
        return json.response;

    } catch(error) {
        throw(error);
    }
}

const saveSpunStoryToSQL = async(storyToSave) => {

    try {
    	var result = await mysql.conn.query('insert into spunStories (`guid`, `body`, `error`, `img`, `link`, `pubDate`, `title`) values (?,?,?,?,?,?,?)',
					    [storyToSave.guid, storyToSave.body, storyToSave.error, storyToSave.img, storyToSave.link, storyToSave.pubDate, storyToSave.title]);
	console.log(result);
    }
    catch (ex) {
	    console.log(ex);
	    console.log("sql insert error");
    }
}

(async() => {

    let newStory = Story();

    try {

        // Find oldest non-processed story and remove from database
        if(config.useSQL){
            newStory = await getOldestStoryFromSQL();
        }
        else {
            newStory = await getOldestStoryFromFirestore();
        }
        
        if(!newStory.error && newStory.link && newStory.link.length > 0){
            newStory = await summarizeStory(newStory);
        }

        /*
        if(!newStory.error && newStory.body && newStory.body.length > 0){
            newStory.wordBank = getMostCommonWords(newStory.body);
        }*/

        if(!newStory.error && newStory.title && newStory.title.length > 0){
            newStory.title = thesaurusize(newStory.title);
        }

        if(!newStory.error && newStory.body && newStory.body.length > 0){
            
            newStory = await spinStory(newStory);
        }

        if(!newStory.error){
            if(!config.useSQL) {
                // Populate to firestore db
                db.collection('spunStories').doc(newStory.guid).set(newStory);
            } else {
                await saveSpunStoryToSQL(newStory);
            }
            
        }
        
    } catch (ex) {
        console.log(ex);
    } 
    finally {
        if(config.useSQL && mysql.conn && mysql.conn.end) {
        mysql.conn.end(); }
    }

})();
