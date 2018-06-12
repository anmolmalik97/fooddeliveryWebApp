var mongoose=require("mongoose")
var Schema = mongoose.Schema;

var schema = new Schema({
   value: 0
});

module.exports = mongoose.model('check', schema);