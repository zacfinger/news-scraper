const fs = require('fs');
const axios = require('axios');

// Get sites
// https://stackabuse.com/reading-and-writing-json-files-with-node-js/
/*let rawdata = fs.readFileSync('sites.json');
let student = JSON.parse(rawdata);
console.log(sites);*/

function getDomain(url){
  
  var n = url.indexOf("//");
  
  if (n != -1){
    url = url.substring(n + 2);
    n = url.indexOf("www");
    if (n != -1){
      url = url.substring(n + 4);
    }
  }

  n = url.indexOf("/");
  if(n != -1){
    url = url.substring(0, n);
  }

  console.log(url);
    
}

(async () => {
  try {
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty')
    
    for(post in response.data){
        
        (async () => {
            try {
                const story = await axios.get('https://hacker-news.firebaseio.com/v0/item/' + response.data[post] + '.json?print=pretty')
                //console.log(story.data.url);
                //console.log(story.data.title);
                if (story.data.url != undefined){
                    getDomain(story.data.url);
                }
                
            }
            catch(error){
                console.log("Nested async error: " + error);
            }
        })();
        
    }

  } catch (error) {
    console.log(error + " something error happens");
  }
})();