/**
 * The claiming job to get my rewards
 * @author  MarcoXZh3
 * @version 1.0.0
 */
const CronJob = require('cron').CronJob;
const fs = require('fs');
const mongoose = require('mongoose');
const steem = require('steem');

const concatJSON = require('../libs/concat_json');
const Claim = require('../models/claim');


const epsilon = 1e-8;
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

  // Run the job
  runAllJobs(options);
}; // module.exports = function(parentOptions) { ... };


/**
 * Run the job for all users
 * @param {json}    options   settings for the job
 */
const runAllJobs = function(options) {
  steem.api.getAccounts(Object.keys(options.users), function(err, res) {
    if (err) {
      console.error(err.stack);
      return;
    } // if (err)

    // Run claiming job for each account
    res.forEach(function(re, idx) {
      let start = options.claimStart.hour * 3600 +
                  options.claimStart.minute * 60 +
                  options.claimStart.second;
      let hour = Math.floor((start + idx * options.interClaim) / 3600);
      let minute = Math.floor((start + idx * options.interClaim) / 60) % 60;
      let second = (start + idx * options.interClaim) % 60;

      // Schedule the job
      new CronJob(second + ' ' + minute + ' ' + hour + ' * * *', function() {
        runJob(options, re, idx);
      }, null, true, 'UTC'); // new CronJob( ... );
    }); // res.forEach(function(re, idx) { ... });
  }); // steem.api.getAccountsObject.keys(options.users), ... );
}; // const runAllJobs = function(options, callback) { ... };


/**
 * Run the job for the specific user
 * @param {json}    options   settings for the job
 * @param {json}    account   the user's account
 * @param {integer} idx       index of the user from user list
 */
const runJob = function(options, account, idx) {
  let stm = parseFloat(account.reward_steem_balance.split(' ')[0]);
  let sbd = parseFloat(account.reward_sbd_balance.split(' ')[0]);
  let vest = parseFloat(account.reward_vesting_balance.split(' ')[0]);

  // Claim
  if (stm < epsilon && sbd < epsilon && vest < epsilon) {
    console.log(new Date().toISOString(),
                name + '(' + account.name + '): nothing to claim');
  } else {
    console.log(new Date().toISOString(),
                name + '(' + account.name + '): ' +
                sbd + 'SBD,' + stm + 'STEEM,' + vest + 'VEST');
    steem.broadcast.claimRewardBalance(options.users[account.name].posting,
                                       account.name,
                                       account.reward_steem_balance,
                                       account.reward_sbd_balance,
                                       account.reward_vesting_balance,
                                       function(err, re) {
      if (err) {
        console.error(err.stack);
        return;
      } // if (err)
      console.log(new Date().toISOString(),
                  name + '(' + account.name + '): claimed');
    }); // steem.broadcast.claimRewardBalance( ... );
  } // else - if (stm < epsilon && sbd < epsilon && vest < epsilon)

  // Log
  log(options, {
    author: account.name,
    time:   new Date(),
    steem:  stm,
    sbd:    sbd,
    vest:   vest,
  }); // log(options, { ... });
}; // const runJob = function(options, account, idx) { ... };


/**
 * Log the message
 * @param {json}  options   settings for the job
 * @param {json}  claim     the message of the claim
 */
let log = function(options, claim) {
  mongoose.connect(options.db.uri);
  const db = mongoose.connection;
  db.on('error', function(err) {
    console.error(err.stack);
  }); // db.on('error', function(err) {
  db.once('open', function() {
    new Claim(claim).save().then(function() {
      console.log(new Date().toISOString(),
                  name + '(' + claim.author + '): logged');
    }); // new Claim(claim).save().then(function() { ... });
  }); // db.once('open', function() { ... });
}; // let log = function(options, body) { ... };
