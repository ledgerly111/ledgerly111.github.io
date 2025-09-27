// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Create the app
const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares to handle JSON and CORS
app.use(cors());
app.use(express.json());

// --- FINAL HELPER FUNCTION TO CREATE THE DEFINITIVE SUMMARY ---
function createContextSummary(data) {
    const sales = data.sales || [];
    const expenses = data.expenses || [];
    const products = data.products || [];
    const customers = data.customers || [];
    const users = data.users || [];

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate sales per product
    const productPerformance = {};
    products.forEach(p => { productPerformance[p.name] = { units_sold: 0, total_revenue: 0 }; });
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && productPerformance[product.name]) {
                productPerformance[product.name].units_sold += item.quantity;
                productPerformance[product.name].total_revenue += item.quantity * item.unitPrice;
            }
        });
    });
    const product_sales_summary = Object.entries(productPerformance).map(([name, data]) => ({ name, units_sold: data.units_sold, total_revenue: parseFloat(data.total_revenue.toFixed(2)) }));

    // --- NEW: Employee Performance Calculation ---
    const employeePerformance = {};
    users.forEach(u => { employeePerformance[u.name] = { total_sales_value: 0 }; });
    sales.forEach(sale => {
        const employee = users.find(u => u.id === sale.salesPersonId);
        if (employee && employeePerformance[employee.name]) {
            employeePerformance[employee.name].total_sales_value += sale.total;
        }
    });
    const employee_sales_summary = Object.entries(employeePerformance).map(([name, data]) => ({ name, total_sales_value: parseFloat(data.total_sales_value.toFixed(2)) }));


    return {
        business_overview: {
            appName: "Owlio",
            aiName: "Bubble AI",
            currency: data.currency,
            total_revenue: totalRevenue.toFixed(2),
            total_expenses: totalExpenses.toFixed(2),
            net_profit: (totalRevenue - totalExpenses).toFixed(2),
        },
        inventory_details: {
            product_count: products.length,
            products_stock_list: products.map(p => ({ name: p.name, stock: p.stock }))
        },
        product_sales_summary: product_sales_summary,
        employee_performance_summary: employee_sales_summary
    };
}


// =================================================================
// === AI TEXT MODEL ENDPOINT - FINAL VERSION ===
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    const { userQuestion, contextData, targetLanguage = 'English', chatHistory } = req.body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI API key not configured on the server.' });
    }

    // This is the most standard and compatible endpoint.
    // If this fails, the issue is 100% with the API Key's permissions in Google Cloud.
     const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const summary = createContextSummary(contextData);

    const system_prompt = `
        You are Bubble AI, a professional business analyst in the "Owlio" app.

        **Your Persona & Rules:**
        1.  Your name is Bubble AI. Your tone is professional and helpful.
        2.  **Context:** Use the conversation history and the business summary below.
        3.  **Conversational AI Rule:** If the user's question is a simple greeting or casual conversation (e.g., 'hi', 'hello', 'how are you?', 'thanks'), provide a friendly, conversational HTML response without including any business data or analysis. Just be a normal chatbot for these cases. For all other business-related questions, proceed with the full analysis using the context and summary provided.

        **Formatting Rules (CRITICAL for Business Questions):**
        - Your response MUST be valid HTML. Use semantic elements such as <h2>, <ul>, <li>, <p>, and <strong>.
        - If structured data is best shown in a table, output a clean HTML <table> with the class "ai-data-table" for styling.

        **Follow-up Questions (for business conversations):**
        - When the latest user message is a business question (not a casual greeting), append a follow-up section after the main answer.
        - The section must use this exact structure:
            <div class="ai-followup-section">
                <h3>Suggested follow-up questions</h3>
                <div class="ai-followup-bubbles">
                    <button type="button" class="ai-followup-button" data-action="ask-ai-followup" data-question="QUESTION 1">QUESTION 1</button>
                    <button type="button" class="ai-followup-button" data-action="ask-ai-followup" data-question="QUESTION 2">QUESTION 2</button>
                    <button type="button" class="ai-followup-button" data-action="ask-ai-followup" data-question="QUESTION 3">QUESTION 3</button>
                </div>
            </div>
        - Replace QUESTION 1-3 with three concise, relevant follow-up questions tailored to the conversation. Avoid quotation marks inside the data-question value.
        - Do not include this follow-up section for simple greetings or casual chatter.

        **High-Level Business Summary (ignore for simple greetings):**
        ${JSON.stringify(summary, null, 2)}
    `;

    const conversationContents = [];
    if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            const role = msg.sender === 'user' ? 'user' : 'model';
            const cleanContent = typeof msg.content === 'string' ? msg.content.replace(/<[^>]*>?/gm, '') : '';
            conversationContents.push({ role: role, parts: [{ text: cleanContent }] });
        });
    }

    conversationContents.push({
        role: 'user',
        parts: [{ text: `${system_prompt}\n\nBased on all the above, answer the user's latest question: "${userQuestion}" in ${targetLanguage}.` }]
    });

    try {
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: conversationContents,
        });
        
        if (!geminiResponse.data.candidates || geminiResponse.data.candidates.length === 0) {
             return res.status(500).json({ error: 'AI service returned an empty response.' });
        }
        const geminiHtmlResponse = geminiResponse.data.candidates[0].content.parts[0].text;
        res.json({ htmlResponse: geminiHtmlResponse });
    } catch (error) {
        console.error('Error in AI backend:', error.response ? error.response.data.error : error.message);
        res.status(500).json({ error: 'Failed to get a response from the AI service.' });
    }
});

function resolveVoiceSettings(language) {
    const normalized = (language || '').toLowerCase();
    switch (normalized) {
        case 'arabic':
        case 'ar':
        case 'ar-xa':
            return { languageCode: 'ar-XA', name: 'ar-XA-Wavenet-C' };
        default:
            return { languageCode: 'en-US', name: 'en-US-Wavenet-D' };
    }
}

app.post('/api/tts', async (req, res) => {
    const { text, language } = req.body || {};
    const trimmedText = (text || '').trim();

    if (!trimmedText) {
        return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    const GOOGLE_TTS_KEY = process.env.GOOGLE_STT_API_KEY_TTS;
    if (!GOOGLE_TTS_KEY) {
        return res.status(500).json({ error: 'TTS API key is not configured on the server.' });
    }

    const voice = resolveVoiceSettings(language);
    const speakingRate = 1.0;

    try {
        const response = await axios.post(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
            {
                input: { text: trimmedText },
                voice: voice,
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate,
                    pitch: 0,
                },
            }
        );

        const { audioContent } = response.data || {};

        if (!audioContent) {
            return res.status(502).json({ error: 'TTS service returned an empty response.' });
        }

        res.json({
            audioContent,
            audioMimeType: 'audio/mpeg',
            voiceName: voice.name,
            speakingRate,
        });
    } catch (error) {
        console.error('Error generating TTS audio:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to generate speech audio.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Owlio AI server is running on port ${PORT}`);
});




