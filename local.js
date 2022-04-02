// Pulls news items from Google News RSS feed
// Stores data in Story table of news_db database
/**
 * id
 * status (1 = Initial, 2 = , 3 = etc)
 * isoDate 
 * link 
 * */

// Load config settings
const config = require('./config');

// file system
const fs = require('fs');

// create stream for logs
// source: https://stackoverflow.com/questions/3459476/how-to-append-to-a-file-in-node/43370201#43370201
// accessed: 2022-04-01
var stream = fs.createWriteStream("./logs/" + new Date().toISOString().substring(0, 10) + ".txt", {flags:'a'});

// Require RSS dependency
let Parser = require('rss-parser');
let parser = new Parser();

// Instantiate dependency objects
// Later load conditionally based on config
let mysql = require('./dbcon.js'); // mysql object

// Generate story Id based on datetime of story
const getStoryId = (pubDate) => {
    // convert to unix time
    let time = (pubDate.valueOf() / 1000);
    // Derived from finding linear regression curve of datetime 
    // as a function of wfxg.com story Id # (y) in day of year 2020 (x) 
    let id = -37493680.37 + (0.05008 * time);
    return Math.round(id);
}

// Defined in table news_db.Status
let statusEnum = config.statusEnum;

// Main
(async() => {

    // log everything
    stream.write("google.js main subroutine initialized" + "\n");

    // Only save stories returned from the Google RSS feed after dateOfLastStory
    // Default date Nullember 1, 2022 is used if no data exists in Story table
    var dateOfLastStory = new Date(2022,0,1);
    
    try 
    {
        // Get datetime of most recent entry in stories if exists
        let selectMaxDateTimeFromStory = 'select max(isoDate) as maxDateTime from Story';

        stream.write("google.js querying database of max(isoDate) from Story\n");
        
        // Make the query
        var rows = await mysql.conn.query(selectMaxDateTimeFromStory);

        var maxDateTime = rows[0]['maxDateTime'];

        if(maxDateTime != null)
        {
            dateOfLastStory = maxDateTime;
            stream.write("google.js query was successful\n");
        }

    } 
    catch (ex)
    {
        stream.write("google.js exception\n");
        console.log(ex);
    }
    
    try{

        stream.write("google.js querying Google News RSS for latest headlines\n");

        // Pull local headlines
        let feed = await parser.parseURL('https://news.google.com/rss/search?q=' + config.locale);

        // Ref: https://stackoverflow.com/questions/48755711/force-loop-to-wait-for-mysql-insert-before-moving-to-next-iteration
        // Accessed: 2022-01-16
        for (let item of feed.items) {

            let isoDate = new Date(item.isoDate);

            stream.write("google.js calculating story id for story\n");

            var id = getStoryId(isoDate);

            // If the news item was published after the last story
            // Copy information to database
            if (isoDate > dateOfLastStory) {

                stream.write("google.js creating transaction to insert story\n");

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
                                stream.write("google.js other exception during story insert: \n");
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
                        stream.write("google.js preparing to insert into storyContent\n");

                        // record 
                        let result = await mysql.conn.query(
                            'insert into storyContent (`id`, `gn_rss_title`, `gn_rss_guid`) values (?, ?, ?)',
                            [id, item.title, item.guid]);
                        console.log(result);

                        await mysql.conn.commit();

                        stream.write("google.js transaction successfully committed");
                    }
                    else
                    {
                        stream.write("google.js rolling back transaction to insert story");
                        await mysql.conn.rollback();
                    }

                } catch (ex)
                {
                    await mysql.conn.rollback();
                }

            }
        }
    }
    finally
    {
        if(mysql.conn && mysql.conn.end) {
        mysql.conn.end(); }
    }
    
})();

