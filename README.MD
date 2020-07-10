# news-scraper

A set of tools to generate news headlines for an automated news blog

License: MIT

## google.js
Pulls top stories as groups of >=2 headlines from the [Google News RSS feed](https://news.google.com/rss) and uses naive Markov chaining to generate new headlines for each story. The top two words for each story (as measured by frequency) are then used to query an image from the [Unsplash API](https://unsplash.com/developers). The generated headline, the Unsplash image URL, and the related Google News URL are then populated in a Firestore database.

The Google News RSS feed groups sets of >= 2 headlines of a related story into `<item>` objects, which are pulled via the [RSS Parser](https://www.npmjs.com/package/rss-parser) package for Node. The `<description>` member of each `<item>` stores the headlines as `<a>` tags, which are themselves list items of an `<ol>` HTML entity. [JSDOM](https://github.com/jsdom/jsdom), a package for manipulating HTML elements in Node, is used to collect the `<a>` tags into an array via the familiar `querySelectorAll('a')` function. Each of the stories, and their constituent headlines, are stored in an array of arrays, like below:
```json
[

  [
    'Trump attacks his own CDC scientists over how to reopen schools safely',
    "No change to school reopening guidelines despite Pence's comment",
    'Biden will heed the CDC on reopening schools, his wife pledges',
    'Trump committed to helping Hispanics create prosperity through business, education | Opinion',
    'Trump is shouting for schools to reopen. He needs an actual strategy.'
  ],

  [
    'Fewer Americans may get a second stimulus check. What we know about the next round of payments',
    'GOP eyes narrowing second round of $1,200 stimulus payments',
    'Second Stimulus Check Update: Here’s Everything We Know Right Now',
    "Mnuchin says administration backs 'another round' of coronavirus stimulus checks",
    "Mnuchin wants 'another round' of stimulus checks passed this month"
  ],

  ...
  
]
```
Each headline within each story is iterated over, and each word within each headline is counted. A stochastic word model is created whereby each word is stored as a key in a dictionary object, with the corresponding value being an array of every subsequent word that appeared in the sample headlines. For example: 
```javascript
let bank = {

	Trump: [ 'attacks', 'committed', 'is' ],
	attacks: [ 'his' ],
	his: [ 'own', 'wife' ],
	own: [ 'CDC' ],
	CDC: [ 'scientists', 'on' ],
	scientists: [ 'over' ],
	over: [ 'how' ],
	how: [ 'to' ],
	to: [ 'reopen', 'school', 'helping', 'reopen.' ],
	reopen: [ 'schools' ],
	schools: [ 'safely', 'to' ],
	safely: [],
	No: [ 'change' ],
	change: [ 'to' ],
	school: [ 'reopening' ],
	reopening: [ 'guidelines', 'schools,' ],
	guidelines: [ 'despite' ],
	despite: [ "Pence's" ],
	"Pence's": [ 'comment' ],
	comment: [],
	Biden: [ 'will' ],
	will: [ 'heed' ],
	heed: [ 'the' ],
	the: [ 'CDC' ],
	on: [ 'reopening' ],
	'schools,': [ 'his' ],
	wife: [ 'pledges' ],
	pledges: [],
	committed: [ 'to' ],
	helping: [ 'Hispanics' ],
	Hispanics: [ 'create' ],
	create: [ 'prosperity' ],
	prosperity: [ 'through' ],
	through: [ 'business,' ],
	'business,': [ 'education' ],
	education: [ '|' ],
	'|': [ 'Opinion' ],
	Opinion: [],
	is: [ 'shouting' ],
	shouting: [ 'for' ],
	for: [ 'schools' ],
	'reopen.': [ 'He' ],
	He: [ 'needs' ],
	needs: [ 'an' ],
	an: [ 'actual' ],
	actual: [ 'strategy.' ],
	'strategy.': []
}
```
Each word is assigned a point value that is equivalent to the amount of times it appears in each of the headlines for each story. Each headline in the sample is ranked, with headlines weighed more heavily if they have a higher proporation of frequently appearing words. The first word of the highest ranked headline per story is used as the first word of the generated headlines. The next word in the headline is chosen from the array corresponding for that word, as below:
```javascript
while(bank[currentWord].length > 0){

	headline += currentWord + " ";
	
	currentWord = bank[currentWord][Math.floor(Math.random() * bank[currentWord].length)];

}
```
This generates, for example, headlines like:
* Trump is shouting for schools safely
* Jobless claims at better-than-expected 1.3 million, total getting benefits falls to surge as virus threatens hiring, economic uncertainty
* Asian stocks follow Wall St losses on economy worries on economy worries on economy worries on virus, economy worries

## index.js
Removes all "technical" headlines from the top current 500 links on Hacker News, leaving only the "non-technical" headlines. This was created in an effort to see what kinds of "worldly" stories are interesting to the Hacker News community. These stories are then populated in a Firestore database.

Using the [Axios](https://www.npmjs.com/package/axios) HTTP client, this file makes an `HTTP GET` request to the [Hacker News API](https://github.com/HackerNews/API) to first pull the curent top 500 links on Hacker News. It then iterates through each story to check if the domain at which the article is hosted appears in the file `sites.json`, which is previously populated with the world's [top 50 news web sites](https://www.alexa.com/topsites/category/Top/News), as defined by Alexa (this process is described in the section on `alexa.js` below). If the story is from one of these top news sites, the following attributes are then saved in the Firestore database:
* `title`
* `url`
* `id` (from the Hacker News API)
* `time` (Unix time stamp)

### getDomain()
Of special interest is the function `getDomain()`, which receives as an argument any URL string in any format, and returns a boolean indicating if the site appears in the array of sites stored in `sites.json`. Since the array stores domains in the format `domain.com`, this function needs to process all URLs that are variants of the following forms: 
* `https://contoso.com`
* `http://contoso.com`
* `https://www.contoso.com`
* `https://www.contoso.com/link/to/story`

## alexa.js
This file uses [Cheerio.js](https://cheerio.js.org/) to parse HTML data scraped via [Axios](https://www.npmjs.com/package/axios) from Alexa's [listing](https://www.alexa.com/topsites/category/Top/News) of the Top 50 web sites in the "news" category. This provides the criteria by which `index.js` determines if a Hacker News link is from a "non-technical" news site. The data is then stored as an array in the file `sites.json`.


