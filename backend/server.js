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
        product_sales_summary: product_sales_summary,
        // --- ADD THE NEW EMPLOYEE SUMMARY ---
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
    
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

    const summary = createContextSummary(contextData);

    const system_prompt = `
        You are AccuraAI, a professional business analyst in the "Ledgerly" app.

        **Your Persona & Rules:**
        1.  Your name is AccuraAI. Your tone is professional and helpful.
        2.  **Intent Recognition:** If the user gives a simple greeting, respond conversationally.
        3.  **Context:** Use the conversation history and the business summary below. The summary contains inventory, product sales, and employee sales data.

        **Formatting Rules (CRITICAL):**
        - Your response MUST be valid HTML.
        - Use <h2> for main headers.
        - Use <h3> for sub-headers.
        - Use <ul> and <li> for bullet points. Do not use asterisks.
        - Use <p> for paragraphs.
        - Use <strong> for bold text.
        
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
