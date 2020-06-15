// https://levelup.gitconnected.com/web-scraping-with-node-js-c93dcf76fe2b
// https://blog.bitsrc.io/https-blog-bitsrc-io-how-to-perform-web-scraping-using-node-js-5a96203cb7cb
// https://stackoverflow.com/questions/49432579/await-is-only-valid-in-async-function

const siteUrl = "https://www.alexa.com/topsites/category/Top/News";
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require('fs');

let sites = [];

const fetchData = async () => {
  const result = await axios.get(siteUrl);
  return cheerio.load(result.data);
};

const getResults = async () => {
    const $ = await fetchData();
    $(".DescriptionCell").each((index, element) => {
        sites.push($(element).text().trim().toLowerCase())
        
    });

    return sites;
};

// Eventually need to save data in FireBase DB
// https://firebase.google.com/docs/database/admin/save-data
(async () => {
    let results = await getResults()
    let jsonString = JSON.stringify(results);
    fs.writeFileSync('sites.json', jsonString, 'utf-8');
})()