// https://stackoverflow.com/questions/42684177/node-js-es6-classes-with-require

const Story = require('./story');
const db = require('./db');

module.exports = function() {

    const getStoryId = (pubDate) => {
        // convert to unix time
        var time = (pubDate.valueOf() / 1000);
        // use equation derived from linear regression of IDs against unix times
        var id = -37493680.37 + (0.05008 * time);
        return Math.round(id);
    }

    const insertStory = (story) => {

        story.id = getStoryId(story.pubDate);
        var storyInserted = false;
        
        while(!storyInserted) {
            storyInserted = await db.insert("stories", story);

            if(!storyInserted){
                story.id++;
            }
        }
    }

}