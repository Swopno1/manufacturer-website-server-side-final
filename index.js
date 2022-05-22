const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Makers Server!");
});

app.listen(port, () => {
  console.log(`Makers Server run at port: ${port}`);
});
