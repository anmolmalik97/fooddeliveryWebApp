var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    userid: 
    {
    	type: mongoose.Schema.Types.ObjectId,
     	ref: 'User'
 	},
    totalqty: 0,
    totalprice: 0,
    address: String,
    paymentId: String
});

module.exports = mongoose.model('Order', schema);