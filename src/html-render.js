const fs = require('fs')
const ejs = require('ejs');
const path = require('path')

function HtmlReportGenerator(config, jsonReport, isApp) {
    let {
        buildId,
        downloadPath
    } = config
    let template_path = path.resolve(__dirname, 'template/report.html')
    const template = fs.readFileSync(template_path, {
        encoding: 'utf-8'
    }).toString()
    const babel = fs.readFileSync(path.resolve(__dirname,'template/babel.min.js'),{encoding:'utf8'}).toString()
    let htmlReport = ejs.render(template, {
        babel:babel,
        reactdom:fs.readFileSync(path.resolve(__dirname,'template/react-dom.production.min.js')).toString('utf-8'),
        react: fs.readFileSync(path.resolve(__dirname,'template/react.production.min.js')).toString('utf-8'),
        data: Buffer.from(JSON.stringify({
            buildId,
            ...jsonReport
        })).toString('base64')
    })
    fs.writeFileSync(`${downloadPath}/${buildId}/report.html`, htmlReport)
}

function HtmlSummary(summary, filename, isApp) {
    if (isApp) {
        let template_path = path.resolve(__dirname, 'template/app-summary.html')
        const template = fs.readFileSync(template_path, {
            encoding: "utf-8"
        }).toString()
        try {
            let htmlSummary = ejs.render(template, summary)
            fs.writeFileSync(filename, htmlSummary)
        } catch (err) {
            console.log(err)
        }
    } else {
        let template_path = path.resolve(__dirname, 'template/summary.html')
        const template = fs.readFileSync(template_path, {
            encoding: "utf-8"
        }).toString()
        try {
            let htmlSummary = ejs.render(template, summary)
            fs.writeFileSync(filename, htmlSummary)
        } catch (err) {
            console.log(err)
        }
    }

}

module.exports.HtmlReportGenerator = HtmlReportGenerator
module.exports.HtmlSummary = HtmlSummary