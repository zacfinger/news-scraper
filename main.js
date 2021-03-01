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
const Story = require('./story'); // Common app functions
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

const getOldestStoryFromSQL = async () => {

    let story = new Story();
    story.setError(true);
    
    try {
        // Find story with oldest time stamp
        // https://stackoverflow.com/questions/19827388/mysql-select-top-n-max-values
        var rows = await mysql.conn.query('select * from linksToProcess order by pubDate asc limit 1');

        if(rows.length > 0){
            story.setGuid(rows[0].guid);
            story.setLink(rows[0].link);
            story.setPubDate(rows[0].pubDate);
        }

        // Delete oldest story
        if(story.getGuid() != null) {
            await mysql.conn.query('delete from linksToProcess where guid = ?', [story.getGuid()]);
        }

        story.setError(false);
        
    }
    catch (ex) {
        console.log(ex);
    }

    return story;

}

const getOldestStoryFromFirestore = async () => {
    
    let story = new Story();
    story.setError(true);

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
            
            story.setLink(links.docs[oldestIndex].data().url);
            story.setGuid(links.docs[oldestIndex].id);
            story.setPubDate(oldestDate);
            
            // Delete document reference
            // https://stackoverflow.com/questions/47180076/how-to-delete-document-from-firestore-using-where-clause
            links.docs[oldestIndex].ref.delete();

            story.setError(false);
        }

    } catch (error) {
        console.log(error);
        //throw error;
    }

    return story;
}

const summarizeStory = async (story) => {

    story.setError(true);

    try {
        const response = await fetch(("https://api.smmry.com/&SM_API_KEY=" + config.smmry_key 
        + "&SM_WITH_BREAK=true" + "&SM_LENGTH=40" + "&SM_URL=" + story.getLink()), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        // TODO: replace all double quotes with single quotes 
        const json = await response.json();
        
        if(!("sm_api_error" in json)){
            //story.setContent(json.sm_api_content.split("[BREAK]").join(""));
            story.setTitle(json.sm_api_title);
            // TODO: commas and other punctuation in titles included in slug
            story.setSlug(json.sm_api_title.toLowerCase().split(" ").join("-"));
            story.setSentences(json.sm_api_content.split("[BREAK]"));
            story.setError(false);
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

    story.setError(true);

    try {
        let body = await spinner(story.getContent());
        // https://stackoverflow.com/questions/19156148/i-want-to-remove-double-quotes-from-a-string/43220059
        body = body.replace(/^["'](.+(?=["']$))["']$/, '$1');
        story.setContent(body);
        story.setError(false);
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
        console.log(json);
    
        return json.response;

    } catch(error) {
        throw(error);
    }
}

const saveSpunStoryToSQL = async(storyToSave) => {

    try {
    	var result = await mysql.conn.query('insert into spunStories (`guid`, `body`, `error`, `img`, `link`, `pubDate`, `title`, `tagline`) values (?,?,?,?,?,?,?,?)',
					    [storyToSave.getGuid(), storyToSave.getContent(), storyToSave.isError(), storyToSave.getImage(), storyToSave.getLink(), storyToSave.getPubDate(), storyToSave.getTitle(), storyToSave.getTagline()]);
	console.log(result);
    }
    catch (ex) {
	    console.log(ex);
	    console.log("sql insert error");
    }
}

(async() => {

    let newStory = new Story();
    let indexOfTitle = -1;

    try {

        // Find oldest non-processed story and remove from database
        if(config.useSQL){
            newStory = await getOldestStoryFromSQL();
        }
        else {
            newStory = await getOldestStoryFromFirestore();
        }

        if(!newStory.isError() && newStory.getLink() != null && newStory.getLink().length > 0){
            newStory = await summarizeStory(newStory);
        }
        
        if(config.queryUnsplash && !newStory.isError() && newStory.getSlug() != null && newStory.getSlug().length > 0){
            // TODO: account for commas, colons etc
            var img = await image.getImage(newStory.getSlug().split("-"))
            newStory.setImage(img);
        }
	    else {
	        newStory.setImage('https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=max&w=800&q=80');
	    }

        if(!newStory.isError() && newStory.getTitle() != null && newStory.getTitle().length > 0){

            if(newStory.getSentences() != null && newStory.getSentences().length > 0) {

                // Check if title is in first sentence
                indexOfTitle = newStory.getSentences()[0].indexOf(newStory.getTitle());

                // If not, make it so
                if(indexOfTitle < 0){
                    newStory.insertSentence(0, (newStory.getTitle() + "."));
                    indexOfTitle = 0;
                }

            }
        }

        if(!newStory.isError() && newStory.getSentences() != null && newStory.getSentences().length > 0){
            
            newStory.generateContentFromSentences(); // still not sold on some of these function names
                                                     // and which class is responsible for what
                                                     // TODO: maybe getContent should generate content
                                                     // if content is empty
            newStory = await spinStory(newStory);
            
        }

        if(!newStory.isError() && newStory.getContent() != null && newStory.getContent().length > 0) {
            // reset sentences
            newStory.generateSentencesFromContent();
        }

        if(!newStory.isError() && indexOfTitle >= 0) {
            // remove first sentence from story
            var newTitle = newStory.removeSentence(0);

            // if new title == old title
            // // use thesaurusize

            // assign to title parameter
            newStory.setTitle(newTitle);

            // Reset content
            newStory.generateContentFromSentences()
            
        }
        else if (!newStory.isError() && indexOfTitle < 0 && 
                newStory.getTitle() != null && newStory.getTitle().length > 0){
            // Shouldn't ever really happen, but just in case...
            newStory.setTitle(thesaurusize(newStory.getTitle()));
        }

        if(!newStory.isError() && newStory.getContent() != null && newStory.getContent().length > 0){
            
            newStory.getTagline();

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

        if(!newStory.isError()){

            if(!config.useSQL) {

                // Firestore does not support objects with custom prototypes:
                // https://stackoverflow.com/questions/52221578/firestore-doesnt-support-javascript-objects-with-custom-prototypes
                var obj = {
                    "content": newStory.getContent(),
                    "img": newStory.getImage(),
                    "link": newStory.getLink(),
                    "pubDate": newStory.getPubDate(),
                    "slug": newStory.getSlug(),
                    "tagline": newStory.getTagline(),
                    "title": newStory.getTitle(),
                    "domain": newStory.getDomain()
                };

                // Populate to firestore db
                db.collection('spunStories').doc(newStory.getGuid()).set(obj);
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
