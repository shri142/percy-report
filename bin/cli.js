#!/usr/bin/env node
require('dotenv').config()
const { Command } = require('commander');
const { Generate,Summary } = require('../src');
const program = new Command();
const {endOfDay,startOfDay} = require('date-fns')
const {version} = require('../package.json')

program.name('percy-report')
.description('Generate Percy Reports & Download Images Locally')
.version(version)

program.command('generate')
.description('Genetate Report')
.argument('<buildId>')
.option('--percy-token <percyToken>',"Percy ReadOnly or FullAccess Token",process.env.PERCY_TOKEN)
.option('--download-path <downloadPath>',"Directory path where to generate the report","./Reports")
.option('--download-images',"If present Images will be downloaded",false)
.action(async (args,options)=>{
  let report = await Generate({buildId:args,...options})
})

program.command('summary')
.argument('<project-slug>')
.option('--percy-token <percyToken>',"Percy ReadOnly or FullAccess Token",process.env.PERCY_TOKEN)
.option("--start-date <start-date>","Consider builds created on greater than equal to start date(mm/dd/yyyy)",startOfDay(Date.now()))
.option("--end-date <end-date>","Consider builds created on less than equal to end date(mm/dd/yyyy)",endOfDay(Date.now()))
.description('Generate Daily Summary')
.action(async (args,options)=>{
  let summary = await Summary({projectSlug:args,...options})
})

program.parse()