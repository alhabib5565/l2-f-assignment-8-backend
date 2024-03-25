const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("cleaning-supplies");
    const productsCollection = db.collection("products");

    app.get("/api/v1/products", async (req, res) => {
      const query = req.query;
      const modifyedQuery = {};

      if (query.brand) {
        if (Array.isArray(query.brand) && query.brand.length > 1) {
          modifyedQuery.brand = { $in: query.brand }; // Assuming brand is an array
        } else {
          console.log("sdfs");
          modifyedQuery.brand = query.brand;
        }
      }

      // Check if price range parameters are provided
      if (query.minPrice && query.maxPrice) {
        modifyedQuery.price = {
          $gte: Number(query.minPrice),
          $lte: Number(query.maxPrice),
        };
      } else if (query.minPrice) {
        modifyedQuery.price = { $gte: Number(query.minPrice) };
      } else if (query.maxPrice) {
        modifyedQuery.price = Number(query.maxPrice);
      }

      // Check if rating parameter is provided
      if (query.minRating) {
        modifyedQuery.rating = { $gte: Number(query.minRating) };
      }

      console.log(modifyedQuery);
      try {
        const result = await productsCollection.find(modifyedQuery).toArray();
        res.status(200).json({
          success: true,
          message: "successfully retrieved products data",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "product retrieved failed",
        });
      }
    });
    app.get("/api/v1/product/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.findOne(query);
        res.status(200).json({
          success: true,
          message: "successfully product supply data",
          data: result,
        });
      } catch (error) {
        console.log(error);
        res.status(400).json({
          success: false,
          message: error.message || "supply product failed",
        });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
