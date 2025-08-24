// Import necessary packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Create the app
const app = express();
const PORT = process.env.PORT || 10000; // Render provides the PORT

// Middlewares to handle larger JSON payloads (for audio) and CORS
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for audio data

// =================================================================
// === ENDPOINT 1: SPEECH-TO-TEXT (The "Ears") ===
// This endpoint receives audio and returns text.
// =================================================================
app.post('/api/speech-to-text', async (req, res) => {
    // Securely get the STT API key from Render's environment
    const GOOGLE_STT_API_KEY = process.env.GOOGLE_STT_API_KEY;
    const STT_API_URL = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_STT_API_KEY}`;

    // The frontend will send the audio as a base64 encoded string
    const { audio } = req.body;

    if (!GOOGLE_STT_API_KEY) {
        return res.status(500).json({ error: 'STT API key not configured on the server.' });
    }
    if (!audio) {
        return res.status(400).json({ error: 'No audio data provided.' });
    }

    const requestPayload = {
        config: {
            encoding: 'WEBM_OPUS', // Common format from browser MediaRecorder
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            model: 'latest_long', // A model good for general use
        },
        audio: {
            content: audio, // The base64 audio string from the frontend
        },
    };

    try {
        const sttResponse = await axios.post(STT_API_URL, requestPayload);
        const transcript = sttResponse.data.results?.[0]?.alternatives?.[0]?.transcript || '';

        if (!transcript) {
            console.log("STT response was empty or failed to transcribe:", sttResponse.data);
            return res.status(200).json({ transcript: '', error: 'Unable to understand audio.' });
        }

        // Send the final text transcript back to the frontend
        res.json({ transcript: transcript });

    } catch (error) {
        console.error('Error in Speech-to-Text endpoint:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to process speech.' });
    }
});

// =================================================================
// === ENDPOINT 2: ASK AI & GET SPEECH (The "Brain" and "Mouth") ===
// This endpoint receives text, gets an AI response, converts it to audio,
// and sends both the text and audio back.
// =================================================================
app.post('/api/ask-ai', async (req, res) => {
    const { userQuestion, contextData, targetLanguage = 'English' } = req.body;
    
    // Securely get BOTH API keys needed for this endpoint
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

    if (!GEMINI_API_KEY || !GOOGLE_TTS_API_KEY) {
        return res.status(500).json({ error: 'AI or TTS API keys not configured on the server.' });
    }
    
   const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    const TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;

    const prompt = `
        You are AccuraAI, an expert business analyst integrated into a management app called Ledgerly.
        Your task is to analyze the user's question and the provided JSON data and generate a comprehensive, insightful response.
        Your entire response MUST be generated directly in the following language: ${targetLanguage}.
        Response Structure and Formatting Rules (MUST be followed):
        1. Your response MUST be in clean, professional, and user-friendly HTML format.
        2. Use <h4> tags for all section headers. Always begin every <h4> header with the '>' character.
        3. Use <ol>, <ul>, <li>, and <strong> for structure.
        4. When you mention important keywords (like "revenue", "inventory"), wrap them in an <em class="highlight"> tag.
        5. When you state a financial amount, wrap it in a span tag with a class of "positive-amount" for good numbers or "negative-amount" for cautionary numbers.
        6. Do not use Markdown. Do NOT include <html> or <body> tags.
        Here is the JSON data: ${JSON.stringify(contextData, null, 2)}
        Now, answer the user's question: "${userQuestion}"
        Generate the complete HTML response directly and exclusively in ${targetLanguage}.
    `;

    try {
        // --- Step 1: Get the text response from Gemini ---
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        const geminiHtmlResponse = geminiResponse.data.candidates[0].content.parts[0].text;
        
        // --- Step 2: Clean the HTML to create a plain text version for the voice ---
        const cleanTextForSpeech = geminiHtmlResponse.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

        // --- Step 3: Get the audio from the Google Cloud TTS API ---
        const ttsResponse = await axios.post(TTS_API_URL, {
            input: { text: cleanTextForSpeech },
            voice: { languageCode: 'en-US', name: 'en-US-Studio-O' }, // A high-quality studio voice
            audioConfig: { audioEncoding: 'MP3' }
        });

        const ttsAudioContent = ttsResponse.data.audioContent; // This is the base64 audio string

        // --- Step 4: Send BOTH the HTML and the Audio back to your app ---
        res.json({
            htmlResponse: geminiHtmlResponse,
            audioResponse: ttsAudioContent
        });

    } catch (error) {
        console.error('Error in AI/TTS backend:', error.response ? error.response.data.error : error.message);
        res.status(500).json({ error: 'Failed to get a response from the AI services.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

