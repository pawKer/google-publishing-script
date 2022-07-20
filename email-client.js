import Mailgun from "mailgun.js";
import formData from "form-data";
import {
  errorMailContent,
  successMailContent,
  warningMailContent,
} from "./email-setup.js";
export class EmailClient {
  constructor() {
    this.mailgun = new Mailgun(formData);
    this.mg = this.mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
    });
  }

  async sendMail(type, text) {
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
    } catch (e) {
      console.error(`Failed sending email: ${e}`);
    }
    console.log(`${type} email sent.`);
  }
}
