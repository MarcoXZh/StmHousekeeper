/**
 * The blogging job to announce cnbuddy's delegators
 * @author  MarcoXZh3
 * @version 1.2.1
 */
const CronJob = require('cron').CronJob;
const fs = require('fs');
const path = require('path');

const concatJSON = require('../libs/concat_json');


const fileName = __filename.replace(/\.js$/, '');
let name = __filename.split(/[\\|/]/);
name = name[name.length-1].replace(/\.js$/g, '');


/**
 * Entry function -- load options from setting
 * @param {json}      parentOptions   options from the parent method
 */
module.exports = function(parentOptions) {
  let options = concatJSON({}, parentOptions);
  if (fs.existsSync(fileName + '.json')) {
    let obj = JSON.parse(fs.readFileSync(fileName + '.json').toString());
    options = concatJSON(options, obj);
  } // if (fs.existsSync(fileName + '.json'))
  console.log(new Date().toISOString(), name + ': options loaded');

  // Collect all blogging jobs
  let allJobPaths = [
    // TODO: put paths of new jobs here
    path.join(__dirname, 'Blogs', 'UtopianTopics'),
    path.join(__dirname, 'Blogs', 'CnbuddyDelegators'),
  ]; // let allJobPaths = [ ... ];

  // Schedule jobs one by one
  allJobPaths.forEach(function(jobPath, idx) {
    // Load job options
    let jobOptions = concatJSON({}, options);
    if (fs.existsSync(jobPath + '.json')) {
      let obj = JSON.parse(fs.readFileSync(jobPath + '.json').toString());
      jobOptions = concatJSON(jobOptions, obj);
    } // if (fs.existsSync(jobPath + '.json'))

    // Determine job cron setting
    let start = options.blogStart.hour * 3600 +
                options.blogStart.minute * 60 +
                options.blogStart.second;
    let hour = Math.floor((start + idx * options.interBlog) / 3600);
    let minute = Math.floor((start + idx * options.interBlog) / 60) % 60;
    let second = (start + idx * options.interBlog) % 60;
    let cron = second + ' ' + minute + ' ' + hour + ' ' +
               (jobOptions.cron_postfix || '* * *');

    // Schedule the job
    new CronJob(cron, function() {
      require(jobPath)(jobOptions);
    }, null, true, 'UTC'); // new CronJob( ... );

    // Log
    let jobName = jobPath.split(/[\\|/]/);
    jobName = jobName[jobName.length - 1];
    console.log(new Date().toISOString(),
                name + ': blogging job ' + jobName + ' scheduled - "' +
                cron + '"');
  }); // allJobPaths.forEach(function(jobPath, idx) { ... });
}; // module.exports = function(parentOptions) { ... };
