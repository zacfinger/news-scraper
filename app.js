// Receives as an argument any URL string in any format
// Returns a stripped domain of the format "domain.com"
const getDomain = (url) => {

    var n = url.indexOf("//");
  
    if (n != -1){
        url = url.substring(n + 2);
        n = url.indexOf("www");
        if(n != -1){
            url = url.substring(n + 4);
        }
    }

  n = url.indexOf("/");
  if(n != -1){
        url = url.substring(0, n);
  }

  return url;
}

// Returns object with keys for each word in provided sourceText
// The value of each key is the count of the word in the provided sourceText
const getMostCommonWords = (sourceText) => {
    var wordCounts = { };
    
    sourceText.split(" ").map((word) => {

        // Count most common words, accounting for caps/lowercase
        // https://stackoverflow.com/questions/6565333/using-javascript-to-find-most-common-words-in-string
        // TODO: Need to account for possessive, i.e. "Trump's" 
        // TODO: Need to account for punctuation i.e. "COVID, vs. COVID"
        // TODO: Use POS to exclude articles, pronouns, prepositions, words like "is" and "and"
        wordCounts["_" + word.toLowerCase()] = (wordCounts["_" + word.toLowerCase()] || 0) + 1;

    });

    return wordCounts;
    
}

// receives string of text instead of array
// and splits into array of sentences
const getBestSentence = (sourceText) => {

    let words = getMostCommonWords(sourceText);

    // Split source text into array of sentences
    // https://stackoverflow.com/questions/11761563/javascript-regexp-for-splitting-text-into-sentences-and-keeping-the-delimiter
    // https://stackoverflow.com/questions/40958101/js-split-text-into-sentences
    // TODO: Sentence splitting method impacts accuracy of sentence rankings
    let story = sourceText.match(/[^\.!\?]+[\.!\?]+["']?|.+$/g)

    return getBestSentenceFromArray(story, words);
}

// Receives array of sentences as strings
// Returns "best" sentece based on which 
// has the most amount of "high value" words
// as determined by word frequency
const getBestSentenceFromArray = (story, words) => {

    let rankings = {};

    story.forEach((headline) => {

        headline = headline.trim();

        let points = 0;
        
        headline.split(" ").map((word) => {
            let temp = words["_" + word.toLowerCase()]; 

            // Protect against words not found because 
            // sentence boundary unclear, usually acronyms or quotes
            if(isNaN(temp)){
                console.log(word);
                console.log(words);
                temp = 0;
            }

            points += temp;
        });

        rankings[headline] = points;
    })

    console.log(rankings);
    
    // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
    let keysSorted = Object.keys(rankings).sort(function(a,b){return rankings[b]-rankings[a]})

    return keysSorted[0];
}

module.exports.getDomain = getDomain;
module.exports.getMostCommonWords = getMostCommonWords;
module.exports.getBestSentence = getBestSentence;
module.exports.getBestSentenceFromArray = getBestSentenceFromArray;