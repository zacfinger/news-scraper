// 1. on the hour grab the stories on google news from the last hour and store in db
// 2. for each link stored
// // find oldest link in collection
// // grab summary from API
// // identify parts of speech
// // use thesaurus API
// // swap out ordering of clauses
// // post in DB
// // delete link
const fetch = require("node-fetch");
const config = require('./config');
const admin = require('firebase-admin');
var pos = require('pos');
var thesaurus = require("thesaurus");

let serviceAccount = require(config.jsonPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

var id = -1
var url = ""

const getURLofOldestStory = async () => {

    var oldestURL = ""

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
                id = links.docs[index].id;
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
        console.log(json);

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

    // TODO: Include credit at end of first sentence
    // For example "According to <domain.com>, <first_sentence>"
    // "<first_sentence>, according to a new report from <domain.com> on <day_of_week>"

    var newSummary = ""
    var words = sourceText.split(" ");
    var tagger = new pos.Tagger();
    var newWords = [];
    var newWord = undefined;
    var sourceCited = false;

    // Iterate through summary word for word
    for (i in words){

        if(sourceCited == false && words[i].includes("[BREAK]")){
            newSummary += words[i] + " According to a report by " + url + ",";
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

    // Find oldest non-processed story and remove from database
    url = await getURLofOldestStory();
    
    if(url.length > 0){
        summary = await getSummary(url);
    }

    if(summary.length > 0){
        summary = thesaurusize(summary);
    }
    
    console.log(summary);

})();