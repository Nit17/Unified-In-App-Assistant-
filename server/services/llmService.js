const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
let promptConfig = null;
try {
  const cfgPath = path.join(__dirname, '..', 'config', 'promptConfig.json');
  if (fs.existsSync(cfgPath)) {
    promptConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch {}

const LLM_ENABLED = (process.env.LLM_ENABLED || 'false').toLowerCase() === 'true';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();

// Ollama
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

// OpenAI-compatible
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'http://localhost:1234/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

// Limits & timeouts
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 15000);
const LLM_RPM = Number(process.env.LLM_RPM || 30); // requests per minute
let tokens = LLM_RPM; // simple token bucket
let lastRefill = Date.now();

function takeToken() {
  const now = Date.now();
  const elapsed = now - lastRefill;
  const refill = Math.floor(elapsed / 60000) * LLM_RPM; // per full minute
  if (refill > 0) {
    tokens = Math.min(LLM_RPM, tokens + refill);
    lastRefill = now;
  }
  if (tokens > 0) {
    tokens -= 1;
    return true;
  }
  return false;
}

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
    logger.warn({ msg: 'LLM health check failed', provider: LLM_PROVIDER, err: e.message });
    return { enabled: true, provider: LLM_PROVIDER, healthy: false, reason: e.message };
  }
}

async function parseIntent(message, hints = {}) {
  if (!LLM_ENABLED) return { usedLLM: false, intent: null };
  try {
    if (!takeToken()) {
      logger.warn({ msg: 'LLM rate limit hit', rpm: LLM_RPM });
      return { usedLLM: false, intent: null, error: 'rate_limited' };
    }
    const start = Date.now();
    if (LLM_PROVIDER === 'ollama') {
      const prompt = buildIntentPrompt(message, hints);
      const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }, { timeout: LLM_TIMEOUT_MS });
      const text = res.data?.response || '';
      const ms = Date.now() - start;
      logger.info({ msg: 'LLM call success', provider: 'ollama', ms });
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
        timeout: LLM_TIMEOUT_MS,
        headers: OPENAI_API_KEY ? { Authorization: `Bearer ${OPENAI_API_KEY}` } : {},
      });
      const text = res.data?.choices?.[0]?.message?.content || '';
      const ms = Date.now() - start;
      logger.info({ msg: 'LLM call success', provider: 'openai', ms });
      return { usedLLM: true, intent: safeJson(text) };
    }
  } catch (e) {
    logger.error({ msg: 'LLM call failed', provider: LLM_PROVIDER, err: e.message });
    return { usedLLM: true, intent: null, error: e.message };
  }
}

function buildIntentPrompt(message, hints = {}) {
  const system = promptConfig?.system || 'You extract structured intents for an enterprise invoice assistant.';
  const instruction = promptConfig?.intentInstruction || 'Return ONLY a compact JSON object with fields: {type, vendor, status, timeframe}. Types: filter_invoices | explain_failures | create_ticket | download_report | ticket_status | general.';
  const examples = (promptConfig?.examples || []).map(ex => `User: ${ex.user}\nJSON: ${JSON.stringify(ex.json)}`).join('\n');
  return `${system}\n${instruction}\n${examples ? examples + '\n' : ''}Message: "${message}"`;
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
  getConfig: () => ({
    enabled: LLM_ENABLED,
    provider: LLM_PROVIDER,
    ollama: { baseUrl: OLLAMA_BASE_URL, model: OLLAMA_MODEL },
    openai: { baseUrl: OPENAI_BASE_URL, model: OPENAI_MODEL, hasApiKey: Boolean(OPENAI_API_KEY) },
    limits: { timeoutMs: LLM_TIMEOUT_MS, rpm: LLM_RPM },
    promptConfig
  }),
  config: {
    LLM_ENABLED,
    LLM_PROVIDER,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    LLM_TIMEOUT_MS,
    LLM_RPM,
  }
};
