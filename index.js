
require("./utils.js");

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 12;

const port = process.env.PORT || 3000;

const app = express();

const Joi = require("joi");


const expireTime = 60 * 60 * 1000; //expires after 1 hour  (minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
})

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

function isValidSession(req) {
    if (req.session.authenticated) {
        return true;
    }
    return false;
}

function sessionValidation(req,res,next) {
    if (isValidSession(req)) {
        next();
    }
    else {
        res.redirect('/login');
    }
}


function isAdmin(req) {
    if (req.session.user_type == 'admin') {
        return true;
    }
    return false;
}

function adminAuthorization(req, res, next) {
    if (!isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", {error: "Not Authorized"});
        return;
    }
    else {
        next();
    }
}

app.get('/', (req,res) => {
    res.render("index", {
		authenticated: req.session.authenticated,
		username: req.session.username
	});
});

app.get('/promote/:email', adminAuthorization, async (req,res) => {
	let email = req.params.email

	const result = await userCollection.updateOne(
            { "email": email },
            { "$set": {"user_type": "admin"} }
    );

	console.log(result);
	if (result) {

		res.redirect('/admin');
		return;
	}
});

app.get('/demote/:email', adminAuthorization, async (req,res) => {
	let email = req.params.email
	const result = await userCollection.updateOne(
            { "email": email },
            { "$set": {"user_type": "normal"} }
    );

	console.log(result);
	if (result) {

		res.redirect('/admin');
		return;
	}
});

app.get('/admin', adminAuthorization, async (req,res) => {
	const result = await userCollection.find().toArray();

    res.render("admin", {
		users: result
	});
});

app.get('/nosql-injection', async (req,res) => {
	var username = req.query.user;

	if (!username) {
		res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
		return;
	}
	console.log("user: "+username);

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);

	//If we didn't use Joi to validate and check for a valid URL parameter below
	// we could run our userCollection.find and it would be possible to attack.
	// A URL parameter of user[$ne]=name would get executed as a MongoDB command
	// and may result in revealing information about all users or a successful
	// login without knowing the correct password.
	if (validationResult.error != null) {  
	   console.log(validationResult.error);
	   res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
	   return;
	}	

	const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

	console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});

app.get('/createUser', (req,res) => {
    res.render("createUser");
});

app.get('/login', (req,res) => {
    res.render("login");
});

app.get('/login/fail', (req,res) => {
    res.render("loginFail");
});

app.post('/submitUser', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
	var user_type = "normal";

	const schema = Joi.object(
		{
			username: Joi.string().alphanum().max(20).required(),
            email: Joi.string().required(),
			password: Joi.string().max(20).required(),
			user_type: Joi.string().required(),
		});
	
	const validationResult = schema.validate({username, email, password, user_type});
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/createUser");
	   return;
   }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
	
	await userCollection.insertOne({username: username, email: email, password: hashedPassword, user_type: user_type});
	console.log("Inserted user");

    var html = "successfully created user";
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;
	req.session.user_type = "normal";

    res.redirect('/loggedIn');
});

app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/login");
	   return;
	}

	const result = await userCollection.find({username: username, email: email}).project({username: 1, email: 1, password: 1, user_type: 1, _id: 1}).toArray();

	console.log(result);
	if (result.length != 1) {
		console.log("user not found");
		res.redirect("/login/fail");
		return;
	}
	if (await bcrypt.compare(password, result[0].password)) {
		console.log("correct password");
		req.session.authenticated = true;
		req.session.username = username;
		req.session.cookie.maxAge = expireTime;
		req.session.user_type = result[0].user_type;

		res.redirect('/loggedin');
		return;
	}
	else {
		console.log("incorrect password");
		res.redirect("/login/fail");
		return;
	}
});

app.get('/loggedin', (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
	let catSrc = "";
    let rand = Math.floor(Math.random() * 3);
    if (rand == 0) {
        catSrc = "/fluffy.gif";
    }
    else if (rand == 1) {
        catSrc = "/socks.gif";
    } else if (rand == 2) {
        catSrc = "/cat-fire.gif";
    }

    res.render("loggedin", {
		username: req.session.username,
		cat: catSrc
	});
});

app.get('/logout', (req,res) => {
	req.session.destroy();
    res.redirect('/login');
});

app.use(express.static(__dirname + "/public"));

app.get("*", (req,res) => {
	res.status(404);
	res.render("404");
})

app.listen(port, () => {
	console.log("Node application listening on port "+port);
}); 