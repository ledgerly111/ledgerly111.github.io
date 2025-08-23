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
    // Get the target language from the request, default to English
    const { userQuestion, contextData, targetLanguage = 'English' } = req.body;
    
    // Get the secret API key safely from Render's environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key not configured on the server.' });
    }
    
    // The URL for the AI API using the corrected model name
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // --- START: CORRECTED AND SIMPLIFIED PROMPT ---
    const prompt = `
    You are AccuraAI, an expert business analyst integrated into a management app called Ledgerly.

    Your task is to analyze the user's question and the provided JSON data and generate a comprehensive, insightful response.

    **Your entire response MUST be generated directly in the following language: ${targetLanguage}.**

    **Response Structure and Formatting Rules (MUST be followed):**
    1.  Your response MUST be in clean, professional, and user-friendly HTML format.
    2.  Use <h4> tags for all section headers.
    3.  **Crucially, always begin every <h4> header with the '>' character followed by a space.** (Example for Spanish: <h4>> Resumen Financiero</h4>)
    4.  Use <ol> and <ul> for lists, and <strong> for important keywords.
    5.  Your tone must be professional, insightful, and encouraging.
    6.  **Do not use Markdown syntax (like #, *, or backticks).**
    7.  Do NOT include <html>, <body>, or <head> tags in your response.

    Here is the JSON data from the Ledgerly app for your analysis:
    ${JSON.stringify(contextData, null, 2)}

    Now, answer the user's question: "${userQuestion}"
    
    Remember, generate the complete HTML response directly and exclusively in ${targetLanguage}.
    `;
    // --- END: CORRECTED AND SIMPLIFIED PROMPT ---

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
