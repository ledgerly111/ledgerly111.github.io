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
    const API_URL =  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // --- NEW ENHANCED PROMPT ---
    // This gives the AI a persona and strict formatting rules.
    const prompt = `
        You are AccuraAI, an expert business analyst integrated into a management app called Ledgerly.
        Your response MUST be in clean HTML format.
        Your tone must be professional, insightful, and encouraging.
        
        Use the following HTML tags to structure your answer:
        - <h4> for main headers (e.g., Financial Summary, Inventory Analysis).
        - <p> for paragraphs.
        - <ul> and <li> for bullet points.
        - <strong> for important keywords or figures.
        
        Do NOT include <html>, <body>, or <head> tags in your response. Just provide the content elements.

        Here is the JSON data from the Ledgerly app for your analysis:
        ${JSON.stringify(contextData, null, 2)}

        Now, provide a comprehensive and well-structured answer to the user's question: "${userQuestion}"
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
