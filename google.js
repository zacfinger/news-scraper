// https://stackoverflow.com/questions/7806200/what-to-use-now-google-news-api-is-deprecated

let Parser = require('rss-parser');
let parser = new Parser();
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
 
(async () => {
 
  let feed = await parser.parseURL('https://news.google.com/rss');
  //let feed = await parser.parseURL('https://news.google.com/rss/search?q=coronavirus');
  let stories = [];
 
  feed.items.forEach(item => {
    
    var dom = new JSDOM(item.content);
    
    var links = dom.window.document.querySelectorAll('a');
    
    var headlines = [];

    for (var i = 0; i < links.length; i++){
        var title = links[i].textContent;
        headlines.push(links[i].textContent);
    }

    stories.push(headlines);
  
  });

  console.log(stories);
 
})();