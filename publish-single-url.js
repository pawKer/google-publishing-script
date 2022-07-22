import axios from "axios";
import google from "googleapis";
import key from "./service_account.json" assert { type: "json" };
import "dotenv/config";

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

const publishSingleUrl = async (url) => {
  const authData = await jwtClient.authorize();
  options.headers.Authorization = `Bearer ${authData.access_token}`;
  options.data.url = url;
  let resp;
  try {
    resp = await axios(options);
    console.log(resp.data);
  } catch (e) {
    returnObj.errors.push(url);
    console.warn(`Error publishing URL: ${url}, error was: ${e}`);
  }
};

publishSingleUrl("https://monkeymeter.ro");
