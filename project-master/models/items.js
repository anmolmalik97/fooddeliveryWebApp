var mongoose=require("mongoose");

var schema=new mongoose.Schema({
	cartid:{
		type: mongoose.Schema.Types.ObjectId,
		ref: "cart"
	},
	productid:{
		type: mongoose.Schema.Types.ObjectId,
		ref: "food"	
	},
	price: 0,
	qty: 0,
	name: String
});

module.exports=mongoose.model("items",schema)