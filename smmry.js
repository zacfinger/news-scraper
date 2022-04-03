// smmry.js
// run chmod +x /path/to/smmry.js to make the script executable by cron

// Require dependencies
const fetch = require("node-fetch");
const config = require('./config'); // Load config settings
const mysql = require('./dbcon.js'); // mysql object
const fs = require('fs');
const storyController = require('./storyController.js');

// create stream for logs
var stream = fs.createWriteStream(config.pwd + "/logs/smmry-" + new Date().toISOString().substring(0, 10) + ".txt", {flags:'a'});

let statusEnum = config.statusEnum;

(async() => {

    stream.write("Beginning transaction for storyContent update\n");

    await mysql.conn.beginTransaction();

    try 
    {
        // retrieve oldest story with status = 1
        let selectOldestStoryStatement = 'select * from Story where status = ? order by id asc limit 1';
            
        stream.write("querying oldest story without being processed by SMMRY API\n");

        // Make the query
        var rows = await mysql.conn.query(selectOldestStoryStatement, [statusEnum.initial]);

        if(rows.length == 1)
        {
            var id = rows[0].id;
            var link = rows[0].link;

            stream.write("querying oldest story remaining to be processed by SMMRY API\n");

            // query API web service
            const response = await fetch(("https://api.smmry.com/&SM_API_KEY=" + config.smmry_key 
            + "&SM_WITH_BREAK=true" + "&SM_LENGTH=40" + "&SM_URL=" + link), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // TODO: replace all double quotes with single quotes 
            let json = await response.json();

            if(!("sm_api_error" in json)){
                // TODO: account for other errors such as 404 etc
                stream.write("summary retrieved, inserting into storyContent and updating Story\n");
                
                // retrieve JSON values for storyContent 
                let sm_api_content = json.sm_api_content;
                let sm_api_character_count = json.sm_api_character_count;
                let sm_api_content_reduced = parseInt(json.sm_api_content_reduced);
                let sm_api_title = json.sm_api_title;

                // get sm_api_content as array of sentences
                let sentences = sm_api_content.split("[BREAK]").map(element => {
                    return element.trim();
                });

                // find most common words using storyController i guess
                const sc = storyController;
                let words = sc.findMostCommonWords(sentences);
                let tagline = sc.findBestSentence(sentences, words);

                // update data in db
                let updateStoryContentStatement = 'update storyContent set sm_api_content = ?, sm_api_character_count = ?, sm_api_content_reduced = ?, sm_api_title = ?, tagline = ? where id = ?';
            
                await mysql.conn.query( updateStoryContentStatement, [sm_api_content, sm_api_character_count, sm_api_content_reduced, sm_api_title, tagline, id] );

                // update Story with new status
                let updateStoryWithNewStatus = 'update Story set status = ? where id = ?';

                await mysql.conn.query( updateStoryWithNewStatus, [statusEnum.smmry, id] );

                stream.write("Story and storyContent inserts successful\n");
            }
            else 
            {
                stream.write("received: " + json);
                console.log(json);

                // update Story table with error status
                let updateStoryWithErroStatusStatement = 'update Story set status = ? where id = ?';

                await mysql.conn.query( updateStoryWithErroStatusStatement, [statusEnum.smmryError, id] );

                stream.write("SMMRY API error recorded in Story table\n");

            }

        }

        await mysql.conn.commit();

        stream.write("SQL transaction committed\n");
    }
    catch (ex)
    {
        stream.write("other exception during story insert: \n");
        stream.write(ex.message);
        stream.write(ex.stack);

        console.log(ex);
        await mysql.conn.rollback();

        stream.write("Story and storyContent inserts successful\n");
    }
    finally {
        if(mysql.conn && mysql.conn.end) {
            mysql.conn.end(); }

        stream.end("Process completed\n");
    }

})();