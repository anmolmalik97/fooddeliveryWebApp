var mongoose = require("mongoose");

var discountSchema = new mongoose.Schema({
	type: String,
	code: String,
	isActive: {type:Boolean,default: false},
	couponAmount: Number,
	limit: Number,
	usage: Number,
	description: String,
	expiryDate: Date,
	amount: {type: Number,default: 1000000000000000000000000000000},
	ulimit: {type: Number,default: 1000000000000000000000000000000},
	used: {type: Number,default: 1},
	amountdiscounted: {type: Number,default: 0},
	edit: false,
});

module.exports = mongoose.model("discount",discountSchema);