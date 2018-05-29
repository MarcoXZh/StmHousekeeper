/**
 * The voting job to vote blogs
 * @author  MarcoXZh3
 * @version 1.0.1
 */
const CronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const fs = require('fs');
const steem = require('steem');

const concatJSON = require('../libs/concat_json');
const searchBlogs = require('./Vote_search');
const voteBlogs = require('./Vote_vote');
const VoteBlog = require('../models/vote').VoteBlog;

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

  // Prereuisites - to mark blogs on voting to be not voted
  mongoose.connect(options.db.uri);
  const db = mongoose.connection;
  db.on('error', function(err) {
    console.error(err.stack);
    if (callback) {
      callback();
    } // if (callback)
  }); // db.on('error', function(err) { ... });
  db.once('open', function() {
    VoteBlog.update({status: {$eq: 'ING'}}, {status: 'NOT'}, {multi: true},
                    function(err) {
      if (err) {
        console.error(err.stack);
        return;
      } // if (err)
      mongoose.connection.close();
    }); // VoteBlog.update( ... );
  }); // db.once('open', function() { ... });

  // Schedule searching blogs
  new CronJob(options.voteStart.second + ' */5 * * * *', function() {
    runSearchJob(options);
  }, null, true, 'UTC'); // new CronJob( ... );

  // Load steem configuratioins
  steem.api.getConfig(function(err, re) {
    if (err) {
      console.error(err.stack);
      return;
    } // if (err)
    options.STEEMIT_100_PERCENT
      = re.STEEMIT_100_PERCENT ||
        re.STEEM_100_PERCENT;

    // Schedule voting blogs
    // new CronJob(new Date(new Date().getTime() + 1000), function() {
    new CronJob((options.voteStart.second+5)%60 + ' * * * * *', function() {
      voteBlogs(options);
    }, null, true, 'UTC'); // new CronJob( ... );
  }); // steem.api.getConfig(function(err, re) { ... });
}; // module.exports = function(parentOptions) { ... };


/**
 * Run the search job for all users
 * @param {json}    options   settings for the job
 */
const runSearchJob = function(options) {
  let level = -1;
  // Determine users
  let users = {};
  Object.keys(options.users).forEach(function(user) {
    let us = Object.keys(options.users);
    us.splice(us.indexOf(user), 1);
    users[user] = {};
    users[user][JSON.stringify(us)] = 0;
  }); // Object.keys(options.users).forEach(function(user) { ... });
  Object.keys(options.allFollows).forEach(function(k) {
    let v = parseInt(k);
    options.allFollows[k].forEach(function(user) {
      users[user] = {};
      users[user][JSON.stringify(Object.keys(options.users))] = v;
      if (level < v) {
        level = v;
      } // if (level < v)
    }); // options.allFollows[k].forEach(function(user) { ... });
  }); // Object.keys(options.allFollows).forEach(function(k) { ... });

  // Each user
  Object.keys(options.users).forEach(function(user) {
    let follows = options.users[user].follows;
    Object.keys(follows).forEach(function(k) {
      let v = parseInt(k) + level;
      follows[k].forEach(function(u) {
        users[u] = {};
        users[u][JSON.stringify([user])] = v;
        if (level < v) {
          level = v;
        } // if (level < v)
      }); // follows[k].forEach(function(user) { ... });
    }); // Object.keys(follows).forEach(function(k) { ... });
  }); // Object.keys(options.users).forEach( ... );
  if (options.maxLevel < level) {
    options.maxLevel = level;
  } // if (options.maxLevel < level)
  console.log(new Date().toISOString(), name + ': users determined');

  // Search within users
  searchBlogs(options, users, function() {
    console.log(new Date().toISOString(), name + ': searching finished');
  }); // searchBlogs(options, users, function() { ... });
}; // const runSearchJob = function(options) { ... };
