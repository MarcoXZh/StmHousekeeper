/**
 * The model of claim records
 */
const Mongoose = require('mongoose');


const ClaimSchema = new Mongoose.Schema({
  author: String,
  time:   Date,
  steem:  Number,
  sbd:    Number,
  vest:   Number,
}); // const ClaimSchema = new Mongoose.Schema({ ... });


module.exports = Mongoose.model('Claim', ClaimSchema);
