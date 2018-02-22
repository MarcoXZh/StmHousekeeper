/**
 * The job to query cnbuddy's delegators
 * @author  MarcoXZh3
 * @version 1.0.0
 */
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
const steem = require('steem');

const concatJSON = require('../../libs/concat_json');
const encryption = require('../../libs/libencryption');
const Blog = require('../../models/blog');


const fileName = __filename.replace(/\.js$/g, '');
let name = __filename.split(/[\\|/]/);
name = name[name.length-1].replace(/\.js$/g, '');
const epsilon = 1e-8;


/**
 * Entry function -- run the blogging job
 * @param {json}    options   settings for the job
 */
module.exports = function(options) {
  // Add source database keys
  if (!fs.existsSync(fileName + '.key')) {
    if (!fs.existsSync(fileName + '.log')) {
      throw new ReferenceError('No key files found for "' + name + '"');
    } // if (!fs.existsSync(fileName + '.log'))
    let obj = JSON.parse(fs.readFileSync(fileName + '.log'));
    obj = JSON.stringify(obj, null, 4);
    encryption.exportFileSync(obj, fileName + '.key', options.password);
  } // if (!fs.existsSync(fileName + '.key'))
  let keys = JSON.parse(encryption.importFileSync(fileName + '.key',
                                                  options.password));
  options = concatJSON(options, keys);
  options.source_db.uri = 'mongodb://' + options.source_db.user +
                          ':' + options.source_db.pw +
                          '@' + options.source_db.host +
                          ':27017/' + options.source_db.name;

  // Run the job
  runJob(options);
}; // module.exports = function(options) { ... };


/**
 * Run the job
 * @param {json}    options   settings for the job
 * @param {function}  callback  (optional) the callback function
 */
let runJob = function(options, callback) {
  let today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  MongoClient.connect(options.db.uri, function(err, client) {
    if (err) {
      console.error(err);
      return;
    } // if (err)
    client.db(options.db.name).collection('cners').find({})
          .toArray(function(err, res) {
      if (err) {
        console.error(err);
      } // if (err)
      let data = {total: res.length, today: today};
      steem.api.getDynamicGlobalProperties(function(err, re) {
        if (err) {
          console.error(err);
          return;
        } // if (err)
        let totalVests = Number(re.total_vesting_shares.split(' ')[0]);
        let totalSteem = Number(re.total_vesting_fund_steem.split(' ')[0]);
        data.delegators = res.map(function(e, i, arr) {
          if (e.vests <= epsilon) {
            return null;
          } // if (e.vests <= epsilon)
          e.sp = steem.formatter.vestToSteem(e.vests, totalVests, totalSteem);
          return e;
        }).filter((e)=>e).sort((a, b)=>b.vests-a.vests);
        console.log(new Date().toISOString(), name + ': delegators found');

        // Write the blog
        prepareBlog(options, data, callback);
      }); // steem.api.getDynamicGlobalProperties(function(err, re) { ... });
    }); // client.db( ... ).collection( ... ).find( ... );
  }); // MongoClient.connect(options.db.uri, function(err, client) { ... });
}; // let runJob = function(options, callback) { ... };


/**
 * Prepare writing the blog
 * @param {json}      options   settings for the job
 * @param {json}      data      the data for the blog
 * @param {function}  callback  (optional) the callback function
 */
let prepareBlog = function(options, data, callback) {
  let decimal = Math.round(Math.abs(Math.log10(options.decimal)));
  fs.readFile(fileName + options.body_ext, {encoding: 'utf8', flag: 'r'},
              function(err, text) {
    if (err) {
      throw err;
    } // if (err)
    let body = data.delegators.map(function(e, i) {
      let sp = '' + e.sp;
      let idx = sp.indexOf('.');
      if (idx < 0) {
        sp += '.00';
      } else if (idx < sp.length - decimal) {
        sp += '00';
      } // if ... else if ...
      sp = sp.substring(0, idx + decimal + 1);
      return '| ' + (i + 1) + ' | @' + e.name + ' | ' + sp + ' | ' +
             e.membertime.toISOString().split('.')[0] + ' |';
    }).join('\n'); // let body = data.delegators.map( ... ).join('\n');
    let blog = {
      created:  new Date(),
      author:         options.blog_author,
      permlink:       options.blog_author + options.permlink +
                      new Date().toISOString().split('T')[0],
      title:          options.title + ' ' +
                      data.today.toISOString().split('T')[0],
      json_metadata:  JSON.stringify(options.json_metadata),
      body:           text.toString()
                          .replace('$TODAY',      data.today.toISOString())
                          .replace('$NOW',        new Date().toISOString())
                          .replace('$COUNT',      data.delegators.length)
                          .replace('$TOTAL',      data.total)
                          .replace('$DELEGATORS', body),
    }; // let body = { ... };

    // Go publish it
    publishBlog(options, blog, callback);

    // Log the blog data
    log(options, blog);
  }); // fs.readFile( ... );
}; // let prepareBlog = function(options, data, callback) { ... };


/**
 * Publish the blog
 * @param {json}    options   settings for the job
 * @param {json}    blog      the blog in json object
 * @param {function}  callback  (optional) the callback function
 */
let publishBlog = function(options, blog, callback) {
  console.log(new Date().toISOString(), name + ': publishing');
  steem.broadcast.comment(options.users[blog.author].posting, '', 'cn', 
                          blog.author, blog.permlink, blog.title, blog.body,
                          blog.json_metadata,
                          function(err, re) {
    if (err) {
      throw err;
    } // if (err)
    console.log(new Date().toISOString(), name + ': published');
    if (callback) {
      callback(blog);
    } // if (callback)
  }); // steem.broadcast.comment( ... );
}; // let publishBlog = function(options, blog, callback) { ... };


/**
 * Log the message
 * @param {json}  options   settings for the job
 * @param {json}  body    the message body
 */
let log = function(options, body) {
  mongoose.connect(options.db.uri);
  const db = mongoose.connection;
  db.on('error', function(err) {
    console.error(err.stack);
  }); // db.on('error', function(err) {
  db.once('open', function() {
    new Blog(body).save().then(function() {
      console.log(new Date().toISOString(), name + ': logged');
    }); // new Claim(claim).save().then(function() { ... });
  }); // db.once('open', function() { ... });
}; // let log = function(options, body) { ... };
