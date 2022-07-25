# Publishing Script

## Setup instructions on Mac OS 🔧

To setup the script you are going to need to follow a few steps.

- First of all you will need to install docker.

  1. Go to https://docs.docker.com/desktop/install/mac-install/
  1. Download and install the correct version for your computer

This should also install the `docker-compose` command.

- Next, you will also need to provide the service account credentials for the Google Indexing API in a JSON file called `service_account.json` in the root of this project.

- To configure some variables in the script you will need to create a file called `.env` in the root folder of this project which contains some values. I have provided `.env.example` as an example.

```
MAILGUN_API_KEY=aaaa-bbbb-cccc // the API key for the Mailgun API - if not provided the script will not send emails
EMAIL_RECIPIENT=you@email.com // email recipient for the email
SITEMAP_INDEX_URL=https://yourwebsite.com/sitemap_index.xml // the sitemap index you want the script to process
```

- The last step you need is to modify this line in `docker-compose.yml` and change the first part to a path where you want the file "database" to live. The "database" is just a file that will be called `config.json` and will get created once the script runs.

```
 - <PATH-TO-A-FOLDER>:/usr/src/app/config
```

I recommend something like:

```
 - Users/<YOUR-USERNAME>/Projects/google-publishing-script:/usr/src/app/config
```

If you've followed all these steps your project folder should look something like this:

![Project Files Setup Example](https://i.imgur.com/rKPPfIz.png)

## Additional config 📜

If you want to configure a starting point for the script you can create a `config.json` file in the root directory of your project that looks like this:

```
{
    "lastMapChecked":"https://yourwebsite.com/page-sitemap100.xml",
    "lastItemPublished":"https://yourwebsite.com/specific-page-on-sitemap/"
}
```

The `lastItemPublished` value can be left empty and that will just take the first item in the list by default.

The order of processing is currently configured as **descending** meaning if you provide `https://yourwebsite.com/page-sitemap100.xml` as the last map checked, the maps processed will then be `page-sitemap100`, `page-sitemap99`, `page-sitemap98`, etc.

## Running 🚀

Make sure the Docker Desktop app is running.

To run the script you should be able to just run the `docker-compose up` command in the terminal in the root folder of this project.

This will create a docker container which will run the script.

It should look something like this in the Docker Desktop app:

![Docker Desktop Container Running](https://i.imgur.com/s2sGUEK.png)

## Schedule ⏰

The script is currently scheduled to run at 18:00 every day UK time.

## Running without Docker 🚫🐳

To run without Docker you will need to:

1. Make sure you have Node 17 and NPM installed
1. Run `npm install`
1. Run `npm run start`

The main file of the script is `index.js`

## Other variables 💬

At the top of the main script file `index.js` there are some variables which you can configure such as `MAX_QUOTA` and `BATCH_SIZE`.

To make these changes also apply to the Docker container you will then need to run `docker-compose up -d --build`.
