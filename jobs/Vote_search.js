/**
 * The searching blog job under voting
 * @author  MarcoXZh3
 * @version 1.0.0
 */
const mongoose = require('mongoose');
const steem = require('steem');

const concatJSON = require('../libs/concat_json');
const VoteBlog = require('../models/vote').VoteBlog;


let name = __filename.split(/[\\|/]/);
name = name[name.length-1].replace(/\.js$/g, '');
const hugeNumber = 9999999999999999;
const maxBlogs = 100;


/**
 * Entry function -- load options from setting
 * @param {json}      options   options for searching
 * @param {json}      users     user information for searching
 * @param {function}  callback  callback function
 */
module.exports = function(options, users, callback) {
  mongoose.connect(options.db.uri);
  const db = mongoose.connection;
  db.on('error', function(err) {
    console.error(err.stack);
    if (callback) {
      callback();
    } // if (callback)
  }); // db.on('error', function(err) { ... });
  db.once('open', function() {
    searchAllUsers(options, users, 0, function() {
      mongoose.connection.close();
      if (callback) {
        callback();
      } // if (callback)
    }); // searchAllUsers(options, users, 0, function() { ... });
  }); // db.once('open', function() { ... });
}; // module.exports = function(options, users, callback) { ... };


/**
 * Search blogs of all users, one by one
 * @param {json}      options   options for searching
 * @param {json}      users     user information for searching
 * @param {integer}   idx       index of the current user
 * @param {function}  callback  callback function
 */
const searchAllUsers = function(options, users, idx, callback) {
  let authors = Object.keys(users);
  let author = authors[idx];
  console.log(new Date().toISOString(),
              name + ': searching (' + (idx+1) + '/' + authors.length +
              ') - author=' + author);
  steem.api.getBlog(author, hugeNumber, maxBlogs, function(err, res) {
    if (err) {
      console.error(err.stack);
      if (idx === authors.length - 1) {
        if (callback) {
          callback();
        } // if (callback)
      } else {
        searchAllUsers(options, users, idx+1, callback);
      } // if (idx === authors.length - 1)
      return;
    } // if (err)

    // Search for today's blogs published by the author
    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let blogs = res.map(function(e) {
      let blog = e.comment;
      if (blog.author !== author) {       // no re-blogs
        return null;
      } // if (blog.author !== author)
      blog.created = new Date(blog.created);
      if (blog.created.getTime() < today.getTime()) {
        return null;                      // only today's blogs
      } // if (blog.created < today)
      return {
        status:     'NOT',
        created:    blog.created,
        voted:      new Date(new Date().getTime() + 1000 * options.voteDelay),
        weight:     0.0,                  // To be determined
        voter:      null,                 // To be determined
        author:     blog.author,
        permlink:   blog.permlink,
        title:      blog.title,
      }; // return { ... };
    }).filter( (e)=>e ).slice(0, options.blogNumber); // let blogs = ...;

    // No blogs at all
    if (blogs.length === 0) {
      console.log(new Date().toISOString(),
                  name + ': no blogs found - author=' + author);
      if (idx === authors.length - 1) {
        if (callback) {
          callback();
        } // if (callback)
      } else {
        searchAllUsers(options, users, idx+1, callback);
      } // else - if (idx === authors.length - 1)
      return;
    } // if (blogs.length === 0)

    // Prepare new blogs, those not saved yet, and assign voter and weight
    getNewBlogs(options, blogs, 0, users[author], [], function(newBlogs) {
      // No new blogs
      if (newBlogs.length === 0) {
        console.log(new Date().toISOString(),
                    name + ': no new blogs found - author=' + author);
        if (idx === authors.length - 1) {
          if (callback) {
            callback();
          } // if (callback)
        } else {
          searchAllUsers(options, users, idx+1, callback);
        } // else - if (idx === authors.length - 1)
        return;
      } // if (newBlogs.length === 0)

      // Save new blogs
      saveBlogs(options, newBlogs);

      // Go next if possible, no need to wait for saving done
      if (idx === authors.length - 1) {
        if (callback) {
          callback();
        } // if (callback)
      } else {
        searchAllUsers(options, users, idx+1, callback);
      } // else - if (idx === authors.length - 1)
    }); // getNewBlogs( ... );
  }); // steem.api.getBlog(author, hugeNumber, maxBlogs, ... );
}; // const searchAllUsers = function(options, users, idx, callback) { ... };


/**
 * Get new blogs from all today's blogs
 * @param {json}      options   options for searching
 * @param {array}     blogs     today's blogs
 * @param {integer}   idx       index of the current blog
 * @param {json}      user      the user information
 * @param {array}     newBlogs  new found blogs
 * @param {function}  callback  callback function
 */
const getNewBlogs = function(options, blogs, idx, user, newBlogs, callback) {
  let blog = blogs[idx];
  VoteBlog.find({author: blog.author, permlink: blog.permlink},
                 function(err, res) {
    if (err) {
      console.error(err.stack);
      if (idx === blogs.length - 1) {
        if (callback) {
          callback(newBlogs);
        } // if (callback)
      } else {
        getNewBlogs(options, blogs, idx+1, user, newBlogs, callback);
      } // else - if (idx === blogs.length - 1)
      return;
    } // if (err)

    // Not a new found blog
    if (res.length > 0) {
      if (idx === blogs.length - 1) {
        if (callback) {
          callback(newBlogs);
        } // if (callback)
      } else {
        getNewBlogs(options, blogs, idx+1, user, newBlogs, callback);
      } // else - if (idx === blogs.length - 1)
      return;
    } // if (res.length > 0)

    // The blog is new
    let voters = JSON.parse(Object.keys(user)[0]);
    blog.weight = 1.0 - Object.values(user)[0] * 1.0 / options.maxLevel;
    voters.forEach(function(voter) {
      let newBlog = concatJSON({}, blog);
      newBlog.voter = voter;
      newBlogs.push(newBlog);
    }); // voters.forEach(function(n) { ... });

    // Finish up on the last blog
    if (idx === blogs.length - 1) {
      if (callback) {
        callback(newBlogs);
      } // if (callback)
    } else {
      getNewBlogs(options, blogs, idx+1, user, newBlogs, callback);
    } // else - if (idx === blogs.length - 1)
  }); // VoteBlog.find( ... );
}; // const getNewBlogs = function(options, blogs, idx, user, newBlogs, ... );


/**
 * Save the blog to database
 * @param {json}      options   options for searching
 * @param {array}     blogs     the blogs to be saved
 */
const saveBlogs = function(options, blogs) {
  blogs.forEach(function(blog) {
    new VoteBlog(blog).save().then(function() {
      console.log(new Date().toISOString(),
                  name + ': blog saved - voter=' + blog.voter + '; weight=' +
                  blog.weight + '; author=' + blog.author + '; permlink=' +
                  blog.permlink);
    }); // new VoteBlog(blog).save().then(function() { ... });
  }); // blogs.forEach(function(blog) { ... });
}; // const saveBlogs = function(options, blogs) { ... };
