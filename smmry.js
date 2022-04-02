// Require dependencies
const fetch = require("node-fetch");
const config = require('./config'); // Load config settings
const mysql = require('./dbcon.js'); // mysql object

let statusEnum = config.statusEnum;

(async() => {

    await mysql.conn.beginTransaction();

    try 
    {
        // retrieve oldest story with status = 1
        let selectOldestStoryStatement = 'select * from Story where status = ? order by isoDate asc limit 1';
            
        // Make the query
        var rows = await mysql.conn.query(selectOldestStoryStatement, [statusEnum.initial]);

        if(rows.length == 1)
        {
            var id = rows[0].id;
            var link = rows[0].link;

            console.log(link);

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

            console.log(json);
            
            if(!("sm_api_error" in json)){
                // TODO: account for other errors such as 404 etc
                
                // update storyContent 
                let sm_api_content = json.sm_api_content;
                let sm_api_character_count = json.sm_api_character_count;
                let sm_api_content_reduced = parseInt(json.sm_api_content_reduced);
                let sm_api_title = json.sm_api_title;

                let updateStoryContentStatement = 'update storyContent set sm_api_content = ?, sm_api_character_count = ?, sm_api_content_reduced = ?, sm_api_title = ? where id = ?';
            
                await mysql.conn.query( updateStoryContentStatement, [sm_api_content, sm_api_character_count, sm_api_content_reduced, sm_api_title, id] );

                // update Story with new status
                let updateStoryWithNewStatus = 'update Story set status = ? where id = ?';

                await mysql.conn.query( updateStoryWithNewStatus, [statusEnum.smmry, id] );
            }
            else 
            {
                // update Story table with error status
                let updateStoryWithErroStatusStatement = 'update Story set status = ? where id = ?';

                await mysql.conn.query( updateStoryWithErroStatusStatement, [statusEnum.smmryError, id] );

            }

        }

        await mysql.conn.commit();
    }
    catch (ex)
    {
        console.log(ex);
        await mysql.conn.rollback();
    }
    finally {
        if(mysql.conn && mysql.conn.end) {
            mysql.conn.end(); }
    }

})();