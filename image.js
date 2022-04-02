const axios = require('axios')
const fs = require('fs');
const config = require('./config')
const mysql = require('./dbcon.js'); // mysql object
const storyController = require('./storyController.js');

// create stream for logs
var stream = fs.createWriteStream("./logs/img-" + new Date().toISOString().substring(0, 10) + ".txt", {flags:'a'});

const url = "https://api.unsplash.com/search/photos?client_id=";

const getImage = async (sentence) => {

    try {

        var request = url + config.client_id + '&query=';

        words = sentence.split(" ");

        var i = 0;

        words.forEach(word => {
            // Add to request query
            request += word.toLowerCase(); // Handle unescaped characters and periods

            if(i + 1 < words.length){
                request += "+";
            }

            i++;

        });

        console.log(request);

        stream.write("image.js querying Unsplash web service");

        const response = await axios.get(request);

        console.log(response.data);
        
        return response.data.results[0].urls.small;

    } catch (error) {
        stream.write("image.js other exception during Unsplash query");
        stream.write(error.message);
        stream.write(error.stack);

        console.log(error);
        return "https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=max&w=800&q=80";
    }
    
}

let statusEnum = config.statusEnum;

(async() => {

    stream.write("initiating process\n");

    // get oldest story with status = 2 or status = 4 and img = null
    let selectOldestStoryStatement = 'select Story.id, storyContent.sm_api_title from Story join storyContent on Story.id = storyContent.id where (status = ? or status = ?) and img is null order by Story.id asc limit 1';
    
    stream.write("creating transaction to retrieve story and update with image\n");

    await mysql.conn.beginTransaction();

    try {

        stream.write("querying for oldest SMMRY/GPT processed story without an img value");

        var rows = await mysql.conn.query(selectOldestStoryStatement, [statusEnum.smmry, statusEnum.gpt]);

        // get title and id
        var id = rows[0].id;
        var sm_api_title = rows[0].sm_api_title;

        stream.write("retrieved sm_api_title from db");

        // get sm_api_content as array of sentences
        //var sm_api_content = rows[0].sm_api_content.split("[BREAK]").map(element => {
        //    return element.trim();
        //});

        // find most common words using storyController i guess
        //const sc = storyController;
        //let words = sc.findMostCommonWords(sm_api_content);
        //let tagline = sc.findBestSentence(sm_api_content, words);

        // Sory by word frequency
        // https://stackoverflow.com/questions/1069666/sorting-object-property-by-values
        // let wordsSorted = Object.keys(words).sort(function(a,b){return words[b]-words[a]});

        //console.log(wordsSorted);

        stream.write("querying UNSPLASH image web service");

        // get image
        let img = await getImage(sm_api_title);
        
        stream.write("about to update storycontent table with img value");

        // update storycontent
        let updateStoryContentWithImgStatement = 'update storyContent set img = ? where id = ?';

        await mysql.conn.query( updateStoryContentWithImgStatement, [img, id] );

        mysql.conn.commit();

    } catch(exception)
    {
        stream.write("exception during process: \n");
        stream.write(exception.message + "\n");
        stream.write(exception.stack+ "\n");

        stream.write("rolling back sql transaction");

        await mysql.conn.rollback();

        console.log(exception)
    }
    finally {
        if(mysql.conn && mysql.conn.end) {
            mysql.conn.end(); }

        stream.end("Process completed");
    }
    
    

})();
