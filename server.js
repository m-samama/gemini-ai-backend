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
    const mode = req.body?.mode || "chat"; // chat | evaluate

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required in body" });
    }

    console.log("📝 User:", message, "| Topic:", topic, "| Lang:", language, "| Mode:", mode);

    let systemPrompt = "";

    if (mode === "evaluate") {
      systemPrompt = `
You are an AI English evaluator.
Return ONLY valid JSON in this exact format:
{
  "fluency_score": number (0-100),
  "grammar_score": number (0-100),
  "pronunciation_score": number (0-100),
  "new_words": ["word1", "word2"],
  "ai_feedback": "short constructive feedback"
}
No explanations, no markdown, no text outside JSON.
`;
    } else {
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

    let aiReply = "";
    try {
      const result = await model.generateContent(`${systemPrompt}\nUser: ${message}`);
      aiReply = result?.response?.text?.trim() || "";
    } catch (gemError) {
      console.error("Gemini API Error:", gemError);
      return res.status(500).json({ error: "Gemini API error", details: gemError.message });
    }

    // ✅ Handle Evaluation Mode
    if (mode === "evaluate") {
      try {
        // Extract JSON only (remove extra text if Gemini added anything)
        const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI response");

        const parsed = JSON.parse(jsonMatch[0]);
        return res.json(parsed);
      } catch (e) {
        console.error("❌ JSON Parse Error:", e.message, "| AI Reply:", aiReply);
        return res.status(500).json({
          error: "Invalid JSON returned from AI",
          raw: aiReply
        });
      }
    }

    // ✅ Normal Chat Mode
    return res.json({
      reply: aiReply || "Sorry, I could not generate a response.",
      topic,
      language,
      mode
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
