const fs = require('fs')
const ejs = require('ejs');
function HtmlReportGenerator(config,jsonReport){
    let { buildId,  downloadPath } = config
    const template = fs.readFileSync('src/template/report.html',{encoding:'utf-8'}).toString()
    let htmlReport = ejs.render(template,{buildId,...jsonReport})
    fs.writeFileSync(`${downloadPath}/${buildId}/report.html`,htmlReport)
}

module.exports.HtmlReportGenerator = HtmlReportGenerator