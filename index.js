const newsScraperCredentials = require('./news-scraper-credentials');
const fs = require('fs');
const axios = require('axios');
const admin = require('firebase-admin');

let serviceAccount = require(newsScraperCredentials.jsonPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

let db = admin.firestore();

// Get sites
// https://stackabuse.com/reading-and-writing-json-files-with-node-js/
// need to check if JSON file exists and create it if not
let rawdata = fs.readFileSync('sites.json');
let sites = JSON.parse(rawdata);

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

  if(sites.includes(url)){
    //console.log(url);
    return true;
  }
  return false;
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
                    if(getDomain(story.data.url)){
                      
                      let docRef = db.collection('links').doc();

                      let setAda = docRef.set({
                        title: story.data.title,
                        url: story.data.url
                      });

                      console.log(story.data.title);
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