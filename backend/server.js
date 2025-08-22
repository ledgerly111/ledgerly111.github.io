// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Create the app
const app = express();
const PORT = process.env.PORT || 10000; // Render will provide the PORT

// Middlewares to handle JSON data and allow cross-origin requests
app.use(cors()); // Allows your GitHub Pages app to talk to this server
app.use(express.json());

// This is your single API endpoint
app.post('/api/ask-ai', async (req, res) => {
    // Get the question and data from your frontend app
    const { userQuestion, contextData } = req.body;
    
    // Get the secret API key safely from Render's environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured on the server.' });
    }
    
    // The URL for the AI API (this is an example for Google's Gemini)
   // The URL for the AI API (this is an example for Google's Gemini)
   const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // We combine the user's question with the JSON data to create a powerful prompt
    const prompt = `
**System Instructions:**
You are AccuraAI, an expert business intelligence assistant integrated into the Ledgerly application. Your tone is professional, insightful, and concise. You have been provided with a real-time JSON object containing the relevant data from the application's database.

**Your Task:**
1.  Analyze the provided JSON data to answer the user's question.
2.  Your answer MUST be well-structured and to the point. Use markdown for formatting (like **bolding** for key terms and bullet points for lists).
3.  **Crucially, NEVER mention that you are basing your answer on JSON data.** Act as if you have direct, internal access to the application's data. Do not use phrases like "Based on the provided JSON..."

---
**JSON Data:**
${JSON.stringify(contextData, null, 2)}
---
**User's Question:**
"${userQuestion}"
---
**Your Answer:**
`;

    try {
        // Make the secure call to the AI API from the backend
        const response = await axios.post(API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        // Send the AI's answer back to your frontend app
        res.json(response.data);

    } catch (error) {
        console.error('Error calling AI API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to get a response from the AI.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

});

