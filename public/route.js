import { Router, urlencoded } from "express";
import "dotenv/config";
import MongoStore from "connect-mongo";
const mongodb_database = process.env.MONGODB_DATABASE;
var {database} = include('databaseConnection');
const pearlCollection = database.db(mongodb_database).collection('pearls');

const router = Router();

router.post('/addPearl', async (req, res) => {
  const { x, z, type, townx, townz } = req.body;
  console.log(req.body)
  if (x == null || x == NaN) {
    console.log("data invalid", req.body);
    return res.status(500).json({error: "a"});
  } else {
    await pearlCollection.insertOne({
        town: { x: townx, z: townz }, 
        type: type, 
        x: x, z: z, 
        date: new Date(),
        addedBy: req.session.username
    });
    return res.status(200).json({success: "a"});
  }
});

export default router;
