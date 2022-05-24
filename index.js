const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/test", (req, res) => {
  res.send("Makers Test Server!");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.oiekl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("makers").collection("tools");
    const usersCollection = client.db("makers").collection("users");
    const adminsCollection = client.db("makers").collection("admins");

    // Find All tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = await toolsCollection.find(query);
      const tools = await cursor.toArray();
      console.log(tools);

      res.send(tools);
    });

    // Find a single tool
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const cursor = await toolsCollection.findOne(query);

      res.send(cursor);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Makers Server!");
});

app.listen(port, () => {
  console.log(`Makers Server run at port: ${port}`);
});
