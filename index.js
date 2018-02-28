/**
 * Main entry of the steemit housekeeper
 * @author  MarcoXZh3
 * @version 0.3.0
 */
const fs = require('fs');
const steem = require('steem');

const concatJSON = require('./libs/concat_json');
const encryption = require('./libs/libencryption');
const blog = require('./jobs/Blog.js');
const claim = require('./jobs/Claim.js');
const vote = require('./jobs/Vote.js');


// Set up options
if (!fs.existsSync('pw.log')) {
  throw new ReferenceError('No owner\'s password file found');
} // if (!fs.existsSync('pw.log'))
let options = {
  password: fs.readFileSync('pw.log', 'utf8').toString().trim(),
}; // let options = { ... };

// Generate keys if necessary
if (!fs.existsSync('keys')) {
  if (!fs.existsSync('keys.log')) {
    throw new ReferenceError('No key files found');
  } // if (!fs.existsSync('keys.log'))
  let obj = JSON.parse(fs.readFileSync('keys.log').toString());
  obj = JSON.stringify(obj, null, 4);
  encryption.exportFileSync(obj, 'keys', options.password);
} // if (!fs.existsSync('keys'))

// Concatenate options with keys
let keys = JSON.parse(encryption.importFileSync('keys', options.password));
let obj = JSON.parse(fs.readFileSync('options.json', 'utf8').toString());
options = concatJSON(options, obj);
options = concatJSON(options, keys);
options.db.uri = 'mongodb://' + options.db.user + ':' + options.db.pw +
                 '@localhost:27017/' + options.db.name;

// Config steem to avoid unhandled error WebSocket not open
steem.api.setOptions({url: 'https://api.steemit.com'});
/* steem.api.getConfig( ... )
  STEEMIT_MIN_ROOT_COMMENT_INTERVAL = 300000000;    // Post every 300s = 5min
  STEEMIT_MIN_REPLY_INTERVAL = 20000000;            // Reply every 20s
  STEEMIT_MIN_VOTE_INTERVAL_SEC = 3;                // Vote every 3s
*/
options.interBlog   = 360; // 5min + 60s
options.interReply  = 23;  //  20s +  3s
options.interVote   = 4;   //   3s +  1s
options.interClaim  = 60;  // No regulation, so just pick 60s
options.claimStart  = {hour: 0, minute: 0, second: 10};
options.voteStart   = {hour: 0, minute: 0, second: 20};
options.blogStart   = {hour: 0, minute: 0, second: 30};
options.replyStart  = {hour: 0, minute: 0, second: 40};

// Start jobs
claim(options);
vote(options);
blog(options);
