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

    // --- NEW: Detailed Product Sales Calculation ---
    const productPerformance = {};
    // Initialize all products with 0 sales to ensure every product is in the summary
    products.forEach(p => {
        productPerformance[p.name] = { units_sold: 0, total_revenue: 0 };
    });

    // Aggregate sales data for each product
    sales.forEach(sale => {
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product && productPerformance[product.name]) {
                productPerformance[product.name].units_sold += item.quantity;
                productPerformance[product.name].total_revenue += item.quantity * item.unitPrice;
            }
        });
    });

    // Convert the performance object to an array for the summary
    const product_sales_summary = Object.entries(productPerformance).map(([name, data]) => ({
        name,
        units_sold: data.units_sold,
        total_revenue: parseFloat(data.total_revenue.toFixed(2))
    }));


    return {
        business_overview: {
            appName: "Ledgerly",
            aiName: "AccuraAI",
            currency: data.currency,
            total_revenue: totalRevenue.toFixed(2),
            total_expenses: totalExpenses.toFixed(2),
            net_profit: (totalRevenue - totalExpenses).toFixed(2),
        },
        inventory_details: {
            product_count: products.length,
            products_stock_list: products.map(p => ({ name: p.name, stock: p.stock }))
        },
        // --- ADD THE NEW, DETAILED SALES SUMMARY ---
        product_sales_summary: product_sales_summary
    };
}


// =================================================================
// === AI TEXT MODEL ENDPOINT - USING THE FINAL SUMMARY ===
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    const { userQuestion, contextData, targetLanguage = 'English', chatHistory } = req.body;
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI API key not configured on the server.' });
    }
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    const summary = createContextSummary(contextData);

    // The prompt is updated to know about the new 'product_sales_summary'
    const system_prompt = `
        You are AccuraAI, a professional business analyst in the "Ledgerly" app.
        **Your Persona & Rules:**
        1.  Your name is AccuraAI.
        2.  Your tone is professional, friendly, and helpful.
        3.  **Intent Recognition:** If the user gives a simple greeting, respond conversationally.
        4.  **Context:** Use the conversation history and the business summary below to answer questions. The summary contains 'inventory_details' for stock levels and a 'product_sales_summary' with units sold and revenue for every single product. Use this data to make recommendations.
        
        **High-Level Business Summary:**
        ${JSON.stringify(summary, null, 2)}
    `;

    const conversationContents = [];
    if (chatHistory && chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            const role = msg.sender === 'user' ? 'user' : 'model';
            conversationContents.push({ role: role, parts: [{ text: msg.content }] });
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

// Start the server
app.listen(PORT, () => {
    console.log(`Ledgerly AI server is running on port ${PORT}`);
});
