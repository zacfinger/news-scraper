const axios = require('axios');

(async () => {
  try {
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty')
    
    for(var post=0; post < 30; post++){
        
        (async () => {
            try {
                const story = await axios.get('https://hacker-news.firebaseio.com/v0/item/' + response.data[post] + '.json?print=pretty')
                console.log(story.data.title);
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