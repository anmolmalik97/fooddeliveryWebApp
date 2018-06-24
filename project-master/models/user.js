var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");


var UserSchema = new mongoose.Schema({
    username: String,
    email	: String,
    password: String, 
    profileUrl: String,
    isAdmin: {type: Boolean,default: false},
    isSuperadmin: {type:Boolean,default: false},
    pId: String,
    resetToken: String,
    resetExpires: Date,
    verifyToken: String,
    verifyExpires: Date,
    isVerified: {type:Boolean,default:false},
    orderno: Number,
    facebook:{
        id: String,
        token: String,
        email: String,
        userName: String
    }
});

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", UserSchema);