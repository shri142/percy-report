const { Axios } = require('axios')
const { startOfDay, startOfWeek, endOfDay, endOfWeek, isAfter, isBefore,intervalToDuration } = require('date-fns')
const fs = require('fs')
const { HtmlSummary } = require('./html-render')
const defaultOptions = {
    percyToken: process.env.PERCY_TOKEN,
    apiUrl: 'https://percy.io/api/v1',
}
module.exports.Summary = async function (opts) {
    let { percyToken, startDate, endDate, projectSlug, apiUrl } = Object.assign(defaultOptions, opts)
    startDate = new Date(startDate)
    endDate = new Date(endDate)
 
    if(!startDate){
        throw new Error("Start Date is required")
    }
    if(!endDate){
        throw new Error("End Date is required")
    }
    if(intervalToDuration({start:startDate,end:endDate}).days > 30){
        throw new Error("Interval between start & end date should be less than 30days")
    }

    let axios = new Axios({
        baseURL: apiUrl,
        headers: {
            "Authorization": `Token ${percyToken}`
        }
    })

    let project = await axios.get(`/projects?project_slug=${projectSlug}`, { responseType: 'json' }).then((res) => {
        if (res.status == 200) {
            return JSON.parse(res.data)
        } else {
            throw res.data
        }
    })
    const useCompTag = project['data']['attributes']['type'] == 'app' || project['data']['attributes']['type'] == 'automate'
    let projectId = project.data.id
    let projectURL = "https://percy.io/"+project.data.attributes['full-slug']
    let projectName = project.data.attributes.name
    let browsers = project["included"].filter((i) => i['type'] == 'browser-families')?.map((v) => v['attributes'].name)
    const buildSummary = async (cursor, _summary) => {
        let done = false
        let urlParams = {
            project_id: projectId,
            'page[limit]': 100,
        }
        let summary = Object.assign({
            totalBuilds: 0,
            totalBuildsApproved: 0,
            totalBuildsUnreviewed:0,
            totalBuildsFailed:0,
            totalBuildsRequestingChanges:0,
            totalSnapshots: 0,
            totalSnapshotsRequestingChanges: 0,
            totalSnapshotsUnreviewed: 0,
            totalSnapshotsReviewed: 0,
            totalComparisons: 0,
            projectURL: projectURL,
            unreviewedBuilds:[],
            failedBuilds:[]
        },_summary)
        if (cursor) {
            urlParams['page[cursor]'] = cursor
        }
        let _builds = await axios.get('/builds', { params: urlParams, responseType: 'json' }).then((res) => {
            if (res.status == 200) {
                return JSON.parse(res.data)
            } else {
                throw res.data
            }
        })
        for (let build of _builds.data) {
            let createdAt = new Date(build.attributes["created-at"])
            if (isBefore(createdAt, startDate)) {
                done = true;
                continue
            }
            if (isBefore(createdAt, endDate) && isAfter(createdAt, startDate)) {
                summary['totalBuilds']++;
                if (build['attributes']['review-state'] == 'approved') {
                    summary['totalBuildsApproved']++
                }
                if(build['attributes']['review-state'] == 'unreviewed'){
                    summary['totalBuildsUnreviewed'] ++
                    summary['unreviewedBuilds'].push({
                        timestamp:new Date(build.attributes["created-at"]),
                        buildUrl:build['attributes']['web-url'],
                        buildNo:build['attributes']['build-number']
                    })
                }
                if(build['attributes']['review-state'] == null){
                    summary['totalBuildsFailed'] ++;
                    summary['failedBuilds'].push({
                        timestamp:new Date(build.attributes["created-at"]),
                        buildUrl:build['attributes']['web-url'],
                        buildNo:build['attributes']['build-number']
                    })
                }
                if(build['attributes']['review-state'] == 'changes_requested'){
                    summary['totalBuildsRequestingChanges'] ++;
                }
                summary['totalSnapshots'] += build['attributes']['total-snapshots']
                summary['totalSnapshotsRequestingChanges'] += build['attributes']['total-snapshots-requesting-changes']
                summary['totalSnapshotsUnreviewed'] += build['attributes']['total-snapshots-unreviewed']
                summary['totalSnapshotsReviewed'] += (build['attributes']['total-snapshots'] - build['attributes']['total-snapshots-unreviewed'])
                summary['totalComparisons'] += build['attributes']['total-comparisons']
            }
        }
        if (done) {
            return summary
        } else {
            if (_builds.data.length > 0) {
                return buildSummary(_builds.data[_builds.data.length - 1].id,summary)
            } else {
                return summary;
            }
        }
    }

    let summary = await buildSummary()
    summary = {
        ...summary,
        browsers,
        projectName,
        startDate,
        endDate
    }
    if(!fs.existsSync('Summary') ){
        fs.mkdirSync('Summary',{recursive:true})
    }
    fs.writeFileSync(`Summary/${summary.projectName}-${Date.now()}.json`,JSON.stringify(summary,undefined,2))
    HtmlSummary(summary,`Summary/${summary.projectName}-${Date.now()}.html`, useCompTag)
    console.log("Summary report generated")
    return summary;

}