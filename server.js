require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

/// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// Define Schema
const BookSchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  title: String,
  authors: [String],
  publisher: String,
  publishedDate: String,
  scannedAt: { type: Date, default: Date.now },
});

const Book = mongoose.model("Book", BookSchema);

// Function to fetch book details
const fetchBookDetails = async (isbn) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    if (response.data.items) {
      const bookInfo = response.data.items[0].volumeInfo;
      return {
        title: bookInfo.title || "Unknown Title",
        authors: bookInfo.authors || ["Unknown Author"],
        publisher: bookInfo.publisher || "Unknown Publisher",
        publishedDate: bookInfo.publishedDate || "Unknown Date",
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching book details:", error);
    return null;
  }
};

// API Route to Save Barcode & Fetch Book Info
app.post("/books", async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: "Barcode is required" });
    }

    // Fetch book details from API
    const bookDetails = await fetchBookDetails(barcode);

    const book = new Book({
      barcode,
      ...bookDetails, // Spread API data into MongoDB
    });

    await book.save();
    res.status(201).json({ message: "Book saved successfully!", book });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/books", async (req, res) => {
  try {
    const books = await Book.find().sort({ scannedAt: -1 }); // Sort by latest scanned
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

app.listen(4000, () => console.log("Server running on port 4000"));
