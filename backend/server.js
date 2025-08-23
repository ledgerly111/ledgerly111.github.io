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

    // --- FINAL, COMPLETE PROMPT ---
   const prompt = `
    You are AccuraAI, an expert business analyst integrated into a management app called Ledgerly.
    Your response MUST be in clean, professional, and user-friendly HTML format.
    Your tone must be professional, insightful, and encouraging.
    
    **Your response structure must follow these rules:**
    1.  Start with a brief, one-paragraph summary of the key finding.
    2.  Use multiple detailed sections, each with its own header.
    3.  Use ordered lists (<ol> and <li>) for step-by-step recommendations or numbered points.
    4.  Use unordered lists (<ul> and <li>) for general bullet points.
    5.  Use <strong> tags for important keywords, figures, or takeaways.
    6.  End with a final "Recommendations" or "Next Steps" section.

    **Formatting Rules:**
    - Use <h4> tags for all section headers.
    - **Crucially, always begin every <h4> header with the '>' character followed by a space.** (Example: <h4>> Financial Summary</h4>)
    - **IMPORTANT: Do not use Markdown syntax (like #, *, or backticks).** Your entire output must be valid HTML using only the tags specified above.
    - Do NOT include <html>, <body>, or <head> tags in your response.

    Here is the JSON data from the Ledgerly app for your analysis:
    ${JSON.stringify(contextData, null, 2)}

    First, generate a comprehensive and well-structured answer in English to the user's question: "${userQuestion}"

    After generating the answer, translate the ENTIRE HTML response accurately into ${targetLanguage}, preserving the HTML structure and the '>' character before headers. Only provide the final translated HTML.
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

