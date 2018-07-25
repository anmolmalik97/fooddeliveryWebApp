var express=require("express");
var router=express.Router();
var passport=require("passport");
var middleware=require("../middleware/middle");
var User=require("../models/user");
var food=require("../models/food");
var Cart=require("../models/cart");
var items=require("../models/items");
var discounts=require("../models/discount");
var coupon=require("../models/coupon");
var order=require("../models/order");
var async= require("async");
var bcrypt=require("bcrypt-nodejs");
var nodemailer=require("nodemailer");
var crypto=require("crypto");
require('dotenv').config();

// ----------------------------------------functions------------------------------------
var reset=function resetcoupon(req,res,next){
  if(req.user){
     Cart.find({userid: req.user._id},function(err,cart){
      if(cart){
        Cart.findOneAndUpdate({userid: req.user._id},{$set: {discount: null,dtotalprice: undefined}},function(err,c){
          next();
        });
      }
      else
        {
          next();
        }

  });
  }
  else{
    next();
  }
  
 
}
// ---------------------------------------------------------------------------------------------

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
router.get('/maps',function(req,res){
  res.render('googlemapscheck');
})

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




//--------------------------------------------------------------------------------------------------------------------
//password reset logic

router.get("/forgot",reset,function(req,res){
  if(req.user){
    req.flash("error","already logged in");
    return res.redirect("/home");
  }
  res.render('forgot');
})

router.post("/forgot",function(req,res){
  User.find({username: req.body.name},function(err,user){
    if(user){
      async.waterfall([
                  function(done){
                    crypto.randomBytes(20,function(err,buf){
                      var token = buf.toString('hex');
                      done(err,token);
                    });
                  },
                  function(token,done){
                    User.findOneAndUpdate({username: req.body.name},{$set: {resetToken: token,resetExpires: Date.now() + 3600000}},{upsert: true},function(err,user1){
                      //nothing to do here 
                      done(err,user1,token);
                    });
                    
                  },
                  function(user1,token,done){
                    var smtpTransport = nodemailer.createTransport({
                      service: 'gmail',
                       auth: {
                            user: process.env.USER_NAME,
                            pass: process.env.PASSWORD
                              }
                    });
                    var mailOptions = {
                      to: user1.email,
                      from: 'support@foodezzy.com',
                      subject: "password reset",
                      text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                            'If you did not request this, please ignore this email and your password will remain unchanged.\n'

                    };
                    smtpTransport.sendMail(mailOptions, function(err) {
                      if(err) console.log(err);
                    req.flash('success', 'An e-mail has been sent to ' + user1.email + ' with further instructions.');
                    done(err, 'done');
                    });

                  }
                ],function(err){
                  res.redirect('/home');
                })
                
    }
    else{
      req.flash("error","no such user found");
      res.redirect("/forgot");
    }
  });
});


router.get("/reset/:token",reset,function(req,res){
   User.findOne({ resetToken: req.params.token, resetExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('passwordreset', {token: req.params.token});
  });
});


router.post("/reset/:token",function(req,res){
  if(req.body.password === req.body.confirmpassword){
    User.findOneAndUpdate({resetToken: req.params.token,resetExpires: {$gt: Date.now()}},{$set: {resetExpires: undefined,resetToken: undefined}},{upsert:true},function(err,user){
    if(user){
      user.setPassword(req.body.password,function(err){
        if(err) 
          {console.log(err);}
        user.save(function(err){
           req.flash("success","password changed successfully");
        res.redirect("/login");

        })
       
      });
    };
    });
  }


else{
    req.flash("error","password not same");
    res.redirect("/reset");
  }
  
});



// normal routes
// --------------------------------------------------------------------------------------------------------------------


router.get("/",reset,function(req,res){ 
   res.render("landingpage"); 
});

router.get("/home",reset,function(req,res){
  if(req.user){
    if(req.user.isAdmin)
    {
      res.redirect('/admin')
    }
  }
   res.render("home",{currentUser:req.user}); 
});

router.get("/ordernow",middleware.isLoggedIn,reset,function(req,res){
   limitrecords=3;

    function getRandomArbitrary(min, max) {
      return Math.ceil(Math.random() * (max - min) + min);
    }
    
  food.count().exec(function (err, count) {
  var skipRecords = getRandomArbitrary(1, count-limitrecords);
  food.find().skip(skipRecords).exec(
    function (err, result) {
      res.render("ordernow",{currentUser:req.user,food: result});
    })
})
});

// show register form
router.get("/signup",reset,function(req,res){
    if(req.user){
      req.flash("error","cant signup already login")
      return res.redirect("back");
    }
   res.render("signup"); 
});

router.get("/login",reset,function(req,res){
    if(req.user){
      req.flash("error","cant login already logged in")
      return res.redirect("back");
    }
   res.render("login"); 
});

router.get("/north",reset,middleware.isLoggedIn,function(req,res){

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


router.get("/south",middleware.isLoggedIn,reset,function(req,res){
    
   Cart.findOne({userid: req.user._id},function(err,cart){  
   food.find({}, function(err, food){
       if(err){
           console.log(err);
       } else {
          res.render("south",{food:food,cart:cart});
       }
    });
  });
});
  
  router.get("/chinese",middleware.isLoggedIn,reset,function(req,res){
    
   Cart.findOne({userid: req.user._id},function(err,cart){  
   food.find({}, function(err, food){
       if(err){
           console.log(err);
       } else {
          res.render("chinese",{food:food,cart:cart});
       }
    });
  });
});
  
  router.get("/shakes",middleware.isLoggedIn,reset,function(req,res){
    
    
   Cart.findOne({userid: req.user._id},function(err,cart){  
   food.find({}, function(err, food){
       if(err){
           console.log(err);
       } else {
          res.render("shakes",{food:food,cart:cart});
       }
    });
  });
});
  
//handle sign up logic
router.post("/signup", function(req, res){
  if(!(req.body.password == req.body.confirmpassword)){
    req.flash("error","passwords are not same");
    res.redirect("/signup");
  }
  else{
    
     var newUser = new User({username: req.body.username,email:req.body.email,profileUrl: "http://techtalk.ae/wp-content/uploads/2014/11/no-profile-img.gif"});

     //User.register(newUser, req.body.password, function(err, user){
         // if(err){
            // console.log(err);
              User.find({username: newUser.username},function(err,user){
               if(user.length>0){
                  req.flash("error","user with this id already exist")
                 res.redirect("/signup");
               }
               else{
                async.waterfall([
                  function(done){
                      User.register(newUser, req.body.password, function(err, user){
                      done(err,user);
                    });
                  },
                  function(user,done){
                    crypto.randomBytes(20,function(err,buf){
                      var token = buf.toString('hex');
                      done(err,token,user);
                    });
                  },
                  function(token,user,done){
                    User.findOneAndUpdate({username: user.username},{$set: {verifyToken: token,verifyExpires: Date.now() + 3600000}},{upsert: true},function(err,user1){
                      //nothing to do here 
                      done(err,user1,token,user);
                    });
                    
                  },
                  function(user1,token,user,done){
                    var smtpTransport = nodemailer.createTransport({
                      service: 'gmail',
                       auth: {
                            user: process.env.USER_NAME,
                            pass: process.env.PASSWORD
                              }
                    });
                    var mailOptions = {
                      to: user1.email,
                      from: 'support@foodezzy.com',
                      subject: "account verification",
                      text: 'You are receiving this in order to verify your email address\n\n' +
                            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                            'http://' + req.headers.host + '/verify/' + token + '\n\n' +
                            'If you did not request this, please ignore this email and your email will not be used.\n'

                    };
                    smtpTransport.sendMail(mailOptions, function(err) {
                    req.flash('success', 'An e-mail has been sent to ' + user1.email + ' with further instructions.');
                    done(err, 'done');
                    });

                  }
                ],function(err){
                  res.redirect('/home');
                })
                
                }
      
             });

             // req.flash("error",err.message);
             // res.redirect("/signup");
         // }
         //passport.authenticate("local")(req, res, function(){
         
         //});
     // });
  }
  
});

router.get("/verify/:token",function(req,res){
  User.findOneAndUpdate({verifyToken: req.params.token,verifyExpires: {$gt: Date.now()}},{$set: {isVerified:true,verifyToken: undefined,verifyExpires: undefined}},function(err,user){
    if(user){
        req.flash("success","email verified Successfully...login to continue");
        res.redirect("/login");
       

    }
    else{
      User.deleteOne({verifyToken: req.params.token},function(err){
      req.flash("error","invalid link");
      res.redirect("/home");
    });
     
    }

      
  });
});


// handling login logic
router.post("/login",passport.authenticate("local", 
    {
        failureRedirect: "/login",
        failureFlash: true
    }),function(req, res){
  if(!req.user.isVerified){
    req.logout();
    req.flash("error","email verification required for login");
    res.redirect("/login");
  }
  if (req.user.isAdmin) {
      res.redirect('/admin');
    }
    else{
      res.redirect('/ordernow');
    }
});

//facebook login

router.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}));

router.get('/auth/facebook/callback', passport.authenticate('facebook', {
   successRedirect: '/ordernow',
   failureRedirect: '/',
   failureFlash: true }));




router.get("/logout", function(req, res){
   req.logout();
   res.redirect("/home");
});
// cart logic

router.get('/:category/addtocart/:id', middleware.isLoggedIn,function(req, res, next) {
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
        Cart.findOneAndUpdate({userid: userid},{$addToSet: {items: items._id}},{upsert: false},function(err,cartss){
          res.redirect('/'+category);
      });
        })  

       
     });


    });
    
});


router.get('/shopping-cart',middleware.isLoggedIn, function(req, res, next) {

    Cart.findOne({userid: req.user._id},function(err,cart){
      if(!cart)
      {
        return res.render("shoppingcart",{cart: cart,items: null});
      }
      else{
        items.find({cartid: cart._id},function(err,items){
          if(items.length<0){
            return res.render("shoppingcart",{cart: cart,items: null});
          }
          else{
            if(req.user.address){
              return res.render("shoppingcart",{cart: cart,items: items,address: req.user.address})
            }
            else{
              return res.render("shoppingcart",{cart: cart,items: items,address: null})
            }
            
          }
        })

      }
    })

   
});

router.get('/reduce/:id',middleware.isLoggedIn, function(req, res, next) {
   
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
            Cart.findOneAndUpdate({userid: userid},{$pull: {items: item._id}},function(err,c){
            items.deleteOne({cartid: c._id,productid: productId},function(err){

         
  
          
          if(cart.totalqty<1)
        {
          Cart.deleteOne({userid: userid},function(err){

          });
        }
         });
            });
          }
          res.redirect('/shopping-cart');
       

        
      
      });
     });

   });
      
});

router.get('/remove/:id',middleware.isLoggedIn, function(req, res, next) {
  var productId = req.params.id;
  var userid=req.user._id;
    Cart.findOne({userid: userid},function(err,cart){
     if(err){
       console.log(err);
     }
     items.findOne({cartid: cart._id,productid: productId},function(err,item){
       Cart.findOneAndUpdate({userid: userid},{$inc:{totalqty:-item.qty,totalprice: -item.price},$pull: {items: item._id}},{new:true,upsert:true},function(err,cart){
        items.deleteOne({cartid: cart._id,productid: productId},function(err){ 
          if(cart.totalqty<1)
        {
          Cart.deleteOne({userid: userid},function(err){

          });}

                 res.redirect('/shopping-cart');

      });
       });
        
      });
        
     });
     
        

  
 
});


router.post('/checkout',middleware.isLoggedIn,function(req,res){
  var userid=req.user.id;
  Cart.findOne({userid: userid},function(err,cart){
    if(err){
      console.log(err)
    }

    if(!req.body.coupon){

    return res.redirect("/checkout");

    }
    discounts.findOne({code: req.body.coupon.toUpperCase(),expiryDate: {$gt: Date.now()}},function(err,coup){
      if(!(coup)){
        req.flash("error","no such coupon exist or coupon had expired");
        return res.redirect("/shopping-cart");
      }
       if(coup.usage < coup.used ){
        req.flash("error","no such coupon exist or coupon had expired");
        return res.redirect("/shopping-cart");
      }
      coupon.findOneAndUpdate({user: req.user._id,cno: coup._id},{$inc: {usage: 1},$set: {cart: cart._id}},{upsert: true,new: true},function(err,cp){
        if(cp.usage <= coup.ulimit){
        
          if(coup.type == 'p'){
            coup.used += 1;
            coup.save(function(err){
               var disc = coup.amount / 100;
              var discamount = cart.totalprice * disc;
              cart.dtotalprice = ( (discamount > coup.limit) ? cart.totalprice - coup.limit : cart.totalprice - discamount);
              cart.discount = coup._id;
              cart.save(function(err){      
                req.flash("success","coupon applied Successfully");
                return res.redirect("/checkout");
                if(err){
                  console.log(err);
                }

              
            }); 

            })
           
          }
         }
         else{
          req.flash("error","coupon can be applied only " + coup.ulimit + " times" );
         return res.redirect("/shopping-cart");
       

         }
         // 
      })
        
        
      });
    });
  });
  


router.get('/checkout',middleware.isLoggedIn,function(req,res){
  Cart.findOne({userid: req.user._id},function(err,cart){
    if(err){
      console.log(err);
    }
    if(cart.dtotalprice){
      res.render("checkout",{totalprice: cart.dtotalprice});
    }
    else{
      res.render("checkout",{totalprice: cart.totalprice});
    }
    
  })
})

router.post('/buynow',function(req,res){
  var userid=req.user.id;
  var orderid_=0;
  Cart.findOne({userid: userid},function(err,cart){
     if(err)
     {
      console.log(err)
     }
     discounts.findOne({_id:cart.discount},function(err,discount){
      if(discount){
        discount.amountdiscounted = cart.totalprice - cart.dtotalprice;
        discount.save(function(err){
           var stripe = require("stripe")(process.env.STRIPE_API_SECRET);
        stripe.charges.create({
        amount: ((cart.dtotalprice) ? cart.dtotalprice : cart.totalprice),
        currency: "usd",
        source: req.body.stripeToken, // obtained with Stripe.js
        description: "Test Charge"
    }, function(err, charge) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/checkout');
        }
      var Order = new order({
      userid: req.user.id,
      totalqty: cart.totalqty,
      totalprice: ((cart.dtotalprice) ? cart.dtotalprice : cart.totalprice),
      billingAddress: req.body.address,
      paymentId: charge.id,
      items: cart.items,
      discount: (discount ? discount.code : '-'),
    });
      Order.save(function(err,result){

        orderid_=result._id;
        items.update({cartid: cart._id},{$set: {cartid: orderid_}},{multi: true},function(err,i){

            req.flash('success', 'Successfully bought product!');
            Cart.deleteMany({userid: userid},function(err){
              res.redirect('/home');
       
    })
    
            });
            

        });
      });


        })
      }else{
          var stripe = require("stripe")(process.env.STRIPE_API_SECRET);
        stripe.charges.create({
        amount: ((cart.dtotalprice) ? cart.dtotalprice : cart.totalprice),
        currency: "usd",
        source: req.body.stripeToken, // obtained with Stripe.js
        description: "Test Charge"
    }, function(err, charge) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('/checkout');
        }
      var Order = new order({
      userid: req.user.id,
      totalqty: cart.totalqty,
      totalprice: ((cart.dtotalprice) ? cart.dtotalprice : cart.totalprice),
      address: req.body.address,
      paymentId: charge.id,
      items: cart.items,
      discount: (discount ? discount.code : '-'),
    });
      Order.save(function(err,result){

        orderid_=result._id;
        items.update({cartid: cart._id},{$set: {cartid: orderid_}},{multi: true},function(err,i){

            req.flash('success', 'Successfully bought product!');
            Cart.deleteMany({userid: userid},function(err){
              res.redirect('/home');
       
    })
    
            });
            

        });
      });

      }
      
      });
    });


        });

//profile logic
//-----------------------------------------------------------------------

router.get('/profile',middleware.isLoggedIn,reset,function(req,res,next){
  order.find({userid: req.user._id},function(err,orders){

         res.render('profile',{currentUser: req.user,orders: orders});
      }); 
  });



router.get('/orders/:id',middleware.isLoggedIn,reset,function(req,res){
  items.find({cartid: req.params.id},function(err,items){
    res.render('order',{items: items})
  });
});


//admin logic
//--------------------------------------------------------------------------------------------

router.get('/admin',middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin)
  {
    if(req.user.isAdmin)
    User.count({isAdmin: {$ne: true}},function(err,ucount){
  order.count({},function(err,ocount){
    order.aggregate([
   {$match: {}},
   {$group: {_id: null,total: {$sum: "$totalprice"}}}
 ],function(err,total){
   if(total.length>0){
    res.render("admin",{ucount: ucount, ocount: ocount, currentUser: req.user,total: total[0].total})
   }
   else{
    res.render("admin",{ucount: ucount, ocount: ocount, currentUser: req.user,total: 0})
   }
   
 })
  });
});

  }
  
  else{
    req.flash("error","permission denied")
    res.redirect("/home")
  }

  });

//edit add items logic  
//-------------------------------------------------------------------------------------------
router.get("/additem",middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin){
    res.render("additems");
  }
  else{
    req.flash("error","permission denied!");
    res.redirect("/home");
  }
  
});

router.post("/additem",upload.single('image'),function(req,res){
cloudinary.uploader.upload(req.file.path, function(result) {
    var Food= new food({name: req.body.name,category: req.body.category,price: req.body.price, image: result.secure_url, description: req.body.description,pId: result.public_id})
    Food.save(function(err,food){
      req.flash('success','product added Successfully');
      res.redirect("/additem")
    });  
  });
    
});

router.get("/discontinue",middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin)
  {
   res.render("discontinue"); 
  }
  else{
    req.flash("error","permission denied");
    res.redirect("/home");
  }
  
});

router.post("/discontinue",function(req,res){
  food.findOne({name: req.body.name},function(err,result){
    if(result)
    {
      cloudinary.uploader.destroy(result.pId,function(error,a){});
      food.deleteOne({name: req.body.name},function(err){
        req.flash("success","item discontinued");
        res.redirect("discontinue")
      });
    }
    else{
      req.flash("error","no such items!!")
      res.redirect("discontinue");

    }
    
  });
});

router.get("/edit",middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin)
  {
    res.render("edit");
  }
  else{
    req.flash("error","permission denied");
    res.redirect("/home");
  }
  
})
router.get("/edit1",middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin){
    res.render("edit1");
  }
  else{
    req.flash("error","permission denied");
    res.redirect("/home");
  }
  
});
router.post("/edit",function(req,res){
  food.findOne({name: req.body.name},function(err,result){
    if(result)
    {
      res.render("edit1",{food: result})

    }else{
      req.flash('error','no such item!!');
      res.redirect('edit');
    }
  });
});

router.post('/edit1',upload.single('image'),function(req,res){
  if(req.file)
  {
    cloudinary.uploader.destroy(req.body.pId,function(error,resultu){});
    cloudinary.uploader.upload(req.file.path, function(result) {
      food.findByIdAndUpdate(req.body.id,{$set:{name: req.body.name,price: req.body.price,category: req.body.category,description: req.body.description,pId: result.public_id,image: result.secure_url}},{upsert: true},function(err,food){
        if (err) 
        {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        req.flash('success','item edited Successfully');
        res.redirect('edit');
    });
    });

  }
  else{
     food.findByIdAndUpdate(req.body.id,{$set:{name: req.body.name,price: req.body.price,category: req.body.category,description: req.body.description}},{upsert: true},function(err,food){
        req.flash('success','item edited Successfully');
        res.redirect("edit");
      });
      }

  });
 
//admin add remove logic
//--------------------------------------------------------------------------------------------

router.get("/addadmin",middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin){
    User.find({},function(err,result){
    res.render("addadmin",{users: result,currentUser: req.user});
  })

  }else{
    req.flash("error","permission denied");
    res.redirect("/home");
  }
  
  
})

router.post("/addadmin",function(req,res){
  User.findOne({username: req.body.name},function(err,result){
    if(result){
      if(result.isAdmin === true){
        req.flash('success','already a admin');
        res.redirect('/addadmin');
      }
      else{
            User.findOneAndUpdate({username: req.body.name},{$set:{isAdmin: true}},{upsert: true},function(err,user){
              req.flash('success','admin added Successfully!!');
              res.redirect("/addadmin");

            });
            
          }
    }
    else{
      req.flash('error','no such user exist');
      res.redirect("/addadmin");
    }
  });
});

router.post("/discontinueadmin",function(req,res){
  User.findOneAndUpdate({username: req.body.name},{$set: {isAdmin: false}},function(err,result){
    req.flash("success","admin removed Successfully")
    res.redirect("/addadmin")
  });
});

//----------------------------------------------------------------------------------------------------------------------------
//promo and discount logic

//percentage coupons
// ----------------------------------------------------------------------------

router.get("/percentagediscounts",middleware.isLoggedIn,function(req,res){
  if(req.user && req.user.isAdmin){
    res.render('percentagediscount');
  }
  else{
    req.flash("error","permission denied");
    res.redirect("/home");
  }
});

router.post("/percentagediscounts",function(req,res){
  discounts.findOne({code: req.body.code.toUpperCase()},function(err,disc){
    if(!disc){
      discounts.create({code: req.body.code.toUpperCase(),type: "p",isActive: true,amount: Number(req.body.amount),expiryDate: req.body.date,usage: Number(req.body.usage),limit: Number(req.body.limit),ulimit: Number(req.body.ulimit)},function(err,d){
        req.flash("success","coupon created!!")
       return res.redirect("/percentagediscounts");
      });
        

    }
    else{
      if(disc.isActive){
         req.flash("error","coupon already exist");
         return res.redirect("/percentagediscounts");
      }else{
         discounts.findOneAndUpdate({code: req.body.code.toUpperCase()},{$set: {isActive: true,amount: Number(req.body.amount),expiryDate: req.body.date,usage: Number(req.body.usage),limit: Number(req.body.limit),ulimit: Number(req.body.ulimit)}},function(err,d){
             req.flash("success","coupon created!!")
            return res.redirect("/percentagediscounts");
         })
      }
     


    }
    
  })

})

// -----------------------------------------------------------------------------------------------------------------------------

router.get("/showdiscounts",middleware.isLoggedIn,function(req,res){
 
 if(req.user && req.user.isAdmin){
    discounts.find({},function(err,discounts){
      res.render("showdiscount",{discounts: discounts});
    })

  }
  else{
    req.flash("error,permission denied");
    res.redirect("/home");
  }
});

router.post("/discontinueDiscount/:id",function(req,res){
    if(req.user && req.user.isAdmin){
    discounts.findOneAndUpdate({_id: req.params.id},{$set: {isActive: false}},function(err,discount){
    req.flash("success","discontinued success");
    res.redirect("/showdiscounts");
  })

  }
  else{
    req.flash("error,permission denied");
    res.redirect("/home");
  }

});

router.post("/editdiscount/:discountid",function(req,res){
  discounts.findOneAndUpdate({_id: req.params.discountid},{$set: {edit: true}},function(err,discount){
  res.redirect("/editpercentagediscount");
  
    })
    
})
 router.get("/editpercentagediscount",function(req,res){
    if(req.user && req.user.isAdmin){
     discounts.findOne({edit: true},function(err,discount){
     res.render("editpercentagediscount",{discount: discount})
   })

   }
   else{
     req.flash("error,permission denied");
     res.redirect("/home");
  }
 
  
 })

 // maps routs-----------------
 router.post("/setlocation")
 //-----------------------
 





module.exports=router;