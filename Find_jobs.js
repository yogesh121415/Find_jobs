// npm install minimist
// npm install excel4node
// npm install puppeteer
// node .\find_Jobs.js --source="Input.json"

let minimist =  require("minimist");
let excel = require("excel4node");
let puppeteer = require("puppeteer");
let fs = require("fs");
const { AsyncLocalStorage } = require("async_hooks");
const { resolveObjectURL } = require("buffer");
const { resolveMx } = require("dns");

// intalled required libraries
let args = minimist(process.argv);

let jsonFile = fs.readFileSync(args.source, "utf-8");
let data = JSON.parse(jsonFile);


searchJobs();


async function searchJobs(){
    let browser = await puppeteer.launch({headless: false,
        defaultViewport: null,
    args:[
        '--start-maximized'
    ]});
    let pages = await browser.pages();
    let page = pages[0];
    let jobsOnNaukri = await searchNaukri(page);
    let newPage = await browser.newPage();
    let jobsOnlinkedIn = await searchLinkedIN(newPage);
    let nextPage = await browser.newPage();
    let jobsOnIndeed = await searchIndeed(nextPage);
    browser.close();
    writeExcelFile(jobsOnIndeed,jobsOnNaukri,jobsOnlinkedIn);
    
    
}


function writeExcelFile(indeed, naukri, linkedIn){
    
    let wb = new excel.Workbook();
    let wsIndeed = wb.addWorksheet("Indeed");
    let style = wb.createStyle({
        font: {
            
            bold: true,
            size: 13
        }
    })
    let linkStyle = wb.createStyle({
        font:{
            color: "blue"
        }
    })

    fillHeaderforIndeed(wsIndeed, style);
    fillContentforIndeed(wsIndeed, indeed,linkStyle);
    let wsNaukri = wb.addWorksheet("Naukri");
    fillHeaderforNaukri(wsNaukri, style);
    fillContentforNaukri(wsNaukri, naukri,linkStyle);
    let wsLinkedIn = wb.addWorksheet("LinkedIn");
    fillHeaderforLinkedIn(wsLinkedIn, style);
    fillContentforLinkedIn(wsLinkedIn, linkedIn,linkStyle);
    wb.write("Top_25.csv");
}

function fillContentforIndeed(ws, arr ,linkStyle){
    for(let i = 0; i<25; i++){
        ws.cell(i+2,1).number(i+1);
        ws.cell(i+2,2).string(arr[i].role);
        ws.cell(i+2,3).string(arr[i].company);
        ws.cell(i+2,4).string(arr[i].location);
        ws.cell(i+2,5).string(arr[i].url).style(linkStyle);

    }
}
function fillContentforNaukri(ws, arr,linkStyle){
    for(let i = 0; i<25; i++){
        ws.cell(i+2,1).number(i+1);
        ws.cell(i+2,2).string(arr[i].name);
        ws.cell(i+2,3).string(arr[i].company);
        //ws.cell(i+2,4).string(arr[i].salary);
        //ws.cell(i+2,5).string(arr[i].expReq);
        //ws.cell(i+2,6).string(arr[i].location);
        ws.cell(i+2,4).string(arr[i].url).style(linkStyle);

    }
}
function fillContentforLinkedIn(ws, arr,linkStyle){
    for(let i = 0; i<25; i++){
        ws.cell(i+2,1).number(i+1);
        ws.cell(i+2,2).string(arr[i].role);
        ws.cell(i+2,3).string(arr[i].companyName);
        ws.cell(i+2,4).string(arr[i].postedOn);
        ws.cell(i+2,5).string(arr[i].link).style(linkStyle);

    }
}

function fillHeaderforIndeed(ws, style){
    ws.cell(1,1).string("S. No.").style(style);
    ws.cell(1,2).string("Role").style(style);
    ws.cell(1,3).string("Company").style(style);
    ws.cell(1,4).string("Location").style(style);
    ws.cell(1,5).string("Link to apply").style(style);
    
}
function fillHeaderforNaukri(ws , style){
    ws.cell(1,1).string("S. No.").style(style);
    ws.cell(1,2).string("Role").style(style);
    ws.cell(1,3).string("Company").style(style);
    //ws.cell(1,4).string("Location").style(style);
    //ws.cell(1,5).string("Experience Required").style(style);
    //ws.cell(1,6).string("Salary Offered").style(style);
    ws.cell(1,4).string("Link to Apply").style(style);
    
}
function fillHeaderforLinkedIn(ws, style){
    ws.cell(1,1).string("S. No.").style(style);
    ws.cell(1,2).string("Role").style(style);
    ws.cell(1,3).string("Company").style(style);
    ws.cell(1,4).string("PostedOn").style(style);
    ws.cell(1,5).string("Link to apply").style(style);
    
}
async function searchIndeed(page){
    await page.goto(data.jobSites.Indeed);
    await searchForKeyWordsInIndeed(page);
    let arr = await getDetailsFromIndeed(page);
    return arr;
}

async function getDetailsFromIndeed(page){
    await page.waitForSelector('h2>span');
    let roles = await extractDetails(page,'h2>span');
    let companies = await extractDetails(page,'span.companyName');
    let locations = await extractDetails(page,'div.companyLocation');
    //let salaries = await extractDetails(page,'div.salary-snippet>span');
    let urls = await page.$$eval('div.mosaic>a', function(response){
        let arr = [];
        for(let i = 0; i<response.length; i++){
            let url = response[i].getAttribute("href");
            url = "indeed.com"+url;
            arr.push(url);
        }
        return arr;
    });
    await page.waitForSelector('a[href="/jobs?q=Software+Developer&l=Bangalore&start=10"]');
    await page.click('a[href="/jobs?q=Software+Developer&l=Bangalore&start=10"]');
    await page.waitFor(7000);
    let tepm_roles = await extractDetails(page,'h2>span');
    let tepm_companies = await extractDetails(page,'span.companyName');
    let tepm_locations = await extractDetails(page,'div.companyLocation');
    //let tepm_salaries = await extractDetails(page,'div.salary-snippet>span');
    let tepm_urls = await page.$$eval('div.mosaic>a', function(response){
        let arr = [];
        for(let i = 0; i<response.length; i++){
            let url = response[i].getAttribute("href");
            url = "indeed.com"+url;
            arr.push(url);
        }
        return arr;
    });
    
    for(let i = 0; roles.length<25; i++){
        roles.push(tepm_roles[i]);
        
        companies.push(tepm_companies[i]);
        locations.push(tepm_locations[i]);
        urls.push(tepm_urls[i]);
    }
    let arr = [];
    for(let i =0; i<25; i++){
        let info = {
            role: roles[i],
            company: companies[i],
            location: locations[i],
            url: urls[i]

        }
        arr.push(info);
    }
    //console.log(arr);
    return arr;

}

async function searchForKeyWordsInIndeed(page){
    await page.waitForSelector('input[name="q"]');
    await page.type('input[name="q"]', data.Keywords.Role,{delay : 200});
    await page.type('input[name="l"]', data.Keywords.location,{delay : 200});
    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');
}


async function searchNaukri(page){
    await page.goto(data.jobSites.Naukri);
    await typeKeyValuesIntoNaukri(page);
    await page.waitForSelector('div.list');
    let jobDetails = await getJobDetailsInNaukri(page);
    await page.waitForSelector('a.fright>span.fw500');
    await page.click('a.fright>span.fw500');
    //await page.click('a[href="/software-developer-jobs-in-gurgaon-2"]');
    await page.waitForSelector('div.list');
    await page.waitFor(4000);
    let temp = await getJobDetailsInNaukri(page);
    for(let i =0; jobDetails.length<25; i++){
        jobDetails.push(temp[i]);
    }
    return jobDetails;

}

async function typeKeyValuesIntoNaukri(page){
    await page.waitForSelector('input[name="qp"]');
    await page.type('input[name="qp"]', data.Keywords.Role,{delay : 200});
    await page.waitForSelector('input[name="ql"]');
    await page.type('input[name="ql"]', data.Keywords.location,{delay : 200});
    await page.click('button#qsbFormBtn');
    
}

async function getJobDetailsInNaukri(page){
    await page.waitForSelector('div.jobTupleHeader>div.info');
    let tempArr1 = await page.$$eval('div.jobTupleHeader>div.info>a', function(response){
        let arr1= [];
        console.log(response.length);
        for(let i = 0; i<response.length; i++){
            let link = {
                url: "",
                name: ""
            }
            link.url = response[i].getAttribute("href");
            link.name = response[i].innerText;
            arr1.push(link);
        }
        return arr1;


    })
    let companyName = await getNameInNaukri(page,'div.mt-7>a.subTitle');
    let otherInfo = await getNameInNaukri(page,'li.fleft>span');

    for(let i = 0; i<tempArr1.length; i++){
        tempArr1[i].company = companyName[i];
        tempArr1[i].expReq = otherInfo[i*3];
        tempArr1[i].location = otherInfo[i*3+1];
        tempArr1[i].salary = otherInfo[i*3+2];
    }
    return tempArr1;
}

async function getNameInNaukri(page, str){
    await page.waitForSelector(str);
    let arr = await page.$$eval(str, function(response){
        let temp = [];
        for(let i = 0; i<response.length; i++){
            let val = response[i].innerText;
            temp.push(val);
        }
        return temp;
    })
    return arr;
}

async function searchLinkedIN(page){
    await page.goto(data.jobSites.LinkedIn);
    await page.waitFor(4000)
    await typeKeyValuesIntoLinkedIn(page);
    await page.waitFor(4000);
    //await page.waitForSelector('h3');
    
    
    let jobDetails = await detailsLinkedIn(page);
    //console.log(jobDetails);
    return jobDetails;
    


}
async function typeKeyValuesIntoLinkedIn(page){
    await page.waitForSelector('input[name="keywords"]');
    await page.type('input[name="keywords"]', data.Keywords.Role,{delay : 200});
    await page.waitForSelector('input[name="location"]');
    await page.type('input[name="location"]', data.Keywords.location,{delay : 200});
    for (let i = 0 ; i<30; i++){
        await page.keyboard.press("Delete");
    }
    await page.waitForSelector('button[data-tracking-control-name="public_jobs_jobs-search-bar_base-search-bar-search-submit"]');
    await page.click('button[data-tracking-control-name="public_jobs_jobs-search-bar_base-search-bar-search-submit"]');

}

async function detailsLinkedIn(page){
    
    //await page.waitFor(10000);
    await page.waitForSelector('li>div>a');
    let temp = await page.$$eval('li>div>a', function(response){
        
        let arr=[];
        for(let i = 0; i<response.length&&i<50; i++){
            let url = {
                link: ""
            }
            url.link = response[i].getAttribute("href");
            arr.push(url);
        }
        return arr;
    })
    
    let roles = await extractDetails(page, 'h3');
    let company = await extractDetails(page, 'a.hidden-nested-link');
    let time = await extractDetails(page, 'div>time');
    for(let i = 0; i<25; i++){
        temp[i].role = roles[i];
        temp[i].companyName = company[i];
        temp[i].postedOn = time[i];
    }

    
    return temp;
}

async function extractDetails(page, str){
    //await page.waitForSelector(str);
    
    //await page.waitFor(100);
    let temp = await page.$$eval(str,async function(response){
        let arr=[];
        for(let i = 0; i<response.length&&i<50; i++){
            let val = response[i].innerText;
            arr.push(val);
        }
        return arr;
    })
    return temp;
}

