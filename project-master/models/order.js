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
    paymentId: String,
    items: [{type: mongoose.Schema.Types.ObjectId,ref: 'items'}],
    discount: String,
});

module.exports = mongoose.model('Order', schema);