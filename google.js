// Pulls news items from Google News RSS feed
// Stores data in Story table of news_db database
/**
 * id
 * status (1 = Initial, 2 = , 3 = etc)
 * isoDate 
 * link 
 * */
// https://stackoverflow.com/questions/7806200/what-to-use-now-google-news-api-is-deprecated

// Instantiate dependency objects
const fs = require('fs'); // file system
const mysql = require('./dbcon.js'); // mysql object
const storyController = require('./storyController.js');

// Require RSS dependency
let Parser = require('rss-parser');
let parser = new Parser();

// create stream for logs
// source: https://stackoverflow.com/questions/3459476/how-to-append-to-a-file-in-node/43370201#43370201
// accessed: 2022-04-01
var stream = fs.createWriteStream("./logs/gg-" + new Date().toISOString().substring(0, 10) + ".txt", {flags:'a'});

// Load config settings
const config = require('./config');

// Defined in table news_db.Status
let statusEnum = config.statusEnum;
 
// Reads Google News RSS
// Returns list of stories
// Each story is a list of headlines
const getHeadlines = async (url) => {
 
  let feed = await parser.parseURL(url);
  let stories = [];
 
  feed.items.forEach(item => {

    var dom = new JSDOM(item.content);
    
    var links = dom.window.document.querySelectorAll('a');

    // Only process story if 
    // there is more than one headline
    // from which to generate headline
    // TODO: Test >2 because "View Full Coverage" link is sometimes included
    if(links.length > 1){

        var headlines = [];

        for (var i = 0; i < links.length; i++){
            var title = links[i].textContent;
            if(!title.includes("View Full Coverage")){
                headlines.push(links[i].textContent);

            }
        }

        stories.push(new Story());
        stories[stories.length - 1].setLink(item.link);
        stories[stories.length - 1].setSentences(headlines);

    }
  
  });
  
  return stories;
 
};

// Receives array of headlines as strings
// Returns dictionary with each word in the headlines as a key
// Value is an array containing each word that followed the key
// Duplicates are allowed in the array
// More common words will appear more than once
const createWordBank = (story) => {

    let wordBank = {}

    story.getSentences().forEach((headline) => {
        
        var prev_word = null;

        headline.split(" ").map((word) => {
            
            if(prev_word != null){
                wordBank[prev_word].push(word);
            }

            if(!(word in wordBank)){
                wordBank[word] = [];
            }
            
            prev_word = word;
        });
    });

    return wordBank;
}

const main = async () => {

    var url = 'https://news.google.com/rss'
    //var url = 'https://news.google.com/rss/search?q=coronavirus'

    let stories = await getHeadlines(url);

    stories.forEach((story) => {

        (async() => {

            let href = story.getLink();

            let words = story.getMostCommonWords();

            let firstWord = story.getTagline().split(" ")[0];
            let bank = createWordBank(story);
           
            // Sory by word frequency
            // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
            let wordsSorted = Object.keys(words).sort(function(a,b){return words[b]-words[a]});

            // Get image
            let img = "";

            if(config.queryUnsplash){
                img = await image.getImage([wordsSorted[0].substring(1), wordsSorted[1].substring(1)]);
            }

            let currentWord = firstWord;
            let headline = "";
            let wordCount = 0;

            while(bank[currentWord].length > 0){

                headline += currentWord + " ";
                wordCount += 1;
                currentWord = bank[currentWord][Math.floor(Math.random() * bank[currentWord].length)];

                // https://www.google.com/search?client=ubuntu&channel=fs&q=average+headline+length&ie=utf-8&oe=utf-8
                if(wordCount > 17){
                    break;
                }
            }

            headline += currentWord;

            // Save to db ...

            console.log(headline);
            console.log("--------------------------------");
        })();
    });
}

// Main
(async() => {

    // log everything
    stream.write("main subroutine initialized" + "\n");

    // Only save stories returned from the Google RSS feed after dateOfLastStory
    // Default date Nullember 1, 2022 is used if no data exists in Story table
    var dateOfLastStory = new Date(2022,0,1);
    
    try 
    {
        // Get datetime of most recent entry in stories if exists
        let selectMaxDateTimeFromStory = 'select max(isoDate) as maxDateTime from Story';

        stream.write("querying database of max(isoDate) from Story\n");
        
        // Make the query
        var rows = await mysql.conn.query(selectMaxDateTimeFromStory);

        var maxDateTime = rows[0]['maxDateTime'];

        if(maxDateTime != null)
        {
            dateOfLastStory = maxDateTime;
            stream.write("query was successful\n");
        }

    } 
    catch (ex)
    {
        stream.write("exception finding maxDateTime: \n");
        stream.write(ex.message + "\n");
        stream.write(ex.stack + "\n");
        
        console.log(ex);
    }
    
    try{

        stream.write("querying Google News RSS for latest headlines\n");

        // Pull local headlines
        let feed = await parser.parseURL('https://news.google.com/rss/search?q=' + config.locale);

        // Ref: https://stackoverflow.com/questions/48755711/force-loop-to-wait-for-mysql-insert-before-moving-to-next-iteration
        // Accessed: 2022-01-16
        for (let item of feed.items) {

            let isoDate = new Date(item.isoDate);

            let sc = storyController;
            var id = sc.getStoryId(isoDate);

            // If the news item was published after the last story
            // Copy information to database
            if (isoDate > dateOfLastStory) {

                stream.write("creating transaction to insert story\n");

                await mysql.conn.beginTransaction();

                try 
                {
                    let inserted = false;
                    let error = false;

                    while(!inserted && !error) 
                    {

                        // TODO: Check if item.link contains word in denylist
                        // TODO: Account for multiple stories in <ol> tag in description
                        try 
                        {		
                            let result = await mysql.conn.query(
                                'insert into Story (`id`, `status`, `link`, `isoDate`) values (?, ?, ?, ?)',
                                [id, statusEnum.initial, item.link, isoDate]);
                            inserted = true;
                        }
                        catch(ex) 
                        {
                            // if duplicate primary key
                            // this is to maintain the primary ID consistent with getStoryId()
                            // if more than one story exists per datetime HH:mm:ss
                            if(ex.errno == 1062 && ex.sqlMessage.endsWith('for key \'Story.PRIMARY\''))
                            {
                                console.log(ex);
                                id++;
                            }
                            else
                            {
                                stream.write("other exception during story insert: \n");
                                stream.write(ex.message);
                                stream.write(ex.stack);

                                // TODO: Account for other exceptions besides duplicate primary key
                                console.log(ex);
                                error = true;
                            }
                        }
                    }

                    if(inserted)
                    {
                        stream.write("preparing to insert into storyContent\n");

                        // record 
                        let result = await mysql.conn.query(
                            'insert into storyContent (`id`, `gn_rss_title`, `gn_rss_guid`) values (?, ?, ?)',
                            [id, item.title, item.guid]);
                        console.log(result);

                        await mysql.conn.commit();

                        stream.write("transaction successfully committed");
                    }
                    else
                    {
                        stream.write("rolling back transaction because story insert failed before storycontent insert\n");
                        await mysql.conn.rollback();
                    }

                } catch (ex)
                {
                    stream.write("other exception during transaction: \n");
                    stream.write(ex.message);
                    stream.write(ex.stack);
                    await mysql.conn.rollback();
                }

                break;
            }
        }
    }
    catch (ex)
    {
        stream.write("other exception during process: \n");
        stream.write(ex.message);
        stream.write(ex.stack);
    }
    finally
    {
        if(mysql.conn && mysql.conn.end) {
            mysql.conn.end();
        }

        stream.end("Process completed");
    }
    
})();