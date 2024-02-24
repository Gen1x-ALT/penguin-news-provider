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
    const language = clm.getCountryByAlpha2(req.query.country).languages[0];
    const translationResponse = await axios.get(
      `https://trampoline.turbowarp.org/translate/translate?language=${language}&text=${encodeURIComponent(
        "News in " + lookup.byIso(req.query.country).country,
      )}`,
    );
    const translatedText = await translationResponse.data;
    const query = translatedText.result;

    console.log(JSON.stringify(query));

    let articles;

    if (req.query.alt) {
      articles = await news.search(query);
    } else {
      articles = await news.geo(lookup.byIso(req.query.country).country, {
        n: 15,
      });
    }

    const response = { status: "success", query: query, articles: articles };
    const prettifiedResponse = JSON.stringify(response, null, 2);

    res.json(JSON.parse(prettifiedResponse));
  };

  main();
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
