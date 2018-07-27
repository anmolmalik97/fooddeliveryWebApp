var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    User        = require("./models/user"),
    flash       = require("connect-flash"),
    food        = require("./models/food"),
    cart        = require("./models/cart"),
    middleware  =require("./middleware/middle"),
    methodOverride = require("method-override"),
    session     =require("express-session"),
    MongoStore   =require("connect-mongo")(session),
    routes      =require("./routes/index"),
    facebookStrategy = require("passport-facebook").Strategy

mongoose.connect(process.env.db);
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());



// PASSPORT CONFIGURATION
app.use(session({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    cookie: { maxAge: 180 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.use(new facebookStrategy({
      clientID: process.env.FB_CLIENTID,
      clientSecret: process.env.FB_CLIENTSECRET,
      callbackURL: 'https://gentle-hollows-79859.herokuapp.com/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'email','picture.type(large)']
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function(){
          User.findOne({'facebook.id': profile.id}, function(err, user){
            if(err)
              return done(err);
            if(user){
              user.profileUrl = profile.photos ? profile.photos[0].value : 'http://techtalk.ae/wp-content/uploads/2014/11/no-profile-img.gif';
              user.save()
              return done(null, user);
            }
            else {
              var newUser = new User();
              newUser.facebook.id = profile.id;
              newUser.facebook.token = accessToken;
              newUser.username = profile.displayName;
              newUser.facebook.email = profile.emails[0].value;
              newUser.isVerified = true;
              newUser.profileUrl = profile.photos ? profile.photos[0].value : 'http://techtalk.ae/wp-content/uploads/2014/11/no-profile-img.gif'

              newUser.save(function(err){
                if(err)
                  throw err;
                return done(null, newUser);
              })
            }
          });
        });
      }

  ));


passport.serializeUser(function(user, done){
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
      done(err, user);
    });
  });

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   res.locals.info = req.flash("info");
   res.locals.session=req.session;
   next();
});

// ----routes---------------------------------------------------------

app.use("/",routes);

// --------routes end------------------------------------------------





app.listen(process.env.PORT || 8080,function(){
    
    console.log("Server has started");
})