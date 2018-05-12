var express=require("express");
var router=express.Router();
var passport=require("passport");
var middleware=require("../middleware/middle");
var User=require("../models/user");
var food=require("../models/food");
var Cart=require("../models/cart");
var items=require("../models/items");

router.get("/",function(req,res){
    
   res.render("landingpage"); 
});

router.get("/home",function(req,res){
    
   res.render("home",{currentUser:req.user}); 
});

router.get("/ordernow",middleware.isLoggedIn,function(req,res){
 res.render("ordernow",{currentUser:req.user});
 console.log(req.user);


});

// show register form
router.get("/signup",function(req,res){
    
   res.render("signup"); 
});

router.get("/login",function(req,res){
    
   res.render("login"); 
});

router.get("/north",function(req,res){

  Cart.findOne({userid: req.user._id},function(err,cart){  
   food.find({}, function(err, food){
       if(err){
           console.log(err);
       } else {
          res.render("north",{food:food,cart:cart});
       }
    });
  });
});


router.get("/south",function(req,res){
    
   res.render("south"); 
});
  
  router.get("/chinese",function(req,res){
    
   res.render("chinese"); 
});
  
  router.get("/shakes",function(req,res){
    
   res.render("shakes"); 
});
  
//handle sign up logic
router.post("/signup", function(req, res){
    var newUser = new User({username: req.body.username,email:req.body.email});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
          console.log(err);
            req.flash("error",err.message);
            res.redirect("/signup");
        }
        passport.authenticate("local")(req, res, function(){
           res.redirect("/home"); 
        });
    });
});


// handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/ordernow",
        failureRedirect: "/login",
        failureFlash: true
    }), function(req, res){
});

router.get("/logout", function(req, res){
   req.logout();
   res.redirect("/home");
});
// cart logic

router.get('/:category/addtocart/:id', function(req, res, next) {
    var productId = req.params.id;
    var category=req.params.category;
    var userid=req.user._id;
    food.findById(productId,function(err,food){
     if(err){
      console.log(err);
     }
     Cart.findOneAndUpdate({userid: userid},{$inc:{totalqty:1,totalprice: food.price}},{new:true,upsert:true},function(err,cart){
      if(err){
        console.log(err);
      }
      items.findOneAndUpdate({cartid: cart._id,productid: productId},{$inc: {price: food.price, qty: 1},$set: {name: food.name}},{new: true,upsert: true},function(err,items){
        console.log(cart);
        console.log(items);
      });
     });


    });
    res.redirect('/'+category);
});


router.get('/shopping-cart', function(req, res, next) {

    Cart.findOne({userid: req.user._id},function(err,cart){
      if(!cart)
      {
        res.render("shoppingcart",{cart: cart,items: null});
      }
      else{
        items.find({cartid: cart._id},function(err,items){
          if(items.length<0){
            res.render("shoppingcart",{cart: cart,items: null});
          }
          else{
            res.render("shoppingcart",{cart: cart,items: items})
          }
        })

      }
    })

   
});

router.get('/reduce/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.user.cart ? req.user.cart : {});

    cart.reduceByOne(productId);
    var id=req.user._id;
    User.findByIdAndUpdate({id},{$set: {cart: cart}},{upsert: true});
    res.redirect('/shopping-cart');
});

router.get('/remove/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.user.cart ? req.user.cart : {});

    cart.removeItem(productId);
    var id=req.user._id;
    User.findByIdAndUpdate({id},{$set: {cart: cart}},{upsert: true});
    res.redirect('/shopping-cart');
});


module.exports=router;