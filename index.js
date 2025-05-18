import "./utils.js";
import "dotenv/config";
import { fileURLToPath } from 'url';
import path from 'path';
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcrypt";
const saltRounds = 12;

import route from "./public/route.js";

const port = process.env.PORT || 3000;

const app = express();
import Joi from "joi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day (hours * minutes * seconds * millis)

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
const pearlCollection = database.db(mongodb_database).collection('pearls');

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));
app.use(express.json());

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

app.use("/route", route);

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

app.get('/promote/:username', adminAuthorization, async (req,res) => {
	let username = req.params.username

	const result = await userCollection.updateOne(
            { "username": username },
            { "$set": {"user_type": "admin"} }
    );

	// console.log(result);
	if (result) {

		res.redirect('/admin');
		return;
	}
});

app.get('/demote/:username', adminAuthorization, async (req,res) => {
	let username = req.params.username
	const result = await userCollection.updateOne(
            { "username": username },
            { "$set": {"user_type": "normal"} }
    );

	// console.log(result);
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
	// console.log("user: "+username);

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

	// console.log(result);

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
	var user_type = "normal";

	const schema = Joi.object(
		{
			username: Joi.string().alphanum().max(20).required(),
			password: Joi.string().max(20).required(),
			user_type: Joi.string().required(),
		});
	
	const validationResult = schema.validate({username, password, user_type});
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/createUser");
	   return;
   	}
	const result = await userCollection.find({username: username}).toArray();
	if (result.length != 0) {
		// console.log("username taken");
		res.redirect("/createUser");
		return;
	}

    var hashedPassword = await bcrypt.hash(password, saltRounds);
	
	await userCollection.insertOne({username: username, password: hashedPassword, user_type: user_type});
	// console.log("Inserted user");

    var html = "successfully created user";
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;
	req.session.user_type = "normal";

    res.redirect('/loggedIn/-1/0');
});

app.post('/loggingin', async (req,res) => {
    var username = req.body.username;
    var password = req.body.password;

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);
	if (validationResult.error != null) {
	   console.log(validationResult.error);
	   res.redirect("/login");
	   return;
	}

	const result = await userCollection.find({username: username}).project({username: 1, password: 1, user_type: 1, _id: 1}).toArray();

	// console.log(result);
	if (result.length != 1) {
		// console.log("user not found");
		res.redirect("/login/fail");
		return;
	}
	if (await bcrypt.compare(password, result[0].password)) {
		// console.log("correct password");
		req.session.authenticated = true;
		req.session.username = username;
		req.session.cookie.maxAge = expireTime;
		req.session.user_type = result[0].user_type;

		res.redirect('/loggedin/-1/0');
		return;
	}
	else {
		// console.log("incorrect password");
		res.redirect("/login/fail");
		return;
	}
});

function sameDay(date1, date2) {
	return date1.getFullYear() === date2.getFullYear() &&
	date1.getMonth() === date2.getMonth() &&
	date1.getDate() === date2.getDate();
}

app.get('/loggedin/:x/:z', async (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
		
    }
	// Get requested town
	var x = req.params.x;
	var z = req.params.z;
	var townObject = {x: x, z: z};
	// Find all pearls in town
	// Return as array [{town: {x, z}, type: 'red', x: 0, z: 0, date: dateTime}]
	const result = await pearlCollection.find({town: townObject}).toArray();
	// Filter out the ones that aren't today
	var pearls = [];
	
	result.forEach(pearl => {
		if (sameDay(pearl.date, new Date()))
		pearls.push([pearl.type, pearl.x, pearl.z]);
	});

	// console.log(pearls);
    res.render("loggedin", {
		username: req.session.username,
		pearlsList: pearls
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