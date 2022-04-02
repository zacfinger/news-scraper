// https://stackoverflow.com/questions/42684177/node-js-es6-classes-with-require

const Story = require('./story');
const db = require('./db');

const getStoryId = (pubDate) => {
    // convert to unix time
    var time = (pubDate.valueOf() / 1000);
    // use equation derived from linear regression of IDs against unix times
    var id = -37493680.37 + (0.05008 * time);
    return Math.round(id);
}

const findMostCommonWords = (sentences) => {

    let words = {};

    if(sentences != null && sentences.length > 0){

        sentences.forEach((sentence) => {
            sentence.split(" ").map((word) => {
                // TODO: Opportunity to optimize
                // Count most common words, accounting for caps/lowercase
                // https://stackoverflow.com/questions/6565333/using-javascript-to-find-most-common-words-in-string
                // TODO: Need to account for possessive, i.e. "Trump's" 
                // TODO: Need to account for punctuation i.e. "COVID, vs. COVID"
                // TODO: Use POS to exclude articles, pronouns, prepositions, words like "is" and "and"
                words["_" + word.toLowerCase()] = (words["_" + word.toLowerCase()] || 0) + 1;
    
            });
        });

    }

    return words;

}

const findBestSentence = (sentences, words) => {

    var sentenceIdx = -1;

    if(words != null && Object.keys(words).length > 0 && sentences != null && sentences.length > 0){

        sentenceIdx = 0;
        var maxSentenceLength = 0;
        var idxOfMaxSentenceLength = 0;

        sentences.forEach((sentence) => {

            sentence = sentence.trim();

            let points = 0;
            
            // iterate over each word in sentence
            sentence.split(" ").map((word) => {
                let temp = words["_" + word.toLowerCase()]; 

                // Protect against words not found because 
                // sentence boundary unclear, usually acronyms or quotes
                if(isNaN(temp)){
                    //console.log("Word not found in wordbank...")
                    //console.log(word);
                    temp = 0;
                }

                points += temp;
            });

            if(points >= maxSentenceLength)
            {
                maxSentenceLength = points;
                idxOfMaxSentenceLength = sentenceIdx;
                console.log(idxOfMaxSentenceLength);
            }

            sentenceIdx++;
        })

    }

    
    return sentences[idxOfMaxSentenceLength];
}

const insertStory = async (story) => {

    story.id = getStoryId(story.pubDate);
    var storyInserted = false;
    
    while(!storyInserted) {
        storyInserted = await db.insert("stories", story);

        if(!storyInserted){
            story.id++;
        }
    }
}

module.exports.findMostCommonWords = findMostCommonWords;
module.exports.findBestSentence = findBestSentence;