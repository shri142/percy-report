# Percy Report Generator <img src="https://files.readme.io/369dd84-logo-dark-icon-32.svg" >


## Installation

```sh

npm install https://github.com/browserstackce/percy-report.git -g

```

<h3> Export Percy Token </h3>
Get percy Read Only or Full Access token from your percy project settings & export it

```
export PERCY_TOKEN=<read-only | full-access>
```


## Usage

<h3>Generate Report - Per Build</h3>

```sh
percy-report generate <buildId> [options]
```
Note: Build ID can be found in the URL of the Percy Dashboard as well as the REST API data.
Example Build URL: `https://percy.io/<projectId>/PercyReporting/builds/<buildId>`

<h3>Options for percy-report generate :</h3>

```sh
  --percy-token <percyToken>      Percy ReadOnly or FullAccess Token (default: PERCY_TOKEN Environment Variable)
  --download-path <downloadPath>  Directory path where to generate the report (default: "./Reports")
  --download-images               If True Images will be downloaded (default: false)
  --diff-threshold                Threshold for percentage change in snapshots (default : 1)
  -h, --help                      display help for command
```

<h3>Generate Report along with Percy Runs</h3>

Step 1 : Run the Percy Build<br>
Step 2 : Extract the Percy Build ID from the Percy run<br>
Step 3 : Execute the Percy Report Generation Step<br>

[Example](/example/percy.sh):
```sh
export PERCY_TOKEN=<your-percy-token>
BUILD_ID=$(npx percy exec -- {Test Command} | grep build | awk -F "/" '{print $NF}')
npx percy-report generate $BUILD_ID
```

<h3>Generate Project Summary</h3>

```sh
percy-report summary <project-slug> [options]
```

Note: Project Slug is equal to Project Name on your percy dashboard

<h3>Options for summary functionlity</h3>

```sh
  --percy-token <percyToken>  Percy ReadOnly or FullAccess Token
  --start-date <start-date>   Consider builds created on greater than equal to start date(mm/dd/yyyy) (Default: Today)
  --end-date <end-date>       Consider builds created on less than equal to end date(mm/dd/yyyy) (Default: Today)
  -h, --help                  display help for command
```

*Note: Interval between start date and end date should not exceed 30 days.*
