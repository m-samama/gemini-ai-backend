// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/chat", async (req, res) => {
  try {
    const message = req.body?.message || req.body?.user_input;
    const topic = req.body?.topic || "general";
    const language = req.body?.language || "en";
    const mode = req.body?.mode || "chat"; // ✅ NEW flag

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required in body" });
    }

    console.log(
      "📝 User:",
      message,
      "| Topic:",
      topic,
      "| Lang:",
      language,
      "| Mode:",
      mode
    );

    let systemPrompt = "";

    if (mode === "evaluate") {
      // ✅ Special evaluator mode (no topic restrictions)
      systemPrompt = `
You are an AI English evaluator.
Analyze the user's response and return ONLY valid JSON.
Format:
{
  "fluency_score": number (0-100),
  "grammar_score": number (0-100),
  "pronunciation_score": number (0-100),
  "new_words": [ "word1", "word2" ],
  "ai_feedback": "short constructive feedback"
}
Do NOT add explanations outside JSON.
`;
    } else {
      // ✅ Normal chat with topic restrictions
      if (language === "ur") {
        systemPrompt = `
تم ایک انگریزی بولنے والے پارٹنر ہو۔ لیکن ہمیشہ جوابات اردو میں دو تاکہ یوزر کو سمجھ آئے۔
یوزر نے یہ موضوع منتخب کیا ہے: "${topic}"۔
⚠️ قاعدہ:
- صرف اسی موضوع پر بات کرو۔
- اگر یوزر کا سوال منتخب موضوع سے ہٹ کر ہے تو جواب میں کہو:
  "یہ سوال موجودہ موضوع (${topic}) سے متعلق نہیں ہے، براہ کرم صرف اسی موضوع پر بات کریں۔"
- غیر متعلقہ سوالات پر کوئی اور جواب مت دو۔
`;
      } else {
        systemPrompt = `
You are an English speaking partner. Reply in clear and simple English.
The user has selected this topic: "${topic}".
⚠️ Rule:
- Only talk about this topic.
- If the user asks something unrelated, respond with:
  "This question is not related to the selected topic (${topic}). Please stay on topic."
- Do not answer irrelevant questions.
`;
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let aiReply = "Sorry, could not generate a response.";

    try {
      const result = await model.generateContent(
        `${systemPrompt}\nUser: ${message}`
      );
      if (result?.response?.text) {
        aiReply = result.response.text();
      }
    } catch (gemError) {
      console.error("Gemini API Error:", gemError);
      aiReply = "Gemini API error occurred.";
    }

    res.json({ reply: aiReply, topic, language, mode });
  } catch (error) {
    console.error("Server Error:", error);
    res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
