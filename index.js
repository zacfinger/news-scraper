const axios = require('axios');

(async () => {
  try {
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/item/23304442.json?print=pretty')
    console.log(response.data.url);
    console.log(response.data);
  } catch (error) {
    console.log(error.response.body);
  }
})();