/**
 * The model of vote records
 */
const Mongoose = require('mongoose');


const VoteSchema = new Mongoose.Schema({
  voter:    String,
  weight:   Number,
  time:     Date,
  author:   String,
  permlink: String,
}); // const VoteSchema = new Mongoose.Schema({ ... });


module.exports.Vote = Mongoose.model('Vote', VoteSchema);


const VoteBlogSchema = new Mongoose.Schema({
  status:   String,         // 'NOT', 'ING', 'DONE'
  created:  Date,
  voted:    Date,
  weight:   Number,
  voter:    String,
  author:   String,
  permlink: String,
  title:    String,
}); // const VoteBlogSchema = new Mongoose.Schema({ ... });


module.exports.VoteBlog = Mongoose.model('VoteBlog', VoteBlogSchema);
