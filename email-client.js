import Mailgun from "mailgun.js";
import formData from "form-data";
import {
  errorMailContent,
  successMailContent,
  warningMailContent,
} from "./email-setup.js";
import "dotenv/config";

export class EmailClient {
  constructor() {
    this.mailgun = new Mailgun(formData);
    if (process.env.MAILGUN_API_KEY)
      this.mg = this.mailgun.client({
        username: "api",
        key: process.env.MAILGUN_API_KEY,
      });
  }

  async sendMail(type, text) {
    if (!process.env.MAILGUN_API_KEY) {
      console.log("Mailgun API Key not set. Email NOT sent.");
      return;
    }
    let mailContent;
    switch (type) {
      case "SUCCESS":
        mailContent = successMailContent;
        break;
      case "WARNING":
        mailContent = warningMailContent;
        break;
      case "ERROR":
        mailContent = errorMailContent;
        break;
      default:
        mailContent = errorMailContent;
    }

    mailContent.text = text;

    try {
      const resp = await this.mg.messages.create(
        "sandbox152ec7daccee4ce98440007b76db8400.mailgun.org",
        mailContent
      );
      console.log(`${type} email sent.`);
    } catch (e) {
      console.error(`Failed sending email: ${e}`);
      console.error(e.stack);
    }
  }
}
