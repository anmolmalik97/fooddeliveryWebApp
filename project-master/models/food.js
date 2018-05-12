var mongoose=require("mongoose");

var foodschema=new mongoose.Schema({
	name: String,
	category: String,
	price: Number,
	image: String,
	description: String
});

module.exports=mongoose.model("food",foodschema);