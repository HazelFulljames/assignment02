import { Router, urlencoded } from "express";
import "dotenv/config";
import MongoStore from "connect-mongo";
const mongodb_database = process.env.MONGODB_DATABASE;
var {database} = include('databaseConnection');
const pearlCollection = database.db(mongodb_database).collection('pearls');
const suggestionCollection = database.db(mongodb_database).collection('suggestions');

const router = Router();

router.post('/addPearl', async (req, res) => {
  const { x, z, type, townx, townz } = req.body;
  // console.log(req.body)
  if (x == null || x == NaN || x == '') {
    console.log("data invalid", req.body);
    return res.status(500).json({error: "a"});
  } else {
    var now = new Date();
    var utc_timestamp = Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate() , 
      now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    // var date = new Date(utc_timestamp * 1000);
    await pearlCollection.insertOne({
        town: { x: townx.toString(), z: townz.toString() }, 
        type: type, 
        x: x, z: z, 
        date: utc_timestamp,
        addedBy: req.session.username
    });
    return res.status(200).json({success: "a"});
  }
});

router.get('/getPearls', async (req, res) => {
  let pearls = await pearlCollection.find().toArray();

  return res.status(200).json({pearls: pearls});
});

router.get('/getUsername', async (req, res) => {
    // console.log(req.session.username)
    return res.status(200).json({username: req.session.username});
});

router.post('/addSuggestion', async (req, res) => {
  const { message } = req.body;
  await suggestionCollection.insertOne({
    message: message,
    addedBy: req.session.username
  });
  return res.status(200).json({message: message});
});

export default router;
