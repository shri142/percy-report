const { Summary } = require('../../src');
const {expect} = require('chai')
const fs = require('fs')
const {endOfDay,startOfDay} = require('date-fns')

let percyToken = process.env.WEB_PERCY_TOKEN;
let projectSlug='percy-demo'
describe('Report to be generated',()=>{
    it('verifes if Web Percy Project Summary is generated in the ./Summary directory', async () =>{
        let startDate=startOfDay(Date.now())
        let endDate=endOfDay(Date.now())
        let directoryPath="./Summary"
        if (fs.existsSync(directoryPath)) {
          fs.rmSync(directoryPath, { recursive: true });
          console.log(`Directory '${directoryPath}' deleted successfully.`);
        }
        await Summary({percyToken: percyToken, projectSlug:projectSlug,startDate:startDate,endDate:endDate})
        expect(fs.existsSync(`./Summary`)).true

    }).timeout(50000);
});