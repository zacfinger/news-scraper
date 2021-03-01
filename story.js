module.exports = function () {

    // Use story objects with members URL, summary etc
    var link = "";              // Original URL
    var guid = "";              // Google News GUID
    var pubDate = new Date();   // Google News pubDate
    var error = false;          // Error
    var content = "";           // Body of story
    var title = "";             // Title of story
    var sentences = [];         // Array of each sentence 
                                // in the story as an element
    var words = {};             // Word bank to store 
                                // frequency of each word
    var tagline = "";           // Most valuable sentence in story
    var slug = "";              // Slug of article
    var img = "";               // Image URL
    var domain = "";            // Domain of story

    ///////////////////////////////////////////////////////
    // Resources:
    // http://thenodeway.io/posts/designing-custom-types/
    // https://stackoverflow.com/questions/52917012/fill-an-array-with-class-instances
    // https://stackoverflow.com/questions/3541348/javascript-how-do-you-call-a-function-inside-a-class-from-within-that-class

    // Receives as an argument any URL string in any format
    // Returns a stripped domain of the format "domain.com"
    // If no argument is provided the story link member will be used
    const findDomain = (url = link) => {

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

        domain = url;
    }

    // Sets words member to object with keys for each word in content member
    // The value of each key is the count of the word 
    const findMostCommonWords = () => {

        words = {};

        if(content != null && content.length > 0){

            content.split(" ").map((word) => {

                // Count most common words, accounting for caps/lowercase
                // https://stackoverflow.com/questions/6565333/using-javascript-to-find-most-common-words-in-string
                // TODO: Need to account for possessive, i.e. "Trump's" 
                // TODO: Need to account for punctuation i.e. "COVID, vs. COVID"
                // TODO: Use POS to exclude articles, pronouns, prepositions, words like "is" and "and"
                words["_" + word.toLowerCase()] = (words["_" + word.toLowerCase()] || 0) + 1;

            });

        } else if (sentences != null && sentences.length > 0) {
            sentences.forEach((sentence) => {
                sentence.split(" ").map((word) => {
                    // TODO: Opportunity to optimize
                    words["_" + word.toLowerCase()] = (words["_" + word.toLowerCase()] || 0) + 1;
        
                });
            });
        }
    }

    // Sets tagline to "best" sentece based on which 
    // has the most amount of "high value" words
    // as determined by word frequency
    const findBestSentence = () => {

        if(!words || Object.keys(words).length == 0) {
            findMostCommonWords();
        }

        //console.log(words);

        if(!sentences || sentences.length == 0) {

            this.generateSentencesFromContent();

        }

        let rankings = {};

        sentences.forEach((sentence) => {

            sentence = sentence.trim();

            let points = 0;
            
            sentence.split(" ").map((word) => {
                let temp = words["_" + word.toLowerCase()]; 

                // Protect against words not found because 
                // sentence boundary unclear, usually acronyms or quotes
                if(isNaN(temp)){
                    console.log("Word not found in wordbank...")
                    console.log(word);
                    temp = 0;
                }

                points += temp;
            });

            rankings[sentence] = points;
        })

        console.log(rankings);
        
        // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
        let keysSorted = Object.keys(rankings).sort(function(a,b){return rankings[b]-rankings[a]})

        tagline = keysSorted[0];
    }

    this.generateSentencesFromContent = () => {
        if(content != null && content.length > 0) {
            sentences = [];
            // Split source text into array of sentences
            // TODO: Sentence splitting method impacts accuracy of sentence rankings
            //       and can mess up formatting of sentences
            // TODO: Does not do well with acronyms ... "U.S., A.M., etc"
            //sentences = content.match(/[^\.!\?]+[\.!\?]+["']?|.+$/g)

            // https://stackoverflow.com/questions/11761563/javascript-regexp-for-splitting-text-into-sentences-and-keeping-the-delimiter
            // https://stackoverflow.com/questions/40958101/js-split-text-into-sentences
            // https://stackoverflow.com/questions/34784676/split-string-into-sentences-ignoring-abbreviations-for-splitting
            // https://stackoverflow.com/questions/27630408/js-regex-to-split-text-into-sentences
            var re = /\b(\w\.\ \w\.|\w\.\w\.)|([.?!])\s+(?=[A-Za-z])/g

            var result = content.replace(re, function(m, g1, g2){
                return g1 ? g1 : g2+"\r";
              });

            sentences = result.split("\r");
        }
    }

    this.generateContentFromSentences = () => {
        if(sentences != null && sentences.length > 0) {
            this.setContent(sentences.join(" "));
        }
        
    }

    this.insertSentence = (index, sentence) => {
        if(sentences != null && sentences.length > index) {
            // https://stackoverflow.com/questions/586182/how-to-insert-an-item-into-an-array-at-a-specific-index-javascript
            sentences.splice(index, 0, sentence);
        }
    } 

    this.removeSentence = (index) => {
        
        var sentence = "";

        if(sentences != null && sentences.length > index) {
            // TODO: consider using "Shift"
            // https://www.w3schools.com/jsref/jsref_shift.asp
            sentence = sentences[index];
            sentences.splice(index, 1);
        }

        return sentence;
    }

    this.setError = (bool) => {
        error = bool;
    }

    this.isError = () => {
        return error;
    }

    this.setLink = (string) => {
        link = string;
    };

    this.getLink = () => {
        return link;
    }

    this.setGuid = (string) => {
        guid = string;
    }

    this.getGuid = () => {
        return guid;
    }

    this.setPubDate = (date) => {
        pubDate = date;
    }

    this.getPubDate = () => {
        return pubDate;
    }

    this.setContent = (string) => {
        content = string;
    }

    this.getContent = () => {
        return content;
    }

    this.setTitle = (string) => {
        title = string;
    }

    this.getTitle = () => {
        return title;    
    }

    this.setSlug = (string) => {
        slug = string;
    }

    this.getSlug = () => {
        return slug;
    }

    this.setSentences = (array) => {

        for(var i = 0; i < array.length; i++){
            array[i] = array[i].trim();
        }

        sentences = array;
    }

    this.getSentences = () => {
        return sentences;
    }

    this.setImage = (string) => {
        img = string;
    }

    this.getImage = () => {
        return img;
    }

    this.setTagline = (string) => {
        tagline = string;
    }

    this.getTagline = () => {
        if(!tagline || tagline.length == 0) {
            findBestSentence();
        }
        return tagline;
    }

    this.getDomain = () => {
        
        if(!domain || domain.length == 0){
            findDomain();
        }
        return domain;
    }

    this.getMostCommonWords = () => {

        if(!words || Object.keys(words).length == 0){
            findMostCommonWords();
        }
    
        return words;
    }
    
    
}