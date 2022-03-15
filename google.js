// https://stackoverflow.com/questions/7806200/what-to-use-now-google-news-api-is-deprecated

const config = require('./config');
const axios = require('axios');
let Parser = require('rss-parser');
let parser = new Parser();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const Story = require('./story')
const image = require('./image');
 
// Reads Google News RSS
// Returns list of stories
// Each story is a list of headlines
const getHeadlines = async (url) => {
 
  let feed = await parser.parseURL(url);
  let stories = [];
 
  feed.items.forEach(item => {

    var dom = new JSDOM(item.content);
    
    var links = dom.window.document.querySelectorAll('a');

    // Only process story if 
    // there is more than one headline
    // from which to generate headline
    // TODO: Test >2 because "View Full Coverage" link is sometimes included
    if(links.length > 1){

        var headlines = [];

        for (var i = 0; i < links.length; i++){
            var title = links[i].textContent;
            if(!title.includes("View Full Coverage")){
                headlines.push(links[i].textContent);

            }
        }

        stories.push(new Story());
        stories[stories.length - 1].setLink(item.link);
        stories[stories.length - 1].setSentences(headlines);

    }
  
  });
  
  return stories;
 
};

// Receives array of headlines as strings
// Returns dictionary with each word in the headlines as a key
// Value is an array containing each word that followed the key
// Duplicates are allowed in the array
// More common words will appear more than once
const createWordBank = (story) => {

    let wordBank = {}

    story.getSentences().forEach((headline) => {
        
        var prev_word = null;

        headline.split(" ").map((word) => {
            
            if(prev_word != null){
                wordBank[prev_word].push(word);
            }

            if(!(word in wordBank)){
                wordBank[word] = [];
            }
            
            prev_word = word;
        });
    });

    return wordBank;
}

const main = async () => {

    var url = 'https://news.google.com/rss'
    //var url = 'https://news.google.com/rss/search?q=coronavirus'

    let stories = await getHeadlines(url);

    stories.forEach((story) => {

        (async() => {

            let href = story.getLink();

            let words = story.getMostCommonWords();

            let firstWord = story.getTagline().split(" ")[0];
            let bank = createWordBank(story);
           
            // Sory by word frequency
            // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
            let wordsSorted = Object.keys(words).sort(function(a,b){return words[b]-words[a]});

            // Get image
            let img = "";

            if(config.queryUnsplash){
                img = await image.getImage([wordsSorted[0].substring(1), wordsSorted[1].substring(1)]);
            }

            let currentWord = firstWord;
            let headline = "";
            let wordCount = 0;

            while(bank[currentWord].length > 0){

                headline += currentWord + " ";
                wordCount += 1;
                currentWord = bank[currentWord][Math.floor(Math.random() * bank[currentWord].length)];

                // https://www.google.com/search?client=ubuntu&channel=fs&q=average+headline+length&ie=utf-8&oe=utf-8
                if(wordCount > 17){
                    break;
                }
            }

            headline += currentWord;

            // Save to db ...

            console.log(headline);
            console.log("--------------------------------");
        })();
    });
}

module.exports.main = main;