import axios from "axios";
import google from "googleapis";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import cron from "cron";
import key from "./service_account.json" assert { type: "json" };
import "dotenv/config";
const maxQuota = 5;
const sitemapIndexURL = "https://twobillboard.com/sitemap_index.xml";
const options = {
  url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  data: {
    url: undefined,
    type: "URL_UPDATED",
  },
};
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});
const jwtClient = new google.Auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ["https://www.googleapis.com/auth/indexing"],
  null
);
const parser = new XMLParser();

const publishSites = async () => {
  let config = {};
  try {
    const jsonString = fs.readFileSync("config/config.json");
    config = JSON.parse(jsonString);
  } catch (e) {
    console.log("No existing DB found. Defaulting to empty");
  }
  let countPublishedToday = 0;
  // Get all the sitemaps
  // TODO: error handling
  console.log(`Getting the sitemap index at: ${sitemapIndexURL}`);
  const sitemapIndex = await axios.get(sitemapIndexURL);
  // Parse the XML result into an object
  const parsedSitemapIndex = parser.parse(sitemapIndex.data);

  // Put all the sitemap URLs into a lists
  const sitemapsToCheck = parsedSitemapIndex.sitemapindex.sitemap.map(
    (item) => item.loc
  );

  // Assuming the sites are ordered alphabetically, get the index in the list of the one we checked last
  let indexOfLastChecked = config.lastMapChecked
    ? sitemapsToCheck.findIndex((item) => item === config.lastMapChecked)
    : 0;

  // If the one we checked last is not in the list for some reason
  // default to 0
  indexOfLastChecked = indexOfLastChecked === -1 ? 0 : indexOfLastChecked;

  // Loop thorugh all the sitemaps from the one we last checked
  // until the end
  for (let i = indexOfLastChecked; i < sitemapsToCheck.length; i++) {
    // Get all the sites in that sitemap
    console.log(`Getting all URLs for: ${sitemapsToCheck[indexOfLastChecked]}`);
    const siteData = await axios.get(sitemapsToCheck[i]);

    // Parse the XML response
    const parsedData = parser.parse(siteData.data);

    // Get all the urls that we need to publish
    const urlsToPublish = parsedData.urlset.url.map((item) => item.loc);
    console.log(`Found ${urlsToPublish.length} urls.`);

    let indexOfLastPublished = 0;

    // If it's the first iteration, then we want to find the last one we published and start from there plus one
    // otherwise default to 0
    if (countPublishedToday === 0) {
      indexOfLastPublished = config.lastItemPublished
        ? urlsToPublish.findIndex((item) => item === config.lastItemPublished)
        : 0;

      // If for some reason the last one we published is not in the list then default to 0
      indexOfLastPublished =
        indexOfLastPublished === -1 ? 0 : indexOfLastPublished + 1;
    }

    // Starting from where we left off, loop through all urls we need to publish
    for (let j = indexOfLastPublished; j < urlsToPublish.length; j++) {
      // Publish URL
      console.log(`Published: ${urlsToPublish[j]}`);

      // Update published count
      countPublishedToday++;

      // If count exceeds quota
      if (countPublishedToday >= maxQuota) {
        console.log("Stopping before exceeding quota...");
        // Save the last processed items in the DB
        const data = {
          lastMapChecked: sitemapsToCheck[i],
          lastItemPublished: urlsToPublish[j],
        };
        fs.writeFile("config/config.json", JSON.stringify(data), (err) => {
          if (err) {
            throw err;
          }
          console.log("Updated DB");
        });
        // Exit this loop
        break;
      }
    }
    // If count has exceeded quota
    // Exit this loop
    if (countPublishedToday >= maxQuota) break;
    //   const authData = await jwtClient.authorize();
    //   //   console.log(authData);
    //   options.headers.Authorization = `Bearer ${authData.access_token}`;
    //   options.data.url = urlsToPublish[0];
    //   //   console.log(options);
    //   //   const resp = await axios(options);
    //   //   console.log(resp.status);
    //   break;
  }
  // If count has NOT exceeded quota at this point
  // it should mean we have already processed everything we should have
  if (countPublishedToday < maxQuota) {
    console.log("All finished for this sitemap index.");
  }
  console.log("Done");
};

// console.log(parsedMainSitemap.sitemapindex.sitemap);

// console.log(sitemapsToCheck.slice(0, 5));

// for (let i = indexToStartFrom; i <= sitemapsToCheck.length; i++) {
//   const siteData = await axios.get(sitemapsToCheck[i]);

//   const parsedData = parser.parse(siteData.data);
//   const urlsToPublish = parsedData.urlset.url.map((item) => item.loc);

//   console.log(urlsToPublish);
//   const authData = await jwtClient.authorize();
//   //   console.log(authData);
//   options.headers.Authorization = `Bearer ${authData.access_token}`;
//   options.data.url = urlsToPublish[0];
//   //   console.log(options);
//   //   const resp = await axios(options);
//   //   console.log(resp.status);
//   break;
// }
const sendMail = async () => {
  const resp = await mg.messages.create(
    "sandbox152ec7daccee4ce98440007b76db8400.mailgun.org",
    {
      from: "Publishing Script <googletestscript@sandbox152ec7daccee4ce98440007b76db8400.mailgun.org>",
      to: ["rares.dinu100@gmail.com"],
      subject: "Script ran succesfully ✅",
      text: "The script has run nice, very nice!",
    }
  );
  console.log("Email SENT.");
};
const scheduledJob = new cron.CronJob("* * * * *", async () => {
  console.log(`Running cron, current time: ${new Date().toISOString()}`);
  await publishSites();
  await sendMail();
});
scheduledJob.start();
