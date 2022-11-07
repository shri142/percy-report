# Percy Report Generator <img src="https://files.readme.io/369dd84-logo-dark-icon-32.svg" >


## Installation

```sh

npm install https://github.com/browserstackce/percy-report.git -g

```

## Usage

<h3>Using the Generate Report functionality independently</h3>

```sh
percy-report generate [options] <buildId>
```
Note: Build ID can be found in the URL of the Percy Dashboard as well as the REST API data.
Example Build URL: `https://percy.io/<projectId>/PercyReporting/builds/<buildId>`

<h3>Options for percy-report :</h3>

```sh
  --percy-token <percyToken>      Percy ReadOnly or FullAccess Token (default: PERCY_TOKEN Environment Variable)
  --download-path <downloadPath>  Directory path where to generate the report (default: "./Report")
  --download-images               If True Images will be downloaded (default: false)
  --diff-threshold                Threshold for percentage change in snapshots (default : 1)
  -h, --help                      display help for command
```

<h3>Using the Generate Report functionality along with Percy Runs</h3>

Step 1 : Run the Percy Build<br>
Step 2 : Extract the Percy Build ID from the Percy run<br>
Step 3 : Execute the Percy Report Generation Step<br>

[Example](/example/percy.sh):
```sh
export PERCY_TOKEN=<your-percy-token>
BUILD_ID=$(npx percy snapshot ./example/snapshots.json | grep build | awk -F "/" '{print $NF}')
npx percy-report generate $BUILD_ID
```
