// https://stackoverflow.com/questions/7806200/what-to-use-now-google-news-api-is-deprecated

let Parser = require('rss-parser');
let parser = new Parser();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
 
// Reads Google News RSS
// Returns list of stories
// Each story is a list of headlines
const getHeadlines = async (url) => {
 
  let feed = await parser.parseURL(url);
  let stories = [];
 
  feed.items.forEach(item => {
    
    var dom = new JSDOM(item.content);
    
    var links = dom.window.document.querySelectorAll('a');
    
    var headlines = [];

    for (var i = 0; i < links.length; i++){
        var title = links[i].textContent;
        if(!title.includes("View Full Coverage")){
            headlines.push(links[i].textContent);
        }
    }

    stories.push(headlines);
  
  });

  return stories;
 
};

// Receives array of headlines as strings
// Returns dictionary with words as keys
// And word count as values
const getMostCommonWords = (story) => {
    let words = {};

    story.forEach((headline) => {

        headline.split(" ").map((word) => {
            if(!(word in words)){
                words[""+word] = 1;
            }
            else{
                words[word] += 1;
            }
        });
    });

    return words;
}

const getBestHeadline = (story) => {

    let words = getMostCommonWords(story);

    let rankings = {};

    story.forEach((headline) => {

        let points = 0;
        
        headline.split(" ").map((word) => {
            points += words[word];  
        });

        rankings[headline] = points;
    })

    //console.log(rankings);

    // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
    let keysSorted = Object.keys(rankings).sort(function(a,b){return rankings[b]-rankings[a]})

    console.log(keysSorted[0]);
}

(async() => {

    var url = 'https://news.google.com/rss'
    //var url = 'https://news.google.com/rss/search?q=coronavirus'

    let stories = await getHeadlines(url);
    
    stories.forEach((story) => {

        getBestHeadline(story);
        
    });
})();
