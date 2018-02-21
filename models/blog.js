/**
 * The model of blog records
 */
const Mongoose = require('mongoose');


const BlogSchema = new Mongoose.Schema({
  created:        Date,
  author:         String,
  permlink:       String,
  title:          String,
  json_metadata:  String,
}); // const BlogSchema = new Mongoose.Schema({ ... });


module.exports = Mongoose.model('Blog', BlogSchema);
