const axios = require('axios');

const LLM_ENABLED = (process.env.LLM_ENABLED || 'false').toLowerCase() === 'true';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();

// Ollama
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

// OpenAI-compatible
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'http://localhost:1234/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

async function health() {
  if (!LLM_ENABLED) return { enabled: false, provider: LLM_PROVIDER, healthy: false, reason: 'LLM disabled' };
  try {
    if (LLM_PROVIDER === 'ollama') {
      const res = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 2000 });
      return { enabled: true, provider: 'ollama', healthy: res.status === 200 };
    }
    // OpenAI-compatible: no definitive health; try a models list if available
    const res = await axios.get(`${OPENAI_BASE_URL}/models`, {
      timeout: 2000,
      headers: OPENAI_API_KEY ? { Authorization: `Bearer ${OPENAI_API_KEY}` } : {},
    }).catch(() => ({ status: 200 }));
    return { enabled: true, provider: 'openai', healthy: res.status === 200 };
  } catch (e) {
    return { enabled: true, provider: LLM_PROVIDER, healthy: false, reason: e.message };
  }
}

async function parseIntent(message, hints = {}) {
  if (!LLM_ENABLED) return { usedLLM: false, intent: null };
  try {
    if (LLM_PROVIDER === 'ollama') {
      const prompt = buildIntentPrompt(message, hints);
      const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }, { timeout: 15000 });
      const text = res.data?.response || '';
      return { usedLLM: true, intent: safeJson(text) };
    } else {
      const prompt = buildIntentPrompt(message, hints);
      const res = await axios.post(`${OPENAI_BASE_URL}/chat/completions`, {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You extract structured intents for an invoice assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
      }, {
        timeout: 15000,
        headers: OPENAI_API_KEY ? { Authorization: `Bearer ${OPENAI_API_KEY}` } : {},
      });
      const text = res.data?.choices?.[0]?.message?.content || '';
      return { usedLLM: true, intent: safeJson(text) };
    }
  } catch (e) {
    return { usedLLM: true, intent: null, error: e.message };
  }
}

function buildIntentPrompt(message, hints = {}) {
  return `You are an intent extractor for an enterprise invoice assistant.\n` +
    `Return ONLY a compact JSON object with fields: {type, vendor, status, timeframe}.\n` +
    `Types: filter_invoices | explain_failures | create_ticket | download_report | ticket_status | general.\n` +
    `Message: "${message}"`;
}

function safeJson(text) {
  try {
    // Extract JSON block if present
    const match = text.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : text;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

module.exports = {
  health,
  parseIntent,
  config: {
    LLM_ENABLED,
    LLM_PROVIDER,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
  }
};
