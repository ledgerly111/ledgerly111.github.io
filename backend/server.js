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
// === AI TEXT MODEL ENDPOINT (The "Brain") - NEW & IMPROVED ===
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    // Destructure the new chatHistory property from the request body
    const { userQuestion, contextData, targetLanguage = 'English', chatHistory } = req.body;
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error('Gemini API key is not configured on the server.');
        return res.status(500).json({ error: 'AI API key not configured on the server.' });
    }
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    // --- NEW, ADVANCED PROMPT ---
    const system_prompt = `
        You are AccuraAI, a professional, friendly, and highly intelligent business analyst integrated into an application named "Ledgerly". Your primary goal is to assist users by providing insightful analysis of their business data.

        **Your Persona & Rules of Engagement:**
        1.  **Identity:** Your name is AccuraAI. The application you are in is Ledgerly.
        2.  **Tone:** Maintain a professional, helpful, and encouraging tone. Be concise and clear.
        3.  **Intent Recognition (CRITICAL):** First, analyze the user's message.
            -   **If the user provides a simple greeting** (like "hello", "hi", "how are you?") or small talk, respond conversationally and briefly. DO NOT generate a business analysis for simple greetings. For example, if the user says "Hello", you say "Hello! How can I assist you with your business data today?".
            -   **If the user asks a question requiring data analysis**, proceed to the analysis phase using the provided JSON context.
        4.  **Conversation Memory:** The user will provide the previous chat history. Use this history to understand the context of the current question and provide relevant follow-up answers. Refer to past turns if necessary.

        **Business Analysis Formatting Rules (Only for data-related questions):**
        -   Your response MUST be properly formatted HTML with correct spacing.
        -   Use <h2> tags for main headers.
        -   Use <p> tags for ALL paragraphs.
        -   Use <ul> and <li> for bullet points.
        -   Use <strong> for bold text.
        -   Wrap important keywords in <em class="highlight"> tags.
        -   Wrap financial amounts in <span class="positive-amount"> or <span class="negative-amount">.
        -   IMPORTANT: Your text MUST have normal spacing between words. Never concatenate words.
        
        **Business Data Context (if applicable):** ${JSON.stringify(contextData, null, 2)}
    `;

    // --- NEW: CONSTRUCTING THE CONVERSATIONAL HISTORY ---
    // Gemini API expects a specific format: { role: 'user'/'model', parts: [...] }
    const conversationContents = [];

    // Transform your simple chat history into the Gemini format
    if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            // Map your 'sender' to Gemini's 'role'
            const role = msg.sender === 'user' ? 'user' : 'model';
            conversationContents.push({
                role: role,
                parts: [{ text: msg.content }]
            });
        });
    }

    // Add the latest user question at the end
    // We combine the system prompt with the latest question for better context
    conversationContents.push({
        role: 'user',
        parts: [{ text: `${system_prompt}\n\nNow, answer the user's latest question: "${userQuestion}" in ${targetLanguage}.` }]
    });

    try {
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            // Send the constructed conversational history
            contents: conversationContents,
        });
        
        // Handle cases where the model might not return a candidate
        if (!geminiResponse.data.candidates || geminiResponse.data.candidates.length === 0) {
             console.error('Error in AI backend: No candidates returned from API.');
             return res.status(500).json({ error: 'AI service returned an empty response.' });
        }

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
