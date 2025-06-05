
const { Parser } = require('./response-parser')
const { Axios } = require('axios')
const fs = require('fs')
const { HtmlReportGenerator } = require('./html-render')
const defaultConfig = {
    percyToken: process.env.PERCY_TOKEN,
    apiUrl: 'https://percy.io/api/v1',
    downloadPath: './Reports',
    diffThreshold: 1
}
let downloadQueue;
module.exports.Generate = async function (config) {
    let { buildId, percyToken, apiUrl, downloadImages, downloadPath, diffThreshold } = Object.assign({}, defaultConfig, config)
    let axios = new Axios({
        baseURL: apiUrl,
        headers: {
            "Authorization": `Token ${percyToken}`
        }
    })
    let baseDir = `${downloadPath}/${buildId}`
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true })
    }
    let buildDetails = await axios.get(`/builds/${buildId}`, { responseType: 'json' }).then((res) => {
        if (res.status == 200) {
            return JSON.parse(res.data)
        } else {
            throw res.data
        }
    })
    if(!downloadQueue){
        await import('p-queue').then(({default:PQueue})=>{
            downloadQueue =  new PQueue({concurrency:1,intervalCap:5,interval:5000})
        })
    }
    const useCompTag = buildDetails['data']['attributes']['type'] == 'app' || buildDetails['data']['attributes']['type'] == 'automate'
    while (buildDetails.data && buildDetails.data.attributes.state !== 'finished') {
        console.log("Waiting for build to complete on Percy...")
        await wait(30000)
        buildDetails = await axios.get(`/builds/${buildId}`, { responseType: 'json' }).then((res) => {
            if (res.status == 200) {
                return JSON.parse(res.data)
            } else {
                throw res.data
            }
        })
        if (buildDetails.data.attributes.state === 'error') {
            throw new Error("Build Failed with an Error on Percy Server. Please check your percy dashboard for more information.")
        }
    }

    console.log(`Generating report for Build ID ${buildId}`)
    // let snapshotsData = await axios.get(`/snapshots?build_id=${buildId}`, { responseType: 'json' }).then((res) => {
    //     if (res.status == 200) {
    //         let parser = new Parser(res.data)
    //         let data = parser.getSimplified()
    //         return data
    //     } else {
    //         throw res.data
    //     }
    // })
    //
    let snapshotsData = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
        const cursorParam = cursor ? `&page[cursor]=${cursor}` : '';
        const response = await axios.get(`/snapshots?build_id=${buildId}${cursorParam}`, { responseType: 'json' });
        if (response.status === 200) {
            let parser = new Parser(response.data);
            let data = parser.getSimplified();
            if (data.length > 0) {
                snapshotsData.push(...data);
                cursor = data[data.length - 1].id; // update cursor to last snapshot ID
                // If less than a typical page size (usually 20), stop
                // hasMore = data.length >= 20;
            } else {
                hasMore = false;
            }
        } else {
            throw response.data;
        }
    }

    buildURL = buildDetails['data']['attributes']['web-url']
    projectURL = buildURL.split("/builds/")[0]
    projectName = projectURL.split('/').slice(-1)[0]

    let report = {
        totalScreenshots: 0,
        totalSnapshots: buildDetails['data']['attributes']['total-snapshots'],
        buildURL: buildDetails['data']['attributes']['web-url'],
        unreviewedScreenshots: 0,
        unreviewedSnapshots: 0,
        widths: [],
        browsers: [],
        devices: [],
        projectURL: projectURL,
        buildNumber: buildDetails['data']['attributes']['build-number'],
        projectName: projectName
    }
    report['details'] = snapshotsData.map((snapshot) => {
        let formattedSnapshot = {}
        let flagChanged = false;
        formattedSnapshot['id'] = snapshot.id
        Object.assign(formattedSnapshot, snapshot.attributes)
        formattedSnapshot['comparisons'] = snapshot.relationships.comparisons?.data.map((comp) => {
            let comparison = {}
            let images = {}
            let base = images['base'] = getComparisonImage(comp, 'base-screenshot')
            let head = images['head'] = getComparisonImage(comp, 'head-screenshot')
            let diff = images['diff'] = getComparisonImage(comp, 'diff-image')
            let compTag;
            Object.assign(comparison, comp.attributes, { images }, useCompTag?{ device:compTag }:{browser:compTag});
            if (useCompTag) {
                let device = getComparisonDevice(comp)
                compTag = `${device.name} (${device['os-name']} ${device['os-version']})`
                if(!report.devices.includes(compTag)){
                    report.devices.push(compTag)
                }
            } else {
                let browser = getComparisonBrowser(comp)
                compTag = browser.name
                if (!report.browsers.includes(browser.name)) {
                    report.browsers.push(browser.name)
                }
                if (!report.widths.includes(comparison['width'])) {
                    report.widths.push(comparison['width'])
                }
            }
            if (downloadImages) {
                
                
                ['base', 'head', 'diff'].forEach((val) => {
                    if (images[val]) {
                        images[val].file = downloadImage({
                            name: String(snapshot?.['attributes'].name),
                            compTag,
                            width: images[val].width,
                            type: val,
                            baseDir,
                            url: images[val].url
                        })
                    }
                })
            }
            report['totalScreenshots']++
            if (diff) {
                report['unreviewedScreenshots']++
                flagChanged = true
            } else if (head && !base) {
                report['unreviewedScreenshots']++
                flagChanged = true
            }
            Object.assign(comparison, comp.attributes, { images }, useCompTag?{ device:compTag }:{browser:compTag})

            
            comparison['diff-percentage'] = (comparison['diff-ratio'] * 100).toFixed(2)
            comparison['diff-color'] = "yellow"
            if (Number(comparison['diff-percentage']) > Number(diffThreshold)) {
                comparison['diff-color'] = "red"
            }
            return comparison
        })
        if (flagChanged) {
            report['unreviewedSnapshots']++
        }
        return formattedSnapshot
    })
    fs.writeFileSync(`${baseDir}/report.json`, JSON.stringify(report, undefined, 2))
    HtmlReportGenerator(config, report, useCompTag)
    console.log("Build Report Generated.")
    return report
}


function getComparisonImage(comparison, key) {
    let screenshot = comparison.relationships[key]
    if (!screenshot) return;
    if (key.includes('diff')) {
        return screenshot?.attributes
    } else {
        return screenshot.relationships?.image?.attributes
    }
}

function getComparisonBrowser(comparison) {
    return comparison.relationships['browser']?.relationships['browser-family']?.attributes
}

function getComparisonDevice(comparison) {
    return comparison.relationships['comparison-tag']?.attributes
}

function downloadImage(options) {
    let { name, width, type, baseDir, url,compTag } = options
    if (!fs.existsSync(`${baseDir}/${type}`)) {
        fs.mkdirSync(`${baseDir}/${type}`, { recursive: true })
    }
    let composedName = `${name}-${compTag}-${width}.png`.replace(/[\\\/]/g,'_')
    let path = `${baseDir}/${type}/${composedName}`
    try {
        downloadQueue.add(()=>new Axios({ responseType: 'arraybuffer', url: url }).get(url).then((file) => {
            console.log("Download Complete:" + path)
            fs.writeFileSync(path, file.data)
        }).catch((err) => {
            console.error("Failed to Download: " + path)
            if(err.code == 'ECONNRESET'){
                console.log('Retrying '+ path)
            }else{
                console.error(`Failed ${path}, error: ${err.code}`)
            }
        }))
        return `file:./${type}/${composedName}`;
    } catch(err) {
        
    }
}

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}
