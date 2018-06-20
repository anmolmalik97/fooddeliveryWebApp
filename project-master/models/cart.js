var mongoose=require("mongoose");

var schema=new mongoose.Schema({
    totalqty: 0,
    totalprice: 0,
    dtotalprice: 0,
    userid:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user'
    },
    items: [{type: mongoose.Schema.Types.ObjectId,ref: 'items'}],
    discount: [{type: mongoose.Schema.Types.ObjectId,ref: 'discount'}],
});

module.exports=mongoose.model("cart",schema);