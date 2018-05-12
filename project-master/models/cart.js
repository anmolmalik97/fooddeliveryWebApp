var mongoose=require("mongoose");

var schema=new mongoose.Schema({
    totalqty: 0,
    totalprice: 0,
    userid:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user'
    }
});

module.exports=mongoose.model("cart",schema);