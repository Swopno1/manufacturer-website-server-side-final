const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.oiekl.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, nex) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "un-authorized access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    nex();
  });
}

async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("makers").collection("tools");
    const usersCollection = client.db("makers").collection("users");
    const ordersCollection = client.db("makers").collection("orders");

    // *** User & Admin related Routes ***
    /**
     * Verify Admin
     */
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requestAccount = await usersCollection.findOne({
        email: requester,
      });

      if (requestAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    };
    /**
     * Get admin
     */
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";

      res.send({ admin: isAdmin });
    });
    /**
     * Register New User
     */
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // Find All tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = await toolsCollection.find(query);
      const tools = await cursor.toArray();

      res.send(tools);
    });

    // Find a single tool
    app.get("/tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const cursor = await toolsCollection.findOne(query);

      res.send(cursor);
    });

    // Add new Tool
    app.post("/tool", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await toolsCollection.insertOne(product);

      res.send({ success: true, result });
    });

    // Update a tool
    app.put("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const updatedTool = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: updatedTool,
      };
      const result = await toolsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send({ success: true, result });
    });

    // Purchase/Order Related Route
    app.post("/purchase", async (req, res) => {
      const product = req.body;
      const result = await ordersCollection.insertOne(product);

      await updateStock({
        id: product.productId,
        orderQty: product.orderQuantity,
      });

      res.send({ success: true, result });
    });

    app.get("/allorders", async (req, res) => {
      const query = {};
      const cursor = await ordersCollection.find(query);
      const orders = await cursor.toArray();

      res.send(orders);
    });

    app.delete("/myorders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);
      res.send({ success: true, result });
    });

    app.put("/myorders/:id", async (req, res) => {
      const id = req.params.id;
      const updatedOrder = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: updatedOrder,
      };
      const result = await ordersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send({ success: true, result });
    });

    app.get("/myorders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { user: email };
      const cursor = await ordersCollection.find(query).toArray();

      res.send(cursor);
    });

    const updateStock = async (product) => {
      const query = { _id: ObjectId(product.id) };
      const cursor = await toolsCollection.findOne(query);
      const newStockQty =
        parseInt(cursor.availableQty) - parseInt(product.orderQty);
      const updatedProduct = { ...cursor, availableQty: newStockQty };
      const options = { upsert: true };
      const updateDoc = {
        $set: updatedProduct,
      };

      const result = await toolsCollection.updateOne(query, updateDoc, options);
    };
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
