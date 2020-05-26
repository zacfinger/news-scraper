// https://levelup.gitconnected.com/web-scraping-with-node-js-c93dcf76fe2b
// https://stackoverflow.com/questions/49432579/await-is-only-valid-in-async-function

const siteUrl = "https://www.alexa.com/topsites/category/Top/News";
const axios = require("axios");
const cheerio = require("cheerio");

const fetchData = async () => {
  const result = await axios.get(siteUrl);
  return cheerio.load(result.data);
};

const getResults = async () => {
    const $ = await fetchData();
    $(".DescriptionCell").each((index, element) => {
        console.log("Site: " + $(element).text());
    });
};

getResults();