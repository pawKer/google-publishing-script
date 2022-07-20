import axios from "axios";
import google from "googleapis";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import cron from "cron";
import key from "./service_account.json" assert { type: "json" };
import { EmailClient } from "./email-client.js";
import "dotenv/config";

const maxQuota = 5; // Daily quota for Google API;
const sitemapIndexURL = "<URL-TO-CHECK>";
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

const jwtClient = new google.Auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ["https://www.googleapis.com/auth/indexing"],
  null
);
const parser = new XMLParser();

const emailClient = new EmailClient();

let COUNT_PUBLISHED_TODAY = 0;

const publishSites = async () => {
  const processedSitemaps = [];
  const errorSitemaps = [];
  let lastPublishedUrl = undefined;
  let config = {};
  COUNT_PUBLISHED_TODAY = 0;

  try {
    // Reading from the DB (file based at the moment)
    const jsonString = fs.readFileSync("config/config.json");
    config = JSON.parse(jsonString);
  } catch (e) {
    console.log("No existing DB found. Defaulting to empty");
  }

  // Get all the sitemaps
  console.log(`Getting the sitemap index at: ${sitemapIndexURL}`);
  let sitemapIndex;
  try {
    sitemapIndex = await axios.get(sitemapIndexURL);
  } catch (e) {
    console.error(
      `Failed getting sitemap index response for: ${sitemapIndexURL}`
    );
    throw e;
  }

  // Parse the XML result into an object
  let parsedSitemapIndex;
  try {
    parsedSitemapIndex = parser.parse(sitemapIndex.data);
  } catch (e) {
    console.error(
      `Failed parsing sitemap index response for: ${sitemapIndexURL}`
    );
    throw e;
  }

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

  // const authData = await jwtClient.authorize();

  // Loop thorugh all the sitemaps from the one we last checked
  // until the end
  for (let i = indexOfLastChecked; i < sitemapsToCheck.length; i++) {
    processedSitemaps.push(sitemapsToCheck[indexOfLastChecked]);

    // Get all the sites in that sitemap
    console.log(`Getting all URLs for: ${sitemapsToCheck[indexOfLastChecked]}`);
    let siteData;
    try {
      siteData = await axios.get(sitemapsToCheck[i]);
    } catch (e) {
      console.error(`Failed getting response for: ${sitemapsToCheck[i]}`);
      throw e;
    }

    // Parse the XML response
    let parsedData;
    try {
      parsedData = parser.parse(siteData.data);
    } catch (e) {
      console.error(`Failed parsing response for: ${sitemapsToCheck[i]}`);
      throw e;
    }

    // Get all the urls that we need to publish
    const urlsToPublish = parsedData.urlset.url.map((item) => item.loc);
    console.log(`Found ${urlsToPublish.length} urls.`);

    let indexOfLastPublished = 0;

    // If it's the first iteration, then we want to find the last one we published and start from there plus one
    // otherwise default to 0
    if (COUNT_PUBLISHED_TODAY === 0) {
      indexOfLastPublished = config.lastItemPublished
        ? urlsToPublish.findIndex((item) => item === config.lastItemPublished)
        : 0;

      // If for some reason the last one we published is not in the list then default to 0
      indexOfLastPublished =
        indexOfLastPublished === -1 ? 0 : indexOfLastPublished + 1;
    }

    // Starting from where we left off, loop through all urls we need to publish
    const response = await callApiToPublish(
      indexOfLastPublished,
      urlsToPublish,
      sitemapsToCheck[i] // Need to pass authData as well
    );

    if (response.errors.length > 0) errorSitemaps.push(...response.errors);
    lastPublishedUrl = response.lastPublishedUrl;
    // If count has exceeded quota
    // Exit this loop
    if (COUNT_PUBLISHED_TODAY >= maxQuota) break;
  }
  // If count has NOT exceeded quota at this point
  // it should mean we have already processed everything we should have
  console.log(`Published ${COUNT_PUBLISHED_TODAY} URLs succesfully`);
  if (COUNT_PUBLISHED_TODAY < maxQuota) {
    console.log("All finished for this sitemap index.");
  }

  if (errorSitemaps.length > 0) {
    console.warn(`Had some URLs that failed to publish: ${errorSitemaps}`);
    await emailClient.sendMail(
      "WARNING",
      `Published ${COUNT_PUBLISHED_TODAY} URLs with some errors for ${processedSitemaps}. The last url published was: ${lastPublishedUrl}. The URLs that got an error were ${errorSitemaps}.`
    );
  } else {
    await emailClient.sendMail(
      "SUCCESS",
      `Published ${COUNT_PUBLISHED_TODAY} URLs succesfully for ${processedSitemaps}. The last url published was: ${lastPublishedUrl}`
    );
  }

  console.log("Done");
};

const callApiToPublish = async (startIndex, urlsToPublish, currentMap) => {
  let returnObj = {
    errors: [],
  };
  for (let j = startIndex; j < urlsToPublish.length; j++) {
    // Publish URL
    // options.headers.Authorization = `Bearer ${authData.access_token}`;
    // options.data.url = urlsToPublish[j];
    // let resp;
    // try {
    //   resp = await axios(options);
    // } catch (e) {
    //   returnObj.errors.push(urlsToPublish[j]);
    //   console.warn(
    //     `Error publishing URL: ${urlsToPublish[j]}, error was: ${e}`
    //   );
    // }
    // console.log(resp.status);
    console.log(`Published: ${urlsToPublish[j]}`);

    // Update published count
    COUNT_PUBLISHED_TODAY++;

    // If count exceeds quota
    if (COUNT_PUBLISHED_TODAY >= maxQuota) {
      console.log("Stopping before exceeding quota...");
      // Save the last processed items in the DB
      const lastPublishedUrl = urlsToPublish[j];
      const data = {
        lastMapChecked: currentMap,
        lastItemPublished: lastPublishedUrl,
      };
      returnObj.lastPublishedUrl = lastPublishedUrl;
      fs.writeFile("config/config.json", JSON.stringify(data), (err) => {
        if (err) {
          console.error("Failed to update DB.");
          throw err;
        }
        console.log("Updated DB.");
      });
      // Exit this loop
      break;
    }
  }
  return returnObj;
};

// Need to update cronjob schedule
const scheduledJob = new cron.CronJob("* * * * *", async () => {
  console.log(`Running cron, current time: ${new Date().toISOString()}`);
  try {
    await publishSites();
  } catch (e) {
    console.error(`Script failed for some reason: ${e}`);
    await emailClient.sendMail(
      "ERROR",
      `The script failed to run because of the following error: ${e}`
    );
  }
});

scheduledJob.start();
