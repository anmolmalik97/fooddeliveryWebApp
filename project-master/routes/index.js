var express=require("express");
var router=express.Router();
var passport=require("passport");
var middleware=require("../middleware/middle");
var User=require("../models/user");
var food=require("../models/food");
var Cart=require("../models/cart");
var items=require("../models/items");
var order=require("../models/order");
require('dotenv').config();

//multer and cloudinary for image uploads

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dtf2jwawi', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});



// config ends

//image upload route

  router.post('/upload',upload.single('image'),function(req,res){
    if(req.user.profileUrl && req.user.profileUrl.length > 0)
    {
      cloudinary.uploader.destroy(req.user.pId,function(error,resultu){});
      cloudinary.uploader.upload(req.file.path, function(result) {
     User.findByIdAndUpdate(req.user._id,{$set:{profileUrl: result.secure_url,pId: result.public_id}},{upsert: true},function(err,user){
    if (err) 
    {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    res.redirect('profile');
    });
    });
    }
    else
    {
    cloudinary.uploader.upload(req.file.path, function(result) {
    User.findByIdAndUpdate(req.user._id,{$set:{profileUrl: result.secure_url,pId: result.public_id}},{upsert: true},function(err,user){
    if (err) 
    {
      req.flash('error', err.message);
      return res.redirect('back');
    }
    res.redirect('profile');
    });
    });

    }

  
});




//




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
  alert(req.session.oldUrl);
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
       res.redirect('/'+category);
      });
     });


    });
    
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
   var userid=req.user._id;
   food.findById(productId,function(err,food){
     if(err){
      console.log(err);
     }
     Cart.findOneAndUpdate({userid: userid},{$inc:{totalqty:-1,totalprice: -food.price}},{new:true,upsert:true},function(err,cart){
      if(err){
        console.log(err);
      }
      items.findOneAndUpdate({cartid: cart._id,productid: productId},{$inc: {price: -food.price, qty: -1},$set: {name: food.name}},{new: true,upsert: true},function(err,item){
        if(item.qty<1)
           {
          items.deleteOne({cartid: cart._id,productid: productId},function(err){

          });
          if(cart.totalqty<1)
        {
          Cart.deleteOne({userid: userid},function(err){

          });
        }
          res.redirect('/shopping-cart');
        }


        

      });
     });

   });
      
});

router.get('/remove/:id', function(req, res, next) {
  var productId = req.params.id;
  var userid=req.user._id;
    Cart.findOne({userid: userid},function(err,cart){
     if(err){
       console.log(err);
     }
     items.findOne({cartid: cart._id,productid: productId},function(err,item){
       Cart.findOneAndUpdate({userid: userid},{$inc:{totalqty:-item.qty,totalprice: -item.price}},{new:true,upsert:true},function(err,cart){
        items.deleteOne({cartid: cart._id,productid: productId},function(err){ 
          if(cart.totalqty<1)
        {
          Cart.deleteOne({userid: userid},function(err){

          });
        }
         res.redirect('/shopping-cart');

      });
       });
        
      });
        
     });
     
        

  
 
});


router.get('/checkout',function(req,res){
  var userid=req.user.id;
  Cart.findOne({userid: userid},function(err,cart){
    if(err){
      console.log(err)
    }
    res.render("checkout",{totalprice: cart.totalprice})
  });
  
});

router.post('/checkout',function(req,res){
  var userid=req.user.id;
  var orderid_=0;
  Cart.findOne({userid: userid},function(err,cart){
     if(err)
     {
      console.log(err)
     }
     console.log(cart);
     console.log(cart._id);
     var stripe = require("stripe")(process.env.STRIPE_API_SECRET);
        stripe.charges.create({
        amount: cart.totalprice*100,
        currency: "usd",
        source: req.body.stripeToken, // obtained with Stripe.js
        description: "Test Charge"
    }, function(err, charge) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/checkout');
        }
        console.log("hello");
      var Order = new order({
      userid: req.user.id,
      totalqty: cart.totalqty,
      totalprice: cart.totalprice,
      address: req.body.address,
      paymentId: charge.id
    });
      Order.save(function(err,result){

        orderid_=result._id;
        console.log(orderid_)
        items.update({cartid: cart._id},{$set: {cartid: orderid_}},{multi: true},function(err,i){
          console.log(i);

            req.flash('success', 'Successfully bought product!');
            Cart.deleteMany({userid: userid},function(err){
              res.redirect('/home');
            });
            

        });
      });

      });
    });


        });

//profile logic

router.get('/profile',middleware.isLoggedIn,function(req,res){
  order.find({userid: req.user._id},function(err,orders){

         res.render('profile',{currentUser: req.user,orders: orders});
      }); 
  });



router.get('/orders/:id',function(req,res){
  items.find({cartid: req.params.id},function(err,items){
    res.render('order',{items: items})
  });
});







module.exports=router;