/**
 * aiService.js
 * Handles all communication with the AI provider.
 * Supports any OpenAI-compatible endpoint (OpenAI, Grok/xAI, Gemini, etc.)
 */

const axios = require('axios');

const AI_API_URL = process.env.AI_API_URL;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o';

/**
 * Send a list of messages to the AI API and return the assistant's reply text.
 *
 * @param {Array<{role: string, content: string}>} messages - Full conversation including system prompt
 * @returns {Promise<string>} - Raw reply text from the model
 */
async function callAI(messages) {
  if (!AI_API_KEY || AI_API_KEY === 'your-api-key-here') {
    throw new Error(
      'AI_API_KEY is not configured. Copy .env.example to .env and add your API key.'
    );
  }

  if (!AI_API_URL) {
    throw new Error('AI_API_URL is not configured in your .env file.');
  }

  const payload = {
    model: AI_MODEL,
    messages,
    max_tokens: 400,
    temperature: 0.7,
  };

  console.log('\n─────────────────────────────────────────');
  console.log('📤 SENDING TO AI API');
  console.log(`   Model    : ${AI_MODEL}`);
  console.log(`   Endpoint : ${AI_API_URL}`);
  console.log(`   Messages : ${messages.length} (including system prompt)`);
  console.log('─────────────────────────────────────────');

  const response = await axios.post(AI_API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    timeout: 30000,
  });

  const choice = response.data?.choices?.[0];
  if (!choice) {
    throw new Error('Unexpected API response structure: ' + JSON.stringify(response.data));
  }

  const reply = choice.message?.content || '';
  return reply;
}

module.exports = { callAI };
