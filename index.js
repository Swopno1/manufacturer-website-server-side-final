const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

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
    return res.status(401).send({ message: 'un-authorized access' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    req.decoded = decoded;
    nex();
  });
}

async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db('makers').collection('tools');
    const usersCollection = client.db('makers').collection('users');
    const ordersCollection = client.db('makers').collection('orders');

    // *** User & Admin related Routes ***
    /**
     * Verify Admin
     */
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requestAccount = await usersCollection.findOne({
        email: requester,
      });

      if (requestAccount.role === 'admin') {
        next();
      } else {
        res.status(403).send({ message: 'forbidden access' });
      }
    };
    /**
     * Get admin
     */
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';

      res.send({ admin: isAdmin });
    });
    /**
     * Register New User
     */
    app.put('/user/:email', async (req, res) => {
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
        { expiresIn: '1h' }
      );
      res.send({ result, token });
    });
    /**
     * Verify Existing User
     * As the Put request can serve the purpose, this will skip for now
     */
    // app.get('/user/:email', verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   const filter = { email: email };
    //   const user = await usersCollection.findOne(filter);

    //   const token = jwt.sign(
    //     { email: email },
    //     process.env.ACCESS_TOKEN_SECRET,
    //     { expiresIn: '1h' }
    //   );
    //   res.send({ user, token });
    // });

    // Find All tools
    app.get('/tools', async (req, res) => {
      const query = {};
      const cursor = await toolsCollection.find(query);
      const tools = await cursor.toArray();

      res.send(tools);
    });

    // Find a single tool
    app.get('/tools/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const cursor = await toolsCollection.findOne(query);

      res.send(cursor);
    });

    // Purchase Related Route
    app.post('/purchase', async (req, res) => {
      const product = req.body;
      const result = await ordersCollection.insertOne(product);

      res.send({ success: true, result });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Makers Server!');
});

app.listen(port, () => {
  console.log(`Makers Server run at port: ${port}`);
});
