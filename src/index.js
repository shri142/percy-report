const { Parser } = require('./response-parser')
const { Axios } = require('axios')
const fs = require('fs')
const {HtmlReportGenerator}  = require('./html-report')
const defaultConfig = {
    percyToken: process.env.PERCY_TOKEN,
    apiUrl: 'https://percy.io/api/v1',
    downloadPath: './Reports',
    diffThreshold: 1
}
module.exports.Generate = async function (config) {
    let { buildId, percyToken, apiUrl, downloadImages, downloadPath , diffThreshold} = Object.assign({}, defaultConfig, config)
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
    let buildDetails = await axios.get(`/builds/${buildId}`,{responseType:'json'}).then((res)=>{
        if(res.status == 200){
            return JSON.parse(res.data)
        }else{
            throw res.data
        }
    })
    console.log(buildDetails)
    let snapshotsData = await axios.get(`/snapshots?build_id=${buildId}`, { responseType: 'json' }).then((res) => {
        if (res.status == 200) {
            let parser = new Parser(res.data)
            let data = parser.getSimplified()
            return data
        } else {
            throw res.data
        }
    })
    let report = {
        totalScreenshots:0,
        totalSnapshots:buildDetails['data']['attributes']['total-snapshots'],
        buildURL:buildDetails['data']['attributes']['web-url'],
        unreviewedScreenshots:0,
        unreviewedSnapshots:0,
        widths:[],
        browsers:[]
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
            report['totalScreenshots']++
            if(diff){
                report['unreviewedScreenshots']++
                flagChanged = true
            }else if(head && !base){
                report['unreviewedScreenshots']++
                flagChanged = true
            }
            Object.assign(comparison, comp.attributes, { images }, { browser: browser.name || '' })
            if(!report.browsers.includes(browser.name)){
                report.browsers.push(browser.name)
            }
            if(!report.widths.includes(comparison['width'])){
                report.widths.push(comparison['width'])
            }
            comparison['diff-percentage'] = (comparison['diff-ratio']*100).toFixed(2)
            comparison['diff-color'] = "yellow"
            if (comparison['diff-percentage'] > diffThreshold) {
                comparison['diff-color'] = "red"
            }
            return comparison
        })
        if(flagChanged){
            report['unreviewedSnapshots']++
        }
        return formattedSnapshot
    })
    if (downloadImages) {
        for (let i = 0; i < report.length; i++) {
            let snapshot = report[i]
            let name = String(snapshot.name).replace('/', '-')
            let comparisons = snapshot.comparisons;
            if (comparisons && Array.isArray(comparisons) && comparisons.length > 0) {
                for (let j = 0; j < comparisons.length; j++) {
                    let comparison = comparisons[j]
                    let images = comparison['images']
                    for (let image in images) {
                        if (images[image] == undefined) continue;
                        const imageUrl = String(images[image]?.url)
                        let dir = `${baseDir}/${image}`
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir, { recursive: true })
                        }
                        let path = `${dir}/${name}-${comparison.browser}-${comparison.width}.png`
                        try {
                            let file = await new Axios({ responseType: 'arraybuffer' }).get(imageUrl)
                            report[i].comparisons[j].images[image]['file'] = `${image}/${name}-${comparison.browser}-${comparison.width}.png`
                            fs.writeFileSync(path, file.data)
                        } catch {
                            console.error("Failed to Download: " + path)
                        }
                    }
                }
            }
        }
    }
    fs.writeFileSync(`${baseDir}/report.json`, JSON.stringify(report, undefined, 2))
    HtmlReportGenerator(config,report)
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