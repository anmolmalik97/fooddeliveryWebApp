var mongoose = require("mongoose");

var couponschema = new mongoose.Schema({
	cno: {type: mongoose.Schema.Types.ObjectId,ref: "discount"},
	usage: {type: Number,default: 1},
	user: {type: mongoose.Schema.Types.ObjectId,ref: "user"},
	cart: {type: mongoose.Schema.Types.ObjectId,ref: "cart"},
})

module.exports = mongoose.model("coupon",couponschema);