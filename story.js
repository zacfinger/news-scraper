module.exports = class Story {

    constructor()
    {
        // Use story objects with members URL, summary etc
        this.link = "";              // Original URL
        this.guid = "";              // Google News GUID
        this.pubDate = new Date();   // Google News pubDate
        this.error = false;          // Error
        this.content = "";           // Body of story
        this.title = "";             // Title of story
        this.sentences = [];         // Array of each sentence 
                                    // in the story as an element
        this.words = {};             // Word bank to store 
                                    // frequency of each word
        this.tagline = "";           // Most valuable sentence in story
        this.slug = "";              // Slug of article
        this.img = "";               // Image URL
        this.domain = "";            // Domain of story
    }

    ///////////////////////////////////////////////////////
    // Resources:
    // http://thenodeway.io/posts/designing-custom-types/
    // https://stackoverflow.com/questions/52917012/fill-an-array-with-class-instances
    // https://stackoverflow.com/questions/3541348/javascript-how-do-you-call-a-function-inside-a-class-from-within-that-class

    // Receives as an argument any URL string in any format
    // Returns a stripped domain of the format "domain.com"
    // If no argument is provided the story link member will be used
    findDomain(url) {

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

    // Sets words member to object with keys for each word in content member
    // The value of each key is the count of the word 
    findMostCommonWords() {

        this.words = {};

        if(this.content != null && this.content.length > 0){

            this.content.split(" ").map((word) => {

                // Count most common words, accounting for caps/lowercase
                // https://stackoverflow.com/questions/6565333/using-javascript-to-find-most-common-words-in-string
                // TODO: Need to account for possessive, i.e. "Trump's" 
                // TODO: Need to account for punctuation i.e. "COVID, vs. COVID"
                // TODO: Use POS to exclude articles, pronouns, prepositions, words like "is" and "and"
                this.words["_" + word.toLowerCase()] = (this.words["_" + word.toLowerCase()] || 0) + 1;

            });

        } else if (this.sentences != null && this.sentences.length > 0) {
            this.sentences.forEach((sentence) => {
                sentence.split(" ").map((word) => {
                    // TODO: Opportunity to optimize
                    this.words["_" + word.toLowerCase()] = (this.words["_" + word.toLowerCase()] || 0) + 1;
        
                });
            });
        }
    }

    // Sets tagline to "best" sentece based on which 
    // has the most amount of "high value" words
    // as determined by word frequency
    findBestSentence() {

        if(!this.words || Object.keys(this.words).length == 0) {
            this.findMostCommonWords();
        }

        //console.log(words);

        if(!this.sentences || this.sentences.length == 0) {

            this.generateSentencesFromContent();

        }

        let rankings = {};

        this.sentences.forEach((sentence) => {

            sentence = sentence.trim();

            let points = 0;
            
            sentence.split(" ").map((word) => {
                let temp = this.words["_" + word.toLowerCase()]; 

                // Protect against words not found because 
                // sentence boundary unclear, usually acronyms or quotes
                if(isNaN(temp)){
                    //console.log("Word not found in wordbank...")
                    //console.log(word);
                    temp = 0;
                }

                points += temp;
            });

            rankings[sentence] = points;
        })

        //console.log(rankings);
        
        // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
        let keysSorted = Object.keys(rankings).sort(function(a,b){return rankings[b]-rankings[a]})

        this.tagline = keysSorted[0];
    }

    generateSentencesFromContent() {
        if(this.content != null && this.content.length > 0) {
            this.sentences = [];
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

              this.sentences = result.split("\r");
        }
    }

    generateContentFromSentences() {
        if(this.sentences != null && this.sentences.length > 0) {
            this.setContent(this.sentences.join(" "));
        }
        
    }

    insertSentence(index, sentence) {
        if(this.sentences != null && this.sentences.length > index) {
            // https://stackoverflow.com/questions/586182/how-to-insert-an-item-into-an-array-at-a-specific-index-javascript
            this.sentences.splice(index, 0, sentence);
        }
    } 

    removeSentence(index) {
        
        var sentence = "";

        if(this.sentences != null && this.sentences.length > index) {
            // TODO: consider using "Shift"
            // https://www.w3schools.com/jsref/jsref_shift.asp
            sentence = this.sentences[index];
            this.sentences.splice(index, 1);
        }

        return sentence;
    }

    setError(bool) {
        this.error = bool;
    }

    isError() {
        return this.error;
    }

    setLink(string) {
        this.link = string;
    };

    getLink() {
        return this.link;
    }

    setGuid(string) {
        this.guid = string;
    }

    getGuid() {
        return this.guid;
    }

    setPubDate(date) {
        this.pubDate = date;
    }

    getPubDate() {
        return this.pubDate;
    }

    setContent(string) {
        this.content = string;
    }

    getContent() {
        return this.content;
    }

    setTitle(string) {
        this.title = string;
    }

    getTitle() {
        return title;    
    }

    setSlug(string) {
        slug = this.string;
    }

    getSlug() {
        return this.slug;
    }

    setSentences(array) {

        for(var i = 0; i < array.length; i++){
            array[i] = array[i].trim();
        }

        this.sentences = array;
    }

    getSentences() {
        return this.sentences;
    }

    setImage(string) {
        this.img = string;
    }

    getImage() {
        return this.img;
    }

    setTagline(string) {
        this.tagline = string;
    }

    getTagline() {
        if(!this.tagline || this.tagline.length == 0) {
            this.findBestSentence();
        }
        return this.tagline;
    }

    getDomain() {
        
        if(!this.domain || this.domain.length == 0){
            this.findDomain();
        }
        return this.domain;
    }

    getMostCommonWords() {

        if(!this.words || Object.keys(this.words).length == 0){
            this.findMostCommonWords();
        }
    
        return this.words;
    }
    
    
}