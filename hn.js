const config = require('./config');
const fs = require('fs');
const axios = require('axios');
const admin = require('firebase-admin');
const app = require('./app');

let serviceAccount = require(config.jsonPath);

// Check if app already initialized
// https://stackoverflow.com/questions/57763991/initializeapp-when-adding-firebase-to-app-and-to-server
if (!admin.apps.length){
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

let db = admin.firestore();

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
                    if(sites.includes(app.getDomain(story.data.url))){
                      
                      let docRef = db.collection('links').doc(story.data.id.toString());

                      let setStory = docRef.set({
                        title: story.data.title,
                        url: story.data.url,
                        id: story.data.id,
                        time: story.data.time
                      });
                      console.log(story.data.id);
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