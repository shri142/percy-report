# Percy Report Generator <img src="https://files.readme.io/369dd84-logo-dark-icon-32.svg" width="60" height="60" >


## Installation

```sh

npm install https://githib.com/browserstackce/percy-report.git -g

```

## Usage

```sh

percy-report generate [options] <buildId>

Generate Report

Options:
  --percy-token <percyToken>      Percy ReadOnly or FullAccess Token (default: PERCY_TOKEN Environment Variable)
  --download-path <downloadPath>  Directory path where to generate the report (default: "./Report")
  --download-images               If True Images will be downloaded (default: false)
  --diff-threshold                Threshold for percentage change in snapshots (default : 1)
  -h, --help                      display help for command

```
