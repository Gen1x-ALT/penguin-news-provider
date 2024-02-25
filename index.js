const express = require("express");
const rateLimit = require("express-rate-limit");
const app = express();
const googleNewsScraper = require("google-news-scraper");
const lookup = require("country-code-lookup");
const clm = require("country-locale-map");
const cors = require("cors");
const news = require("gnews");
const axios = require("axios");
const { parseString } = require("xml2js");
const countryLanguage = require("country-language");

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  validate: {
    xForwardedForHeader: false,
  },
});

app.use(limiter);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("<h1><center>Hello, PenguinNews!</center></h1>");
});

app.get("/news", async (req, res) => {
  if (!req.query.country) {
    res.json({ "status": "error", "message": "country is required" })
    return;
  }
  const main = async () => {
    const language = clm.getCountryByAlpha2(req.query.country.toUpperCase()).languages[0];
    const translationResponse = await axios.get(
      `https://trampoline.turbowarp.org/translate/translate?language=${language}&text=${encodeURIComponent(
        "News in " + lookup.byIso(req.query.country.toUpperCase()).country,
      )}`,
    );
    const translatedText = await translationResponse.data;
    const query = translatedText.result;

    console.log(JSON.stringify(query));

    let articles;

    if (req.query.alt) {
      articles = await news.search(query);
    } else {
      articles = await news.geo(lookup.byIso(req.query.country.toUpperCase()).country, {
        n: 15,
      });
    }

    const response = { status: "success", query: query, articles: articles };
    const prettifiedResponse = JSON.stringify(response, null, 2);

    res.json(JSON.parse(prettifiedResponse));
  }; // Closing parenthesis was missing here

  main(); // Invoke the main function
});

app.get("/news/accurate", async (req, res) => {
  if (!req.query.country) {
    res.json({ "status": "error", "message": "country is required" });
    return;
  }

  const country = req.query.country.toUpperCase();
  const languageInfo = countryLanguage.getLanguage(country);
  const languageCode = languageInfo ? languageInfo.alpha2 : "en"; // Default to English if language code is not found
  const rssFeedUrl = `https://news.google.com/rss?hl=undefined&gl=${country}&ceid=${country}:undefined`;

  console.log(rssFeedUrl)

  try {
    const rssResponse = await axios.get(rssFeedUrl);
    const xmlData = rssResponse.data;

    parseString(xmlData, { explicitArray: false }, (err, result) => {
      if (err) {
        res.status(500).json({ "status": "error", "message": "Error parsing XML" });
        return;
      }

      const articles = result.rss.channel.item.slice(0, 15).map((item, index) => {
        return {
          number: index + 1,
          title: item.title,
          link: item.link,
          guid: item.guid._,
          pubDate: item.pubDate,
          description: item.description,
          source: {
            url: item.source.$.url,
            name: item.source._
          }
        };
      });

      const response = { status: "success", articles: articles };
      res.json(response);
    });
  } catch (error) {
    res.status(500).json({ "status": "error", "message": "Error fetching RSS feed" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
