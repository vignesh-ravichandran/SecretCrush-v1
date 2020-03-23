var express =require("express"),
	bodyParser=require("body-parser"),
	session   =require("express-session"),
    passport=require("passport"),
	 Strategy = require('passport-facebook').Strategy,
    mongoose=require("mongoose");

var app=express();
var User  	=require("./models/user");

mongoose.connect(process.env.MONGOSTR, { useNewUrlParser: true }).then(()=>{
	console.log('DB connected');
	
}).catch(err=>{
	console.log('Error:',err.message);
})


app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

  

//passport
var FACEBOOK_APP_ID=process.env.APPID;
var FACEBOOK_APP_SECRET=process.env.APPSECRET;


passport.use(new Strategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: 'https://secret-crush-facebook.herokuapp.com/return',
	 profileFields: ['id', 'displayName','friends', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
	
	
     return cb(null, profile);
	
  }
));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


app.use(require("express-session")({
	secret: "Start with why the fuck",
	resave: false,
	saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());





//routes
app.get("/",function(req,res){
	
	User.find({},function(err,user){
		if(err){}else{
			res.render("landing",{count:user.length});
		}
	})
	
	
	
})

app.get('/login/facebook',
  passport.authenticate('facebook',{ scope: ['user_friends'] }));

app.get('/return', 
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
	
	
    res.redirect('/index');
  });

app.get("/index",require('connect-ensure-login').ensureLoggedIn('/'),function(req,res){
	
	
	var friendidarray=[];
	req.user._json.friends.data.forEach(function(friendid){
		//console.log(friendid.id);
		var frie={
			name:friendid.name,
			id:friendid.id
		}
		friendidarray.push(frie);
	});
	
	//console.log(friendidarray);
	
	
	
	User.findOneAndUpdate({id:req.user.id},{id:req.user.id,name:req.user.displayName},{upsert: true, new: true, runValidators: true},function(err,user){
		if(err){console.log("no user exists");}{
			//console.log(user);
			user.friends=friendidarray;
			user.save(function(err,user){
				console.log(user);
				res.render("index",{user:user});
			})
		}
	});
	//console.log("user created");
	
	
});
app.post("/index",require('connect-ensure-login').ensureLoggedIn('/'),function(req,res){
	
	
	
	console.log(req.body.id);
	console.log(req.body.name);
	console.log(req.user.displayName);
	//req.user.id
	//req.body.id
	
	
	User.findOne({id:req.user.id},function(err,user){
		if(err){}else{
			console.log("found user");
			//likemap:{}
			//user.likemap.set('ds','da');
			if(user.like.includes(req.body.id)){
				console.log("already there");
				
				res.redirect("/index");
			}else{
				console.log("not found so adding now");
				
				user.like.push(req.body.id);
				user.liketotal.push({name:req.body.name, id:req.body.id});
				
				
							user.save(function(err,user){
					if(err){}else{
						//search another user for mutual like
						User.findOne({id:req.body.id},function(err,muser){
							if(err){}else{
								console.log("printing muser");
								console.log(muser);
								if(muser.like.includes(req.user.id)){
									
									muser.mlike.push(req.user.id);
									muser.mliketotal.push({name:req.user.displayName,id:req.user.id});
									user.mlike.push(req.body.id);
									user.mliketotal.push({name:req.body.name,id:req.body.id});
									
									muser.save(function(err,musers){
										if(err){}else{
											user.save(function(err, users){
												if(err){}else{
													console.log("somehow worked");
													res.redirect("/index");
												}
											})
										}
									})
									
									
									
								}else{
									res.redirect("/index");
								}
							}
						})
						
					}
				})						 }
			
		}
	});
	
	
	
	
})

app.get("/test",require('connect-ensure-login').ensureLoggedIn('/'),function(req,res){
	res.send("test page for ensured login");
});


//remove from liked list
app.post("/remove",require('connect-ensure-login').ensureLoggedIn('/'),function(req,res){
		 
		 User.findOne({id:req.user.id},function(err,user){
			 if(err){}else{
				 
				 const index=user.like.indexOf(req.body.id);
			 
				if (index > -1) {
  				user.like.splice(index, 1);
					}	
				 
				 //remove from liketotal
				 var removeIndex = user.liketotal.map(function(item) { return item.id; }).indexOf(req.body.id);

// remove object      
				 console.log("here removing from liketotal");
				 console.log(removeIndex);
				 console.log(user.liketotal);
						user.liketotal.splice(removeIndex, 1);
				 //save and redirect
				 
				 user.save(function(err,user){
					 if(err){}else{
						 res.redirect("/index");
					 }
				 });
			 } 
				 })
				 
		 
			 
			 
		 })
		 
		 
app.post("/unmatch",function(req,res){
	
	//req.user.id -->current user
	//req.body.id -->unliked person
	
	//remove from mlike of both and mliketotal
	User.findOne({id:req.body.id},function(err,muser){
		if(err){}else{
			console.log("unmatch route printing muser");
			console.log(muser);
			
			const index=muser.mlike.indexOf(req.user.id);			 
				if (index > -1) {
  				muser.mlike.splice(index, 1);
					}	//removed from mlike of muser
			var removeIndex = muser.mliketotal.map(function(item) { return item.id; }).indexOf(req.user.id);
						muser.mliketotal.splice(removeIndex, 1); //removed from mliketotal of muser
			//now to remove things on current user
			muser.save(function(err,musers){
				if(err){}else{
					//process for current user
					User.findOne({id:req.user.id},function(err,user){
						if(err){}else{
							
							const indexl=user.mlike.indexOf(req.body.id);			 
				if (indexl > -1) {
  				user.mlike.splice(indexl, 1);
					}	//removed from mlike of muser
			var removeIndexl = user.mliketotal.map(function(item) { return item.id; }).indexOf(req.body.id);
						user.mliketotal.splice(removeIndexl, 1); //removed from mliketotal of muser
							
							//for like array
							const indexm=user.like.indexOf(req.body.id);			 
				if (indexm > -1) {
  				user.like.splice(indexm, 1);
					}	//removed from like of user
			var removeIndexm = user.liketotal.map(function(item) { return item.id; }).indexOf(req.body.id);
						user.liketotal.splice(removeIndexm, 1); //removed from liketotal of user
							
							user.save(function(err,users){
								if(err){}else{
									res.redirect("/index");
								}
							})
							
						}
						
						
					})
					
					
				}
				
				
			})
			
			
			
			
		}
		
	})
	//remove from like of current user alone and liketotal
	
	
});		

app.get("/about",require('connect-ensure-login').ensureLoggedIn('/'),function(req,res){
	
	res.render("about");
});


app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/");
});




app.listen(process.env.PORT,function(){
	console.log("Secret Crush app is up and running");
})

