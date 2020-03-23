var passport=require("passport"),
	 Strategy = require('passport-facebook').Strategy,
    mongoose=require("mongoose");



var userSchema=new mongoose.Schema({
	name: String,
	id: String,
	friends:[{
		name:String,
		id:String
	}],
	like:[],
	liketotal:[{
		name:String,
		id:String
	}],
	mlike:[],
	mliketotal:[{
		name:String,
		id:String
	}]
});


module.exports=mongoose.model("User", userSchema);
