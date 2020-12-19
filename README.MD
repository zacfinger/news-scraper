# news-scraper

A set of tools for a fully automated luxury news blog.

(c) 2018-2020 ZacFinger.com

License: MIT

With MSN replacing their journalists with [news-writing bots](https://www.theguardian.com/technology/2020/may/30/microsoft-sacks-journalists-to-replace-them-with-robots) and the spectre of Facebook haunting the internets with [automatic news summarization tools](https://www.businessinsider.com/facebook-tldr-ai-tool-read-news-articles-for-you-2020-12), how might we solve the problem of generating accurate yet fully automated news headlines? The strategy pursued in this project is to derive novel content directly from the headlines of major news outlets such as CNN, the New York Times, and the Guardian. This way, it is impossible to generate an n-length word sequence that is not present in the source material. This restricts the generated news headlines to content that is actually being published by respected news institutions.

## Where do the headlines come from?
The raw data comes from the [Google News RSS feed](https://news.google.com/rss), pulled via the [RSS Parser](https://www.npmjs.com/package/rss-parser) package for Node. The `content` member of each returned RSS `item` contains a set of 4 or 5 headlines of a related story as `<a>` tags, which are themeselves list items of an `<ol>` HTML entity. [JSDOM](https://github.com/jsdom/jsdom), a package for manipulating HTML elements in Node, is used to collect the `<a>` tags into an array via the familiar `querySelectorAll('a')` function. 

After pulling the data from the RSS feed, `google.js` stores each of the stories and their composite headlines in an array of arrays, like below:
```json
[

  [
    "Trump says he and first lady have tested positive for coronavirus",
    "President Donald Trump says he has tested positive for coronavirus",
    "President Trump and first lady Melania test positive for COVID-19",
    "Trump, first lady begin the 'quarantine process' after Hope Hicks tests positive for coronavirus",
    "President Donald Trump tweets he and first lady Melania Trump test positive for Covid-19"
  ],

  [
    "With Bipartisan Deal Elusive, Democrats Push Through Their Own Stimulus Bill",
    "House Democrats Pass $2.2 Trillion Stimulus Plan",
    "GOP presses for vote on PPP legislation | TheHill",
    "House approves $2.2 trillion stimulus plan from Democrats with no bipartisan deal in sight",
    "House passes $2.2 trillion Democratic coronavirus stimulus bill"
  ],
  
  // more stories...

]
```
## How does it generate the headline?
Within each collection of headlines, each headline is iterated over, and each word within each headline is added to an object as a key. The corresponding value is an array of all the words which in the source text followed the key. 

For instance, in the object generated below, we can see that each instance of the word `Trump` in the source was followed by one of three words: `attacks`, `committed`, or `is`. Some words, such as `strategy.`, occurred at the end of headlines, and therefore are keys to an empty array. 

```javascript
let bank = [ 
  
    {
        Trump: [ 'says', 'says', 'and', 'tweets', 'test' ],
        says: [ 'he', 'he' ],
        he: [ 'and', 'has', 'and' ],
        and: [ 'first', 'first', 'first' ],
        first: [ 'lady', 'lady', 'lady', 'lady' ],
        lady: [ 'have', 'Melania', 'begin', 'Melania' ],
        have: [ 'tested' ],
        tested: [ 'positive', 'positive' ],
        positive: [ 'for', 'for', 'for', 'for', 'for' ],
        for: [
          'coronavirus',
          'coronavirus',
          'COVID-19',
          'coronavirus',
          'Covid-19'
        ],
        coronavirus: [],
        President: [ 'Donald', 'Trump', 'Donald' ],
        Donald: [ 'Trump', 'Trump' ],
        has: [ 'tested' ],
        Melania: [ 'test', 'Trump' ],
        test: [ 'positive', 'positive' ],
        'COVID-19': [],
        'Trump,': [ 'first' ],
        begin: [ 'the' ],
        the: [ "'quarantine" ],
        "'quarantine": [ "process'" ],
        "process'": [ 'after' ],
        after: [ 'Hope' ],
        Hope: [ 'Hicks' ],
        Hicks: [ 'tests' ],
        tests: [ 'positive' ],
        tweets: [ 'he' ],
        'Covid-19': []
  },

  {
        With: [ 'Bipartisan' ],
        Bipartisan: [ 'Deal' ],
        Deal: [ 'Elusive,' ],
        'Elusive,': [ 'Democrats' ],
        Democrats: [ 'Push', 'Pass', 'with' ],
        Push: [ 'Through' ],
        Through: [ 'Their' ],
        Their: [ 'Own' ],
        Own: [ 'Stimulus' ],
        Stimulus: [ 'Bill', 'Plan' ],
        Bill: [],
        House: [ 'Democrats', 'approves', 'passes' ],
        Pass: [ '$2.2' ],
        '$2.2': [ 'Trillion', 'trillion', 'trillion' ],

        ...
  }

  ...
```
Starting from the first word of any of the headlines, we can use naive Markov chaining to generate new headlines from this data structure with the below stochastic algorithm:
```javascript
while(bank[currentWord].length > 0)
{

	headline += currentWord + " ";
	
	currentWord = bank[currentWord][Math.floor(Math.random() * bank[currentWord].length)];

}
```
This generates, for example, headlines such as the below:
* President Donald Trump tweets he and first lady have tested positive for coronavirus
* President Donald Trump says he and first lady Melania Trump says he and first lady Melania Trump says he
* President Donald Trump says he and first lady have tested positive for coronavirus following travel with Trump: Report

## How does it pull a picture?
The top two words for each set of headlines (as measured by frequency) are then used to query an image from the [Unsplash API](https://unsplash.com/developers). The generated headline, the Unsplash image URL, and the related Google News URL are then populated in a Firestore database.

## Hacker News for my mom
Despite the abundance of general audience news stories shared on Hacker News, I suspect the technical jargon and posts linking to some senior engineer's blog repel many visitors, including my mom, which is unfortunate. Though the discussion in the forums regarding world news stories is hardly scholarly, given that HN attracts incredibly smart engineers, programmers and scientists, the comments are arguably a more valuable read than the thread on Reddit or Facebook for the same story.

The file `index.js` removes all "technical" headlines from the top current 500 links on Hacker News, leaving only the "non-technical" stories. A story is deemed to be "non-technical" if the domain appears in the top 50 Alexa domains in the "news" category. This was created in an effort to see what kinds of "worldly" stories are interesting to the Hacker News community. These stories are then populated in a Firestore database.

Using the [Axios](https://www.npmjs.com/package/axios) HTTP client, the file `index.js` makes an `HTTP GET` request to the [Hacker News API](https://github.com/HackerNews/API) to first pull the curent top 500 links on Hacker News. It then iterates through each story to check if the domain at which the article is hosted appears in the file `sites.json`, which is previously populated with the world's [top 50 news web sites](https://www.alexa.com/topsites/category/Top/News), as defined by Alexa (this process is described in the section on `alexa.js` below). If the story is from one of these top news sites, the following attributes are then saved in the Firestore database:
* `title`
* `url`
* `id` (from the Hacker News API)
* `time` (Unix time stamp)

### getDomain()
Of special interest is the function `getDomain()` in the shared library `app.js`, which receives as an argument any URL string in any format, and returns a stripped domain of the format `domain.com`. This function can process all URLs that are variants of the following forms: 
* `https://contoso.com`
* `http://contoso.com`
* `https://www.contoso.com`
* `https://www.contoso.com/link/to/story`
* `https://news.contoso.com`

## alexa.js
This file uses [Cheerio.js](https://cheerio.js.org/) to parse HTML data scraped via [Axios](https://www.npmjs.com/package/axios) from Alexa's [listing](https://www.alexa.com/topsites/category/Top/News) of the Top 50 web sites in the "news" category. This provides the criteria by which `index.js` determines if a Hacker News link is from a "non-technical" news site. If the story was shared on Hacker News, and is from one of these sites, it will be then stored as an array in the file `sites.json`.


