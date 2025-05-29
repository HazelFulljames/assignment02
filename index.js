import "./utils.js";
import "dotenv/config";
import { fileURLToPath } from 'url';
import path from 'path';
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import fs from "fs";
import bcrypt from "bcrypt";
const saltRounds = 12;

import route from "./public/route.js";

const port = process.env.PORT || 3000;

const app = express();
import Joi from "joi";
import { text } from "stream/consumers";

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

function isVerified(req) {
    if (req.session.user_type == 'verified') {
        return true;
    }
    return false;
}

function verifiedAuthorization(req, res, next) {
    if (!isVerified(req) && !isAdmin(req)) {
        res.status(403);
        res.render("errorMessage", {error: "Website on Lockdown. Not authorized"});
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
            { "$set": {"user_type": "verified"} }
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

    res.redirect('/');
});

app.get('/stats', sessionValidation, verifiedAuthorization, async (req,res) => {
	
	let townx = "-1";
	let townz = "0";
	const result = await pearlCollection.find({town: {x: townx, z: townz}}).toArray();
	var content = [];
	result.forEach(pearl => {
		content.push({color: pearl.type, x: pearl.x, z: pearl.z, townx: townx, townz: townz});
	});
	console.log(content)
	let countedContent = [];
	for (let i = 0; i < content.length; i++) {
		let exists = false;
		for (let j = 0; j < countedContent.length; j++) {
			if (
				countedContent[j].x == content[i].x
				&& countedContent[j].z == content[i].z
				&& countedContent[j].townx == content[i].townx
				&& countedContent[j].townz == content[i].townz
			) {
				exists = true;
				countedContent[j].count++;
			}
		}
		if (!exists) {
			countedContent.push({x: content[i].x, z: content[i].z, townx: content[i].townx, townz: content[i].townz, count: 1});
		}
	}

	let unsorted = true;
	// While unsorted
	while (unsorted) {
		unsorted = false;
		// Loop through array
		for (let i = 0; i < countedContent.length - 1; i++) {
			// If pearlsCount < array+1.pearlsCount
			if (countedContent[i].count < countedContent[i+1].count) {
				unsorted = true;
				// Swap
				let temp = countedContent[i];
				countedContent[i] = countedContent[i+1];
				countedContent[i+1] = temp;
			}
		}
	}
	console.log(countedContent)

	let textContent = "[";
	countedContent.forEach(pearl => {
		textContent += `{x: ${pearl.x}, z: ${pearl.z}, townx: ${pearl.townx}, townz: ${pearl.townz}, count: ${pearl.count}},`
	});
	textContent += "]";
	fs.writeFile('./test.txt', textContent, err => {
	if (err) {
		console.error(err);
	} else {
		// file written successfully
	}
	});
    res.render("stats");
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

	console.log(result);
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

		res.redirect('/');
		return;
	}
	else {
		// console.log("incorrect password");
		res.redirect("/login/fail");
		return;
	}
});

function sameDay(date1, date2) {
	// console.log(date1.getUTCFullYear(), date2.getUTCFullYear())
	// console.log(date1.getUTCMonth(), date2.getUTCMonth())
	// console.log(date1.getUTCDate(), date2.getUTCDate())
	// console.log(date1, date1.getUTCDate(), date2, date2.getUTCDate(), new Date(date1))
	return date1.getUTCFullYear() === date2.getUTCFullYear() &&
	date1.getUTCMonth() === date2.getUTCMonth() &&
	date1.getUTCDate() === date2.getUTCDate();
}

app.get('/loggedin/:x/:z', verifiedAuthorization, async (req,res) => {
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
		// console.log(pearl.date, new Date(), sameDay(pearl.date, new Date()))
		// console.log(pearl.x)
		var now = new Date;
		var utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate() , 
		now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
		if (sameDay(new Date(pearl.date), new Date(utc_timestamp))) {
			
			if (pearl.addedBy) {
				pearls.push([pearl.type, pearl.x, pearl.z, pearl.addedBy, pearl._id]);
			} else {
				pearls.push([pearl.type, pearl.x, pearl.z, "unknown", pearl._id]);
			}
		}
	});
	
	//console.log(pearls, result);
	let url = "/"+x+","+z+".png";

	if (!fs.existsSync("./public/"+url)) {
		url = "/notfound.png"
	}

    res.render("loggedin", {
		username: req.session.username,
		pearlsList: pearls,
		url: url
	});
});

app.get('/loggedin/:x/:z/:color', verifiedAuthorization, async (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
		
    }
	var x = req.params.x;
	var z = req.params.z;
	var color = req.params.color;
	var townObject = {x: x, z: z};
	const result = await pearlCollection.find({town: townObject}).toArray();
	var pearls = [];
	result.forEach(pearl => {
		var now = new Date;
		var utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate() , 
		now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
		if (sameDay(new Date(pearl.date), new Date(utc_timestamp)) && pearl.type == color) {
			
			if (pearl.addedBy) {
				pearls.push([pearl.type, pearl.x, pearl.z, pearl.addedBy, pearl._id]);
			} else {
				pearls.push([pearl.type, pearl.x, pearl.z, "unknown", pearl._id]);
			}
		}
	});
	let url = "/"+x+","+z+".png";
	if (!fs.existsSync("./public/"+url)) {
		url = "/notfound.png"
	}
    res.render("loggedin", {
		username: req.session.username,
		pearlsList: pearls,
		url: url
	});
});

app.get('/loggedin/:x/:z/all', verifiedAuthorization, async (req,res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
	var x = req.params.x;
	var z = req.params.z;
	var townObject = {x: x, z: z};
	const result = await pearlCollection.find({town: townObject}).toArray();
	var pearls = [];
	
	result.forEach(pearl => {
		if (pearl.addedBy) {
			pearls.push([pearl.type, pearl.x, pearl.z, pearl.addedBy, pearl._id]);
		} else {
			pearls.push([pearl.type, pearl.x, pearl.z, "unknown", pearl._id]);
		}
	});
	let url = "/"+x+","+z+".png";
	if (!fs.existsSync("./public/"+url)) {
		url = "/notfound.png"
	}
    res.render("loggedin", {
		username: req.session.username,
		pearlsList: pearls,
		url: url
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