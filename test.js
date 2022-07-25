import axios from "axios";
import google from "googleapis";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import cron from "cron";
import key from "./service_account.json" assert { type: "json" };
import { EmailClient } from "./email-client.js";
import "dotenv/config";
import request from "request";
import rp from "request-promise-native";

const MAX_QUOTA = 10; // Daily quota for Google API;
const sitemapIndexURL = process.env.SITEMAP_INDEX_URL;

const jwtClient = new google.Auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ["https://www.googleapis.com/auth/indexing"],
  null
);

const googleApiClient = new google.indexing_v3.Indexing({ auth: jwtClient });
