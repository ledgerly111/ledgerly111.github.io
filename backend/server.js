// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Use this to load environment variables from a .env file

// Create the app
const app = express();
const PORT = process.env.PORT || 10000; // Render or other services provide the PORT

// Middlewares to handle JSON and CORS
app.use(cors());
app.use(express.json());

// =================================================================
// === AI TEXT MODEL ENDPOINT (The "Brain") ===
// This endpoint receives a question and data, and returns an AI-generated HTML response.
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    const { userQuestion, contextData, targetLanguage = 'English' } = req.body;
    
    // Securely get the GEMINI API key from your server's environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('Gemini API key is not configured on the server.');
        return res.status(500).json({ error: 'AI API key not configured on the server.' });
    }
    
    // The official Google Generative AI endpoint
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // This is the detailed instruction we send to the AI model
    const prompt = `
        You are AccuraAI, an expert business analyst integrated into a management app called Ledgerly.
        Your task is to analyze the user's question and the provided JSON data and generate a comprehensive, insightful response.
        Your entire response MUST be generated directly in the following language: ${targetLanguage}.
        
        Response Structure and Formatting Rules (MUST be followed):
        1. Your response MUST be in clean, professional, and user-friendly HTML format.
        2. Use <h2> tags for all section headers.
        3. Use <ol>, <ul>, <li>, and <strong> for structure.
        4. When you mention important keywords (like "revenue", "inventory"), wrap them in an <em class="highlight"> tag.
        5. When you state a financial amount, wrap it in a span tag with a class of "positive-amount" for good numbers or "negative-amount" for cautionary numbers.
        6. Do not use Markdown. Do NOT include <html> or <body> tags.

        Here is the JSON data context for the business: 
        ${JSON.stringify(contextData, null, 2)}

        Now, answer the user's question: "${userQuestion}"

        Generate the complete HTML response directly and exclusively in ${targetLanguage}.
    `;

    try {
        // Send the request to the Gemini API
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        // Extract the HTML text from the AI's response
        const geminiHtmlResponse = geminiResponse.data.candidates[0].content.parts[0].text;
        
        // Send the clean HTML back to the frontend app
        res.json({
            htmlResponse: geminiHtmlResponse
        });

    } catch (error) {
        console.error('Error in AI backend:', error.response ? error.response.data.error : error.message);
        res.status(500).json({ error: 'Failed to get a response from the AI service.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Ledgerly AI server is running on port ${PORT}`);
});
