require('dotenv').config()
const express=require("express");
const ejs=require("ejs");
const bodyparser=require("body-parser");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportlocalmongoose=require("passport-local-mongoose");
FacebookStrategy = require('passport-facebook').Strategy;

const app=express();

app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({extended: true}));
app.use(express.static("public"));
mongoose.set('useCreateIndex', true);

app.use(session({
    secret:"my_secret_key",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new FacebookStrategy({
    clientID: process.env.clientid,
    clientSecret: process.env.secret,
    callbackURL: "Web_Address/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({}, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true })
.then(function(){
    console.log("connected to mongoDB server");
});
const userschema=new mongoose.Schema({
    name:String,
    username: String,
    password: String
});
userschema.plugin(passportlocalmongoose);

const user=mongoose.model("User",userschema);

passport.use(user.createStrategy());
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.get("/", (req, res) =>{
    res.render("index");
});

app.get("/login", (req, res) =>{
    res.render("login",{status:""});
});

app.get("/register", (req, res) =>{
    res.render("register",{status:""});
});

app.get("/secrets",(req,res) =>{
    console.log(JSON.parse(JSON.stringify(req.session.passport)).user);
    if(req.isAuthenticated()){
        res.render("secret");
    }
    else{
        res.redirect("/login");
    }
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'read_stream' }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/secrets',
                                      failureRedirect: '/login' }));

app.post("/register",(req,res) =>{
    user.register({username:req.body.username,name:req.body.name},req.body.password,(err,users)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            var authenticate=user.authenticate();
            authenticate(req.body.username, req.body.password, function(err, result) {
                if (err) { 
                    console.log(err);
                }
                else{
                    res.redirect("/secrets");
                }
            });
        }
    });
});

app.post("/logout",(req,res)=>{
    req.logout();
    res.redirect("/login");
});

app.post('/login', passport.authenticate('local', { successRedirect: '/secrets',
                                   failureRedirect: '/login'})
);

app.listen(process.env.PORT || 3000,function(){
    console.log("Server Started");
})
