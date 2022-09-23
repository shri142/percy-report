# Percy Report Generator <img src="https://files.readme.io/369dd84-logo-dark-icon-32.svg" >


## Installation

```sh

npm install https://githib.com/browserstackce/percy-report.git -g

```

## Usage

Generate Report
```sh
percy-report generate [options] <buildId>
```
Note: Build ID can be found in the URL of the Percy Dashboard as well as the REST API data.
Example Build URL: `https://percy.io/<projectId>/PercyReporting/builds/<buildId>`

Options for percy-report :
```sh
  --percy-token <percyToken>      Percy ReadOnly or FullAccess Token (default: PERCY_TOKEN Environment Variable)
  --download-path <downloadPath>  Directory path where to generate the report (default: "./Report")
  --download-images               If True Images will be downloaded (default: false)
  --diff-threshold                Threshold for percentage change in snapshots (default : 1)
  -h, --help                      display help for command

```
