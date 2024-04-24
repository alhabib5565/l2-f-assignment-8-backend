const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");

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
    const ordersCollection = db.collection("orders");
    const reviewsCollection = db.collection("reviews");
    const collection = db.collection("users");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });
    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { email: user.email, name: user.name },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.EXPIRES_IN,
        }
      );

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    //=================my code=====================
    app.post("/api/v1/product/add-product", async (req, res) => {
      try {
        const poroductData = req.body;
        const result = await productsCollection.insertOne(poroductData);
        res.status(200).json({
          success: true,
          message: "Product has been created",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "product create failed",
        });
      }
    });

    app.patch("/api/v1/product/:id", async (req, res) => {
      try {
        const updatedData = req.body;
        const id = req.params;
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: updatedData,
          }
        );
        res.status(200).json({
          success: true,
          message: "Product has been updated",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "product update failed",
        });
      }
    });
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
    app.get("/api/v1/brands", async (req, res) => {
      try {
        const result = await productsCollection
          .aggregate([
            {
              $group: {
                _id: "$brand",
                avgRating: { $avg: "$rating" },
              },
            },
            {
              $sort: { avgRating: -1 },
            },
          ])
          .toArray();
        res.status(200).json({
          success: true,
          message: "successfully retrieved brands data",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "brands data retrieved failed",
        });
      }
    });

    //=======================order related==================
    app.post("/api/v1/order/proceed", async (req, res) => {
      try {
        const reviewInfo = req.body;
        const result = await reviewsCollection.insertOne(reviewInfo);
        res.status(200).json({
          success: true,
          message: "Order proceed succesfully",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "Order proceed failed",
        });
      }
    });

    app.get("/api/v1/orders", async (req, res) => {
      try {
        const result = await ordersCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "successfully retrieved orders data",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "product retrieved failed",
        });
      }
    });

    //=======================review related==================
    app.post("/api/v1/review/add-review", async (req, res) => {
      try {
        const reviewInfo = req.body;
        const result = await reviewsCollection.insertOne(reviewInfo);
        res.status(200).json({
          success: true,
          message: "review add succesfully",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "review add failed",
        });
      }
    });

    app.get("/api/v1/review/:productId", async (req, res) => {
      try {
        const productId = req.params.productId;
        console.log(productId);
        const result = await reviewsCollection
          .aggregate([
            {
              $match: { productId: productId },
            },
          ])
          .toArray();
        res.status(200).json({
          success: true,
          message: "successfully retrieved product reviews",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "product reviews retrieved failed",
        });
      }
    });
    app.get("/api/v1/review", async (req, res) => {
      try {
        const result = await reviewsCollection.find().toArray();
        res.status(200).json({
          success: true,
          message: "successfully retrieved product reviews",
          data: result,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message || "product reviews retrieved failed",
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
