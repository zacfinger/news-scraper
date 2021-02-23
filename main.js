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
const image = require('./image');

// Instantiate dependency objects
// Later load conditionally based on config
let mysql = null; // mysql object
let admin = null; // Firestore objects
let serviceAccount = null;
let db = null;

// Conditionally load dependencies
if (config.useSQL) {
    mysql = require('./dbcon.js');

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
const Story = ( title = null, 
                guid = null, 
                body = null, 
                pubDate = null, 
                link = null, 
                img = null, 
                wordBank = null, 
                wordCount = null, 
                slug = null, 
                tagline = null) => {
    return {
        "title": title,     // Title of story
        "guid": guid,       // Google News GUID
        "body": body,       // Body of story
        "pubDate": pubDate, // Google News pubDate
        "link": link,       // Original URL
        "img": img,         // Image URL
        "error": true,      // Error
        "wordBank": wordBank,
        "wordCount": wordCount,
        "slug": slug,
        "tagline": tagline
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
        // https://stackoverflow.com/questions/50224638/order-firestore-data-by-timestamp-in-ascending-order
        // https://stackoverflow.com/questions/54666556/get-first-element-from-collection-and-delete-it
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
        const response = await fetch(("https://api.smmry.com/&SM_API_KEY=" + config.smmry_key 
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
            story.slug = json.sm_api_title.toLowerCase().split(" ").join("-");
            story.error = false;
        }
 
    } catch (error) {
        console.log(error);
        //throw error;
    }

    return story;
}

const thesaurusizeStory = (story) => {
    // account for most common words...
}

const thesaurusize = (sourceText) => {

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
        
        // If the word is any kind of ADVERB or ADJECTIVE
        // TODO: Possibly use https://www.npmjs.com/package/thesaurize instead
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

    // TODO: & can mess up summaries
    sourceText = sourceText.split("&").join("and");

    try {

        var request = "email_address=" + config.spinRewriter_email;
        request += "&api_key=" + config.spinRewriter_key;
        request += "&action=unique_variation";
        request += "&text=\"" + sourceText + "\"";

        // Spin (shorten) entire sentences/paragraphs
        // Mixed luck with these settings...comment out for now
        //request += "&auto_sentences=true";
        //request += "&auto_paragraphs=true";
        
        // Randomize order of paragraphs
        request += "&reorder_paragraphs=true";

        // When set to 'true' the spun texts become almost unreadable
        request += "&use_only_synonyms=false";

        // Change sentence structure
        request += "&auto_sentence_trees=true";

        // Will not spin capitalized words
        // "University of Arizona" -> "College of Arizona"
        request += "&auto_protected_terms=true";

        // Two levels of spinning
        request += "&nested_spintax=true";

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

        if(config.queryUnsplash && !newStory.error && newStory.slug && newStory.slug.length > 0){
            newStory.img = await image.getImage(newStory.slug.split("-"));
        }
	    else {
	        newStory.img = 'https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=max&w=800&q=80';
	    }

        if(!newStory.error && newStory.title && newStory.title.length > 0){
            newStory.title = thesaurusize(newStory.title);
            //newStory.body = thesaurusize(newStory.body);
        }
        
        if(!newStory.error && newStory.body && newStory.body.length > 0){
            
            newStory.tagline = app.getBestSentence(newStory.body);

        }

        if(!newStory.error && newStory.body && newStory.body.length > 0){
            
            newStory = await spinStory(newStory);
        }

        // TODO: Provide credit in story
        // Locate news source in story if possible, i.e.:
        // Locate index of the string: "...sources told CNN."
        // Link to story from the noun
        // If source not found:
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

        if(!newStory.error){

            console.log(newStory);

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
