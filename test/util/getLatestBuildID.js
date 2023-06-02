const { Axios } = require('axios')

const defaultConfig = {
    apiUrl: 'https://percy.io/api/v1'
}

async function getLatestBuildID(percyToken, projectID) {
    let { apiUrl } = Object.assign({}, defaultConfig)
    let axios = new Axios({
        baseURL: apiUrl,
        headers: {
            "Authorization": `Token ${percyToken}`
        }
    })
    let buildDetails = await axios.get(`/builds?project_id=${projectID}&filter\[state\]=finished&page\[limit\]=1`, { responseType: 'json'}).then((res) => {
        if (res.status == 200) {
            return JSON.parse(res.data).data[0].id
        } else {
            throw res.data
        }
    })
    return buildDetails
  }
module.exports.getLatestBuildID = getLatestBuildID
 