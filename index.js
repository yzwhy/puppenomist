const program = require('commander');
const ppt = require('puppeteer');
const login = require('./lib/login');
const extractArticleLinks = require('./lib/extractArticleLinks');
const extractIssueLinks = require('./lib/extractIssueLinks');
const Scraper = require('./lib/Scraper');
const askAccount = require('./lib/askAccount');
const thisYear = new Date().getFullYear().toString();

program
    .usage('-y year')
    .option('-y, --year [value]', 'set target year to scrape, like 2018. Default value is This year', thisYear)
    .option('-v, --view', 'set this option when you want to see GUI')
    .parse(process.argv);

const targetYear = program.year;
const isHeadless = !program.view;

const puppenomist = async () => {
    const user = await askAccount();

    const browser = await ppt.launch({ headless: isHeadless });
    let page = await browser.newPage();

    //disable loading images
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.resourceType() === 'image')
            request.abort();
        else
            request.continue();
    });
    await page.setViewport({ width: 1200, height: 1000 });

    const loginResult = await login(page, user).catch((error) => {
        console.log(error.message);
        return {isLogined:false};
    });
    if(!loginResult.isLogined){
        console.log("terminating...");
        await browser.close();
        process.exit(1);
    }

    const issueLinks = await extractIssueLinks(page, targetYear);

    for (link of issueLinks) {
        const articleLinks = await extractArticleLinks(page, link)
            .catch((err) => {
                console.log(err);
            });
        console.log("started " + link);

        const scraper = new Scraper(page, articleLinks);
        await scraper.scrape();
    }

    await browser.close();
};

(async () => {
    await puppenomist();
})();

module.exports = puppenomist;