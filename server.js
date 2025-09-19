// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables from .env locally (do NOT push .env to Git)
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ✅ Middlewares
app.use(cors({ origin: "*" })); // Allow all origins for global access
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST endpoint for chat
app.post("/chat", async (req, res) => {
  try {
    console.log("📩 Incoming request body:", req.body);

    // Extract message
    const message = req.body?.message || req.body?.user_input;
    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required in body" });
    }

    const topic = req.body?.topic || "general";
    console.log("📝 Message:", message, "| topic:", topic);

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let aiReply = "Sorry, could not generate a response.";

    try {
      const result = await model.generateContent(message);

      if (result?.response?.text) {
        aiReply = result.response.text();
      } else if (result?.candidates?.length > 0) {
        aiReply = result.candidates[0].content || aiReply;
      }

    } catch (gemError) {
      console.error("Gemini API Error:", gemError);
      aiReply = "Gemini API error occurred.";
    }

    res.json({ reply: aiReply, topic });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
});

// 🔹 Listen on dynamic port (works locally and on hosted servers)
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Use this URL from Postman or mobile app after deployment.`);
});
