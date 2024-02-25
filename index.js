const express = require("express");
const app = express();
const googleNewsScraper = require("google-news-scraper");
const lookup = require("country-code-lookup");
const clm = require("country-locale-map");
const cors = require("cors");
const news = require("gnews");
const axios = require("axios");

app.use(cors());

app.get("/news", async (req, res) => {
  if (!req.query.country) {
    res.json({"status": "error", "message": "country is required"})
    return
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
  };

  app.get("/news/accurate", async (req, res) => {
  if (!req.query.country) {
    res.json({ "status": "error", "message": "country is required" });
    return;
  }

  const country = req.query.country.toUpperCase();
  const languageCode = countryLanguage.getLanguage(country).alpha2 || "en";
  const rssFeedUrl = `https://news.google.com/rss?hl=${languageCode}&gl=${country}&ceid=${country}:es-419`;

  try {
    const rssResponse = await axios.get(rssFeedUrl);
    const xmlData = rssResponse.data;

    parseString(xmlData, { explicitArray: false }, (err, result) => {
      if (err) {
        res.status(500).json({ "status": "error", "message": "Error parsing XML" });
        return;
      }

      const articles = result.rss.channel.item.slice(0, 25).map((item, index) => {
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

  main();
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
