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
    let snapshotsData = await axios.get(`/snapshots?build_id=${buildId}`, { responseType: 'json' }).then((res) => {
        if (res.status == 200) {
            let parser = new Parser(res.data)
            let data = parser.getSimplified()
            return data
        } else {
            throw res.data
        }
    })
    buildURL = buildDetails['data']['attributes']['web-url']
    projectURL = buildURL.split("/builds/")[0]
    projectName = projectURL.split('/').slice(-1)[0]
    console.log(projectURL);

    let report = {
        totalScreenshots: 0,
        totalSnapshots: buildDetails['data']['attributes']['total-snapshots'],
        buildURL: buildDetails['data']['attributes']['web-url'],
        unreviewedScreenshots: 0,
        unreviewedSnapshots: 0,
        widths: [],
        browsers: [],
        projectURL : projectURL,
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
            let browser = getComparisonBrowser(comp)
            if (downloadImages) {
                ['base', 'head', 'diff'].forEach((val) => {
                    if (images[val]) {
                        images[val].file = downloadImage({
                            name: String(snapshot?.['attributes'].name).replace('/', '-'),
                            browser: browser.name,
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
            Object.assign(comparison, comp.attributes, { images }, { browser: browser.name || '' })
            if (!report.browsers.includes(browser.name)) {
                report.browsers.push(browser.name)
            }
            if (!report.widths.includes(comparison['width'])) {
                report.widths.push(comparison['width'])
            }
            comparison['diff-percentage'] = (comparison['diff-ratio'] * 100).toFixed(2)
            comparison['diff-color'] = "yellow"
            if (comparison['diff-percentage'] > diffThreshold) {
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
    HtmlReportGenerator(config, report)
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

function downloadImage(options) {
    let { name, browser, width, type, baseDir, url } = options
    if(!fs.existsSync(`${baseDir}/${type}`)){
        fs.mkdirSync(`${baseDir}/${type}`,{recursive:true})
    }
    let path = `${baseDir}/${type}/${name}-${browser}-${width}.png`
    try {
        new Axios({ responseType: 'arraybuffer',url:url }).get(url).then((file) => {
            console.log("Download Complete:" + path)
            fs.writeFileSync(path, file.data)
        }).catch((err) => {
            console.error("Failed to Download: " + path)
        })
        return `./${type}/${name}-${browser}-${width}.png`;
    } catch {

    }
}

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}