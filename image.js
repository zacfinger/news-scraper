const config = require("./config")
const axios = require('axios')

const url = "https://api.unsplash.com/search/photos?client_id=";

const getImage = async (words) => {

    try {

        var request = url + config.client_id + '&query=';

        for(let i = 0; i < words.length; i++) {
            request += words[i];

            if(i + 1 < words.length){
                request += "+";
            }
        }

        const response = await axios.get(request);
        
        return response.data.results[0].urls.small;

    } catch (error) {
        
        console.log(error);
        return "https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=max&w=800&q=80";
    }
    
}

module.exports.getImage = getImage;