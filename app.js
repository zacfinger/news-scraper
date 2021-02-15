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

module.exports.getDomain = getDomain;
module.exports.getMostCommonWords = getMostCommonWords;