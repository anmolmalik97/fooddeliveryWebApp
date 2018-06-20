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
    routes      =require("./routes/index")

mongoose.connect("mongodb://localhost/onlinefoodapp");
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
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


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





app.listen(8080,function(){
    
    console.log("Server has started");
})