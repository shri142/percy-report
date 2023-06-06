const { Generate,Summary } = require('../../src');
const {expect} = require('chai')
const fs = require('fs')
const {getLatestBuildID} = require('../util/getLatestBuildID')

let percyToken = process.env.WEB_PERCY_TOKEN;
let projectID='96514'

describe('Report to be generated',()=>{
    it('verifes if Web Percy report is generated in the ./Reports directory', async () =>{
        let buildId = await getLatestBuildID(percyToken, projectID);
        await Generate({percyToken: percyToken, buildId:buildId, downloadPath: './Reports', downloadImages: false})
        expect(fs.existsSync(`./Reports/${buildId}`)).true
        expect(fs.existsSync(`./Reports/${buildId}/report.html`)).true
        expect(fs.existsSync(`./Reports/${buildId}/report.json`)).true

    }).timeout(50000);
    it('verifes if Web Percy snpshots are downloaded', async () =>{
        let buildId = await getLatestBuildID(percyToken, projectID);
        await Generate({percyToken: percyToken, buildId:buildId, downloadPath: './Reports', downloadImages: true})
        expect(fs.existsSync(`./Reports/${buildId}/base`)).true
        expect(fs.existsSync(`./Reports/${buildId}/head`)).true
        expect(await fs.promises.readdir(`./Reports/${buildId}/base`).then(files => {
            return files.length === 0;
        })).false
        expect(await fs.promises.readdir(`./Reports/${buildId}/head`).then(files => {
            return files.length === 0;
        })).false

    }).timeout(50000);
});