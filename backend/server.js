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
    const prompt = `
        You are an expert business analyst AI. Your response MUST be properly formatted HTML with correct spacing.
        
        CRITICAL RULES:
        1. ALWAYS include proper spaces between ALL words in your response
        2. Use <h2> tags for main headers
        3. Use <p> tags for ALL paragraphs
        4. Use <ul> and <li> for bullet points
        5. Use <strong> for bold text
        6. Wrap important keywords in <em class="highlight"> tags
        7. Wrap financial amounts in <span class="positive-amount"> or <span class="negative-amount">
        
        IMPORTANT: Your text MUST have normal spacing between words. Never concatenate words together.
        
        Example of CORRECT format:
        <h2>Financial Analysis</h2>
        <p>Your current <em class="highlight">revenue</em> shows positive growth trends.</p>
        <ul>
            <li>Total sales: <span class="positive-amount">$5,000</span></li>
            <li>Net profit margin: 25%</li>
        </ul>
        
        NEVER return text without spaces like "Thisistextwithoutspaces". 
        ALWAYS ensure proper word spacing like "This is text with spaces".

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
