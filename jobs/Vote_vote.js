/**
 * The voting blog job under voting
 * @author  MarcoXZh3
 * @version 1.0.0
 */
const mongoose = require('mongoose');
const steem = require('steem');
const wait = require('wait-for-stuff');

const concatJSON = require('../libs/concat_json');
const {Vote, VoteBlog} = require('../models/vote');


const fileName = __filename.replace(/\.js$/, '');
let name = __filename.split(/[\\|/]/);
name = name[name.length-1].replace(/\.js$/g, '');


/**
 * Entry function -- Get blogs to be voted at this minute
 * @param {json}  options options for searching
 */
module.exports = function(options) {
  mongoose.connect(options.db.uri);
  const db = mongoose.connection;
  db.on('error', function(err) {
    console.error(err.stack);
    if (callback) {
      callback();
    } // if (callback)
  }); // db.on('error', function(err) { ... });
  db.once('open', function() {
    let end = new Date(new Date().getTime() + 60000);
    end.setUTCSeconds(0, 0);
    VoteBlog.find({status: {$eq: 'NOT'}, voted: {$lt: end}},
                  function(err, res) {
      if (err) {
        console.error(err.stack);
        return;
      } // if (err)

      // Nothing to do
      if (res.length === 0) {
        console.log(new Date().toISOString(), name + ': no blogs to vote');
        return;
      } // if (res.length === 0)

      // Log
      console.log(new Date().toISOString(),
                  name + ': voting started - ' + res.length);

      // Mark them as on voting
      VoteBlog.update({status: {$eq: 'NOT'}, voted: {$lt: end}},
                      {status: 'ING'}, {multi: true}, function(err) {
        if (err) {
          console.error(err.stack);
          return;
        } // if (err)
      }); // VoteBlog.update( ... );

      // Vote the blogs
      voteBlogs(options, res, 0, function() {
        mongoose.connection.close();
        console.log(new Date().toISOString(),
                    name + ': voting finished - ' + res.length);
      }); // voteBlogs(options, res, 0, function() { ... });
    }); // VoteBlog.find( ... );
  }); // db.once('open', function() { ... });
}; // module.exports = function(options) { ... };


/**
 * Vote the blogs, one by one
 * @param {json}      options   options for searching
 * @param {array}     blogs     all blogs to be voted
 * @param {integer}   idx       index of the current blog
 * @param {function}  callback  the callback function
 */
const voteBlogs = function(options, blogs, idx, callback) {
  let blog = blogs[idx];
  // Check voting status first
  steem.api.getActiveVotes(blog.author, blog.permlink, function(err, res) {
    if (err) {
      console.error(err.stack);
      return;
    } // if (err)

    // Already voted
    if (res.map( (b)=>b.voter ).includes(blog.voter)) { // Blog already upvoted
      // Update status
      VoteBlog.update({voter: blog.voter, author: blog.author,
                       permlink: blog.permlink }, {status: 'DONE'},
                      function(err) {
        if (err) {
          console.error(err.stack);
          return;
        } // if (err)
      }); // VoteBlog.update( ... );

      // Log
      console.log(new Date().toISOString(),
                  name + ': (' + (idx+1) + '/' + blogs.length +
                  ') already voted - voter=' + blog.voter + '; author=' +
                  blog.author + '; permlink=' + blog.permlink);

      // Go to next blog, if any
      if (idx === blogs.length - 1) {
        if (callback) {
          callback();
        } // if (callback)
      } else {
        voteBlogs(options, blogs, idx+1, callback);
      } // if (idx === authors.length - 1)

      // Do not go down to vote the current blog
      return;
    } // if (res.map( (b)=>b.voter ).includes(blog.voter))

    // Vote the current blog
    voteBlog(options, blog, function(err) {
      // Log
      if (err) {
        console.error(err.stack);
      } else {
        console.log(new Date().toISOString(),
                    name + ': (' + (idx+1) + '/' + blogs.length +
                    ') voted - voter=' + blog.voter + '; author=' +
                    blog.author + '; permlink=' + blog.permlink);
      } // if (err)

      // Go to next blog, if any
      if (idx === blogs.length - 1) {
        if (callback) {
          callback();
        } // if (callback)
      } else {
        voteBlogs(options, blogs, idx+1, callback);
      } // if (idx === authors.length - 1)
    }); // voteBlog(options, blog, function() { ... });
  }); // steem.api.getActiveVotes(blog.author, blog.permlink, ... });
}; // const voteBlogs = function(options, blogs, idx, callback) { ... };


/**
 * Vote the current blog
 * @param {json}      options   options for searching
 * @param {json}      blog      the current blog
 * @param {function}  callback  the callback function
 */
const voteBlog = function(options, blog, callback) {
  // Wait for steem to be idle
  while (options.voting) {
    wait.for.time(1);
  } // while(options.voting)

  // Vote it now
  options.voting = true;
  steem.broadcast.vote(options.users[blog.voter].posting, blog.voter,
                       blog.author, blog.permlink,
                       Math.round(options.STEEMIT_100_PERCENT * blog.weight),
                       function(err, result) {
    if (err) {
      options.voting = false;
      if (callback) {
        callback(err);
      } // if (callback)
      return;
    } // if (err)

    // Update status
    VoteBlog.update({voter: blog.voter, author: blog.author,
                     permlink: blog.permlink }, {status: 'DONE'},
                    function(err) {
      if (err) {
        console.error(err.stack);
        return;
      } // if (err)
    }); // VoteBlog.update( ... );

    // Finsh up
    setTimeout(function() {
      options.voting = false;
    }, options.interVote * 1000);
    if (callback) {
      callback();
    } // if (callback)
  }); // steem.broadcast.vote( ... );
}; // const voteBlog = function(options, blog, callback) { ... };
