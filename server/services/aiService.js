import { ENV } from '../config/env.js';
import { ObjectService } from './objectService.js';
import { WikiService } from './wikiService.js';

/**
 * COSMOS AI Explanation Service — Segment 7
 *
 * Architecture:
 *   Frontend → POST /api/v1/ai/explain → aiService → AI Provider (server-side only)
 *
 * Security:
 *   - AI_API_KEY never leaves the server
 *   - Client cannot supply system prompts or override AI URL
 *   - AI output is sanitized before returning to client
 *
 * Caching:
 *   - In-memory cache keyed by `${objectId}::${mode}::${questionHash}`
 *   - TTL: 30 minutes
 */
export class AIService {
  static cache = new Map();
  static CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  static REQUEST_TIMEOUT_MS = 25000;     // 25 second timeout

  // Supported explanation modes
  static MODES = {
    beginner: {
      label: 'Beginner',
      instruction: 'Explain this object using very simple, clear language suitable for someone completely new to astronomy. Avoid jargon. Use short sentences and relatable analogies. Keep the response to 2–3 concise paragraphs.',
      maxTokens: 400
    },
    student: {
      label: 'Student',
      instruction: 'Explain this object at a college-student level with moderate scientific detail. Include key scientific concepts, measurements, and why this object matters to science. Keep the response to 2–4 concise paragraphs.',
      maxTokens: 550
    },
    deepdive: {
      label: 'Deep Dive',
      instruction: 'Give a deeper scientific explanation of this object while remaining understandable to an educated general audience. Include physical properties, scientific significance, and current research context. Keep the response to 3–5 paragraphs.',
      maxTokens: 750
    }
  };

  /**
   * Generate an AI explanation for a space object
   * @param {string} objectId - COSMOS object ID (e.g., 'earth', 'moon', 'aryabhata')
   * @param {string} mode - 'beginner' | 'student' | 'deepdive'
   * @param {string|null} question - Optional custom question from user
   * @returns {Promise<{success: boolean, explanation: string, objectId: string, mode: string, source: string, generatedAt: string, cached: boolean}>}
   */
  static async generateExplanation(objectId, mode = 'beginner', question = null) {
    // 1. Validate mode
    const modeConfig = this.MODES[mode] || this.MODES.beginner;

    // 2. Check API key
    if (!ENV.AI_API_KEY) {
      return this._errorResponse(objectId, mode, 'AI_KEY_MISSING', 'AI explanation is not configured on this server.');
    }

    // 3. Determine API endpoint
    const apiUrl = ENV.AI_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

    // 4. Look up object from COSMOS local data
    const object = ObjectService.getObjectById(objectId);
    if (!object) {
      return this._errorResponse(objectId, mode, 'OBJECT_NOT_FOUND', `Object '${objectId}' not found in COSMOS database.`);
    }

    // 5. Check in-memory cache
    const cacheKey = this._buildCacheKey(objectId, mode, question);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, cached: true };
    }

    // 6. Try to get Wikipedia summary for factual grounding
    let wikiSummary = null;
    try {
      const wikiResult = await WikiService.getWikipediaSummary(objectId);
      if (wikiResult && wikiResult.wikipedia && wikiResult.wikipedia.summary) {
        wikiSummary = wikiResult.wikipedia.summary.substring(0, 800); // cap to avoid huge prompts
      }
    } catch (_) {
      // Wikipedia unavailable is non-fatal — AI can still use COSMOS local data
    }

    // 7. Build the controlled prompt
    const { systemPrompt, userPrompt } = this._buildPrompts(object, modeConfig, wikiSummary, question);

    // 8. Call the AI provider (with automatic graceful fallback)
    try {
      const explanation = await this._callProvider(apiUrl, systemPrompt, userPrompt, modeConfig.maxTokens);

      // 9. Sanitize output
      const sanitized = this._sanitize(explanation);

      const result = {
        success: true,
        objectId,
        objectName: object.name,
        mode,
        source: 'AI (Gemini)',
        explanation: sanitized,
        generatedAt: new Date().toISOString(),
        cached: false
      };

      // 10. Store in cache
      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.CACHE_TTL_MS
      });

      return result;

    } catch (err) {
      console.warn(`[AIService] AI provider call for '${objectId}' (${err.message}). Using COSMOS Science Engine fallback.`);
      const fallback = this._generateFallbackExplanation(object, mode, wikiSummary, question);
      this.cache.set(cacheKey, {
        data: fallback,
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 min TTL for fallbacks
      });
      return fallback;
    }
  }

  /**
   * Generates a scientifically rich, unique, factual explanation or question answer
   */
  static _generateFallbackExplanation(object, mode, wikiSummary, question) {
    let text = '';
    if (question && question.trim().length > 0) {
      text = this._answerQuestionFactually(object, question.trim(), wikiSummary);
    } else if (mode === 'beginner') {
      const name = object.name || 'This object';
      const type = object.type || object.category || 'celestial body';
      const desc = object.description || '';
      text = `${name} is ${type.toLowerCase()} in our Solar System. ${desc} Scientists study ${name} to understand how planets form and evolve over billions of years.`;
    } else if (mode === 'student') {
      const name = object.name || 'This object';
      const type = object.type || object.category || 'astronomical body';
      const radiusText = object.diameter ? ` Diameter: ${object.diameter}.` : '';
      const distText = object.distanceFromSun ? ` Distance from Sun: ${object.distanceFromSun}.` : '';
      const periodText = object.orbitalPeriod ? ` Orbital Period: ${object.orbitalPeriod}.` : '';
      const wiki = wikiSummary ? ` ${wikiSummary.substring(0, 350)}` : '';
      text = `${name} (${type}) is an essential focus of space exploration.${radiusText}${distText}${periodText} ${object.description || ''}${wiki}`;
    } else {
      // deepdive
      const name = object.name || 'This object';
      const type = object.type || object.category || 'astrophysical body';
      const facts = [];
      if (object.mass) facts.push(`Mass: ${object.mass}`);
      if (object.surfaceTemp) facts.push(`Temperature: ${object.surfaceTemp}`);
      if (object.atmosphere) facts.push(`Atmosphere: ${object.atmosphere}`);
      if (object.orbitalPeriod) facts.push(`Orbital Period: ${object.orbitalPeriod}`);
      if (object.rotationPeriod) facts.push(`Rotation: ${object.rotationPeriod}`);
      const factLine = facts.length ? ` Technical metrics: ${facts.join(' | ')}.` : '';
      const wiki = wikiSummary ? ` ${wikiSummary.substring(0, 450)}` : '';
      text = `${name} (${type}) presents key scientific characteristics.${factLine} ${object.description || ''}${wiki}`;
    }

    return {
      success: true,
      objectId: object.id,
      objectName: object.name,
      mode,
      source: 'COSMOS Science Engine',
      explanation: this._sanitize(text),
      generatedAt: new Date().toISOString(),
      cached: false
    };
  }

  /**
   * Dynamically synthesizes a targeted, unique answer for specific questions
   */
  static _answerQuestionFactually(obj, question, wikiSummary) {
    const q = question.toLowerCase();
    const name = obj.name || 'This celestial body';

    // 1. Atmosphere / Air / Gases / Weather
    if (q.includes('atmosphere') || q.includes('air') || q.includes('gas') || q.includes('breath') || q.includes('wind')) {
      if (obj.atmosphere) return `The atmosphere of ${name} is composed of ${obj.atmosphere}. ${obj.description || ''}`;
      if (obj.hasAtmosphere === false) return `${name} has no substantial atmosphere, possessing only an ultra-thin exosphere. ${obj.description || ''}`;
      return `${name}'s atmosphere is a key subject in planetary science. ${obj.description || ''}`;
    }

    // 2. Size / Diameter / Mass / Radius
    if (q.includes('size') || q.includes('big') || q.includes('diameter') || q.includes('mass') || q.includes('large') || q.includes('radius')) {
      const parts = [];
      if (obj.diameter) parts.push(`diameter of ${obj.diameter}`);
      if (obj.mass) parts.push(`mass of ${obj.mass}`);
      const factStr = parts.length ? ` with a ${parts.join(' and a ')}` : '';
      return `${name} is ${obj.positionFromSun || 'a major celestial object'}${factStr}. ${obj.description || ''}`;
    }

    // 3. Temperature / Heat / Cold / Climate
    if (q.includes('temp') || q.includes('hot') || q.includes('cold') || q.includes('heat') || q.includes('warm') || q.includes('climate')) {
      if (obj.surfaceTemp) return `The surface temperature on ${name} is ${obj.surfaceTemp}. ${obj.description || ''}`;
      return `Thermal conditions on ${name} vary based on solar exposure and atmospheric composition. ${obj.description || ''}`;
    }

    // 4. Distance / Orbit / Sun / Year / Day
    if (q.includes('distance') || q.includes('far') || q.includes('sun') || q.includes('orbit') || q.includes('period') || q.includes('year') || q.includes('day')) {
      const parts = [];
      if (obj.distanceFromSun) parts.push(`it is located ${obj.distanceFromSun}`);
      if (obj.orbitalPeriod) parts.push(`its orbital period is ${obj.orbitalPeriod}`);
      if (obj.rotationPeriod) parts.push(`a single day lasts ${obj.rotationPeriod}`);
      const factStr = parts.length ? ` (${parts.join('; ')})` : '';
      return `${name} orbits the Sun in our Solar System${factStr}. ${obj.description || ''}`;
    }

    // 5. Moons / Satellites / Rings
    if (q.includes('moon') || q.includes('satellite') || q.includes('ring')) {
      if (obj.hasRings && obj.ringConfig) {
        return `${name} features a major ring system extending from ${obj.ringConfig.innerRadius} to ${obj.ringConfig.outerRadius} spatial units. ${obj.description || ''}`;
      }
      if (obj.majorSatelliteIds && obj.majorSatelliteIds.length > 0) {
        return `${name} has major moons including ${obj.majorSatelliteIds.join(', ')}. ${obj.description || ''}`;
      }
      return `${name} is a key target in satellite and orbital mechanics research. ${obj.description || ''}`;
    }

    // 6. Life / Water / Ocean / Habitability
    if (q.includes('life') || q.includes('water') || q.includes('ocean') || q.includes('habit')) {
      if (obj.id === 'earth') return `Earth is the only astronomical object known to harbor life, with liquid water oceans covering 71% of its surface.`;
      if (obj.id === 'europa' || obj.id === 'enceladus') return `${name} is a prime astrobiology candidate due to its global subsurface ocean beneath an icy crust. ${obj.description || ''}`;
      return `Current scientific data does not indicate life on ${name}, though its unique chemical composition is actively studied by planetary scientists. ${obj.description || ''}`;
    }

    // 7. Importance / Purpose / Science / Mission / Discovery / Interest
    if (q.includes('important') || q.includes('why') || q.includes('science') || q.includes('mission') || q.includes('purpose') || q.includes('discover') || q.includes('interesting')) {
      const wiki = wikiSummary ? ` ${wikiSummary.substring(0, 300)}` : '';
      return `${name} is scientifically fascinating because: ${obj.description || ''}${wiki}`;
    }

    // 8. Dynamic fallback tailored to the question
    const wikiPart = wikiSummary ? ` ${wikiSummary.substring(0, 350)}` : '';
    return `Regarding "${question}": ${name} (${obj.type || 'space object'}) — ${obj.description || ''}${wikiPart}`;
  }

  /**
   * Build controlled system + user prompts from COSMOS data and Wikipedia
   */
  static _buildPrompts(object, modeConfig, wikiSummary, question) {
    const objectType = this._detectObjectCategory(object);

    // Build factual context block
    const cosmosFacts = this._buildFactBlock(object);

    // System prompt — AI uses full astronomical knowledge anchored by COSMOS/Wikipedia facts
    const systemPrompt = `You are COSMOS Assistant, an expert astronomy and space AI for the COSMOS interactive solar system app.

GUIDELINES:
- Provide clear, engaging, scientifically accurate explanations for celestial objects, planets, moons, and spacecraft.
- Use the provided COSMOS facts and Wikipedia context as your baseline, and complement it with your extensive scientific knowledge about astronomy.
- Answer user questions directly, accurately, and comprehensively.
- Never inject HTML, JavaScript, or code markup into your response.
- Respond in plain text only. Avoid markdown headers or heavy symbols.
- Avoid starting your response with "As an AI".

YOUR TASK:
${modeConfig.instruction}

OBJECT TYPE CONTEXT:
${objectType}`;

    // User prompt — contains controlled context + question
    const userMsg = `
OBJECT: ${object.name}

COSMOS FACTS:
${cosmosFacts}

${wikiSummary ? `WIKIPEDIA SUMMARY:\n${wikiSummary}` : '(Wikipedia summary not available)'}

${question
      ? `USER QUESTION: ${question}\n\nPlease answer the user's question about ${object.name} in a clear, scientifically accurate, and engaging manner for a ${modeConfig.label.toLowerCase()}-level audience.`
      : `Please explain ${object.name} to a ${modeConfig.label.toLowerCase()}-level audience.`
    }
`.trim();

    return { systemPrompt, userPrompt: userMsg };
  }

  /**
   * Build a structured block of object facts for the AI
   */
  static _buildFactBlock(obj) {
    const lines = [];
    if (obj.type || obj.category) lines.push(`Type: ${obj.type || obj.category}`);
    if (obj.positionFromSun) lines.push(`Position: ${obj.positionFromSun}`);
    if (obj.diameter) lines.push(`Diameter: ${obj.diameter}`);
    if (obj.mass) lines.push(`Mass: ${obj.mass}`);
    if (obj.distanceFromSun) lines.push(`Distance from Sun: ${obj.distanceFromSun}`);
    if (obj.distanceFromPlanet) lines.push(`Distance from Planet: ${obj.distanceFromPlanet}`);
    if (obj.orbitalPeriod) lines.push(`Orbital Period: ${obj.orbitalPeriod}`);
    if (obj.rotationPeriod) lines.push(`Rotation Period: ${obj.rotationPeriod}`);
    if (obj.surfaceTemp) lines.push(`Surface Temperature: ${obj.surfaceTemp}`);
    if (obj.atmosphere) lines.push(`Atmosphere: ${obj.atmosphere}`);
    if (obj.composition) lines.push(`Composition: ${obj.composition}`);
    if (obj.missionType) lines.push(`Mission Type: ${obj.missionType}`);
    if (obj.orbitType) lines.push(`Orbit Type: ${obj.orbitType}`);
    if (obj.launchYear) lines.push(`Launch Year: ${obj.launchYear}`);
    if (obj.countryAgency) lines.push(`Agency/Country: ${obj.countryAgency}`);
    if (obj.status) lines.push(`Status: ${obj.status}`);
    if (obj.significance) lines.push(`Significance: ${obj.significance}`);
    if (obj.description) lines.push(`Description: ${obj.description}`);
    return lines.join('\n');
  }

  /**
   * Classify the object type for the AI context
   */
  static _detectObjectCategory(obj) {
    if (obj.type === 'Star (G2V Yellow Dwarf)') return 'This is a STAR (the Sun, center of the Solar System).';
    if (obj.type === 'planet') return 'This is a PLANET in our Solar System.';
    if (obj.type === 'satellite' || obj.type === 'Natural Satellite' || obj.type === 'Galilean Satellite') {
      return `This is a NATURAL MOON orbiting ${obj.parentPlanetId || 'a planet'}. Explain what makes this moon scientifically interesting, its orbital characteristics, and environment.`;
    }
    if (obj.category === 'artificial') {
      const template = obj.visualTemplate || '';
      if (template === 'telescope') return 'This is a SPACE TELESCOPE. Explain what it observes, why it was built, and its scientific achievements.';
      if (template === 'probe') return 'This is a SPACE PROBE or deep-space mission. Explain its destination, purpose, and major achievements.';
      return 'This is an ARTIFICIAL SATELLITE or spacecraft. Explain its mission, orbit, launch era, and importance.';
    }
    return 'This is a celestial object or spacecraft.';
  }

  /**
   * Call the AI provider — supports both Gemini and OpenAI-compatible APIs
   */
  static async _callProvider(apiUrl, systemPrompt, userPrompt, maxTokens) {
    const isGemini = apiUrl.includes('generativelanguage.googleapis.com') || apiUrl.includes('gemini');

    if (isGemini) {
      return this._callGemini(apiUrl, systemPrompt, userPrompt, maxTokens);
    }
    return this._callOpenAICompat(apiUrl, systemPrompt, userPrompt, maxTokens);
  }

  /**
   * Call Google Gemini API
   * URL format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...
   */
  static async _callGemini(apiUrl, systemPrompt, userPrompt, maxTokens) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    // Build Gemini endpoint URL — default to gemini-3.5-flash-lite
    const model = ENV.AI_MODEL || 'gemini-3.5-flash-lite';
    let endpoint;
    if (apiUrl.includes(':generateContent')) {
      endpoint = apiUrl.includes('key=') ? apiUrl : `${apiUrl}?key=${ENV.AI_API_KEY}`;
    } else {
      const base = apiUrl.replace(/\/$/, '');
      endpoint = `${base}/${model}:generateContent?key=${ENV.AI_API_KEY}`;
    }

    const safeEndpoint = endpoint.replace(/key=[^&]+/, 'key=***');
    console.log(`[AIService] Gemini endpoint: ${safeEndpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.65
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.status === 400) {
        const errBody = await response.json().catch(() => ({}));
        const msg = errBody?.error?.message || '';
        if (msg.includes('API key')) throw new Error('AI_AUTH_FAILED');
        throw new Error('AI_INVALID_REQUEST');
      }
      if (response.status === 401 || response.status === 403) throw new Error('AI_AUTH_FAILED');
      if (response.status === 429) throw new Error('AI_RATE_LIMITED');
      if (response.status === 503 || response.status === 502) throw new Error('AI_PROVIDER_UNAVAILABLE');
      if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);

      const json = await response.json();

      // Validate Gemini response structure
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || text.trim().length < 20) throw new Error('AI_EMPTY_RESPONSE');

      return text.trim();

    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('AI_TIMEOUT');
      throw err;
    }
  }

  /**
   * Call OpenAI-compatible API (Groq, OpenAI, Mistral, Ollama, etc.)
   */
  static async _callOpenAICompat(apiUrl, systemPrompt, userPrompt, maxTokens) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ENV.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: ENV.AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.6,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (response.status === 401) throw new Error('AI_AUTH_FAILED');
      if (response.status === 429) throw new Error('AI_RATE_LIMITED');
      if (response.status === 503 || response.status === 502) throw new Error('AI_PROVIDER_UNAVAILABLE');
      if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);

      const json = await response.json();

      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text || text.length < 20) throw new Error('AI_EMPTY_RESPONSE');

      return text;

    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('AI_TIMEOUT');
      throw err;
    }
  }

  /**
   * Sanitize AI output — strip HTML, script tags, event handlers
   */
  static _sanitize(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;script/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')   // strip markdown bold
      .replace(/#{1,6}\s/g, '')          // strip markdown headers
      .replace(/^\s*[-*•]\s/gm, '')      // strip markdown bullets
      .replace(/\n{3,}/g, '\n\n')        // collapse excess newlines
      .trim()
      .substring(0, 3000);              // hard cap at 3000 chars
  }

  static _buildCacheKey(objectId, mode, question) {
    const qHash = question ? question.substring(0, 60).replace(/\s+/g, '_') : 'default';
    return `${objectId}::${mode}::${qHash}`;
  }

  static _errorResponse(objectId, mode, code, message) {
    return {
      success: false,
      objectId,
      mode,
      errorCode: code,
      error: message,
      generatedAt: new Date().toISOString()
    };
  }

  static _classifyError(objectId, mode, err) {
    const msg = err.message || '';
    const map = {
      'AI_AUTH_FAILED':           'The AI API key is invalid or expired. Please check AI_API_KEY in your .env file.',
      'AI_RATE_LIMITED':          'The AI service is temporarily rate limited. Please try again in a moment.',
      'AI_PROVIDER_UNAVAILABLE':  'The AI provider is temporarily unavailable. Please try again later.',
      'AI_TIMEOUT':               'The AI request timed out. Please try again.',
      'AI_INVALID_RESPONSE':      'The AI returned an unexpected response format.',
      'AI_EMPTY_RESPONSE':        'The AI returned an empty response. Please try again.',
      'AI_INVALID_REQUEST':       'The AI API rejected the request. Please check your AI_MODEL setting in .env.',
      'AI_HTTP_404':              'AI model not found. Please verify AI_MODEL and AI_API_URL in your .env file.',
      'AI_HTTP_400':              'Bad request to AI provider. Please verify your API key and model name in .env.',
      'AI_HTTP_403':              'The AI API key does not have permission. Please check your Gemini API key.',
      'AI_KEY_MISSING':           'No AI API key configured. Please add AI_API_KEY to your .env file.'
    };
    const humanMsg = map[msg] || `AI service error (${msg || 'unknown'}). Check the server logs for details.`;
    return this._errorResponse(objectId, mode, msg || 'AI_ERROR', humanMsg);
  }

  /**
   * Clear the full cache (for testing)
   */
  static clearCache() {
    this.cache.clear();
  }
}
