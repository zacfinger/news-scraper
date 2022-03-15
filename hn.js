const config = require('./config');
const fs = require('fs');
const axios = require('axios');
const Story = require('./story');

// Get sites
// https://stackabuse.com/reading-and-writing-json-files-with-node-js/
// need to check if JSON file exists and create it if not
let rawdata = fs.readFileSync('sites.json');
let sites = JSON.parse(rawdata);

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

                    let s = new Story();
                    s.setLink(story.data.url);
                    s.setTitle(story.data.title);

                    if(sites.includes(s.findDomain(story.data.url))){
                      
                      // log story in db with certain status
                      
                      console.log(s.findDomain(story.data.url) + " - " + story.data.title);
                      //console.log(story.data.id);
                    }
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