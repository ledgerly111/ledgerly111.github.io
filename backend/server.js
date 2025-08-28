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
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    const { userQuestion, contextData, targetLanguage = 'English' } = req.body;
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('Gemini API key is not configured on the server.');
        return res.status(500).json({ error: 'AI API key not configured on the server.' });
    }
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // THIS IS THE NEW, STRICTER PROMPT
  // In server (3).js

// THIS IS THE NEW, STRICTER PROMPT FOCUSED ON FORCING HTML OUTPUT
const prompt = `
    You are an expert business analyst AI. Your entire response MUST be valid HTML. Do NOT use Markdown or plain text.

    CRITICAL FORMATTING RULES:
    1.  The entire response MUST be structured with valid HTML tags.
    2.  Use <h2> for main headers.
    3.  Use <p> for all paragraphs and sentences. Every piece of text must be inside a tag.
    4.  Use <ul> and <li> for bullet points.
    5.  Use <strong> for bold text.
    6.  Wrap important business keywords (like "revenue", "inventory") in an <em class="highlight"> tag.
    7.  Wrap financial amounts in a <span class="positive-amount"> or <span class="negative-amount"> tag.

    HERE IS A PERFECT EXAMPLE of the required output format:
    <h2>This is a Header</h2>
    <p>This is a paragraph of text. One important keyword is <em class="highlight">inventory</em>.</p>
    <ul>
        <li>This is the first bullet point.</li>
        <li>This is the second bullet point with a <span class="positive-amount">$500</span> profit.</li>
    </ul>
    <p>This is another paragraph.</p>

    CRITICAL RULE REMINDER: Unformatted plain text is strictly forbidden. For example, instead of 'Hello world', your output must be '<p>Hello world</p>'. You must provide a valid HTML response with normal spaces between words.

    Here is the JSON data context for the business: 
    ${JSON.stringify(contextData, null, 2)}

    Now, answer the user's question: "${userQuestion}"

    Generate the complete HTML response in ${targetLanguage}, following all rules and the example format exactly.
`;
    try {
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        const geminiHtmlResponse = geminiResponse.data.candidates[0].content.parts[0].text;
        
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


