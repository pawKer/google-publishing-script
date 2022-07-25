import "dotenv/config";
const adresees = [process.env.EMAIL_RECIPIENT];

const successMailContent = {
  from: "Publishing Script <googletestscript@sandbox152ec7daccee4ce98440007b76db8400.mailgun.org>",
  to: adresees,
  subject: "Script ran succesfully ✅",
};

const warningMailContent = {
  from: "Publishing Script <googletestscript@sandbox152ec7daccee4ce98440007b76db8400.mailgun.org>",
  to: adresees,
  subject: "Script ran with warnings ⚠",
};

const errorMailContent = {
  from: "Publishing Script <googletestscript@sandbox152ec7daccee4ce98440007b76db8400.mailgun.org>",
  to: adresees,
  subject: "Script had some errors ❌",
};

const doneMailContent = {
  from: "Publishing Script <googletestscript@sandbox152ec7daccee4ce98440007b76db8400.mailgun.org>",
  to: adresees,
  subject: "Script has finished publishing all URLs 🥳",
};

export {
  successMailContent,
  errorMailContent,
  warningMailContent,
  doneMailContent,
};
