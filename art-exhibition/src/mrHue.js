import { isCurator, onModeChange } from './userMode.js';
import { setRoomColor }   from './room.js';
import { setAmbientLight } from './main.js';

// ─── API config ───────────────────────────────────────────────────────────────
const API_URL   = 'https://api.anthropic.com/v1/messages';
const API_KEY   = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';
const API_MODEL = 'claude-sonnet-4-20250514';

const OPENING_LINE =
  "I'm Mr. Hue, the magician behind these walls. " +
  "Tell me how this gallery should feel — and I'll see what I can do.";

const SYSTEM_PROMPT = `\
You are Mr. Hue, the magician of a gallery space.
Your job is to transform the gallery atmosphere based on the artist's description.

STRICT OUTPUT RULES — you must follow these every single time, no exceptions:
1. Write exactly 1-2 sentences of poetic response in plain text.
2. Then output a JSON block using exactly this format, with no extra text after it:

\`\`\`json
{
  "action": "scene_update",
  "params": {
    "wallColor": "#hexcode or null",
    "ambientLightColor": "#hexcode or null",
    "ambientLightIntensity": 0.0 to 1.0 or null,
    "spotLightColor": "#hexcode or null",
    "spotLightIntensity": 0.0 to 1.0 or null,
    "mood": "warm or cool or dramatic or minimal or null"
  }
}
\`\`\`

EXAMPLES — always fill in the params, never leave all fields null:

User says "make it warm" → reply with mood: "warm"
\`\`\`json
{
  "action": "scene_update",
  "params": {
    "wallColor": null,
    "ambientLightColor": null,
    "ambientLightIntensity": null,
    "spotLightColor": null,
    "spotLightIntensity": null,
    "mood": "warm"
  }
}
\`\`\`

User says "blue dramatic lighting" → reply with specific colors:
\`\`\`json
{
  "action": "scene_update",
  "params": {
    "wallColor": "#1a1a2e",
    "ambientLightColor": "#2244aa",
    "ambientLightIntensity": 0.3,
    "spotLightColor": null,
    "spotLightIntensity": null,
    "mood": null
  }
}
\`\`\`

RULE: At least one param must be non-null in every response.
NEVER skip the JSON block. NEVER output only text. Every reply must end with the JSON block.`;

// Conversation history for multi-turn context
const _history = [];

let _panel    = null;
let _miniBtn  = null;
let _chatArea = null;
let _built    = false;

// ─── Speech ───────────────────────────────────────────────────────────────────
let isMuted   = false;
let _voice    = null;   // resolved SpeechSynthesisVoice
let _statusEl = null;   // #mh-status DOM ref
let _volBtn   = null;   // volume button DOM ref

function resolveVoice() {
  if (!window.speechSynthesis) return;
  const pick = () => {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const pref = ['Daniel', 'Google UK English Male', 'Male'];
    for (const keyword of pref) {
      const match = voices.find(v => v.name.includes(keyword));
      if (match) { _voice = match; return; }
    }
    // Fall back to any en-US voice, then the first voice
    _voice = voices.find(v => v.lang === 'en-US') || voices[0] || null;
  };
  pick();
  if (!_voice) speechSynthesis.addEventListener('voiceschanged', pick, { once: true });
}

function stripCodeBlocks(text) {
  // Remove ```...``` blocks before speaking
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '').trim();
}

function speak(text) {
  if (isMuted || !window.speechSynthesis) return;
  const clean = stripCodeBlocks(text);
  if (!clean) return;

  speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang  = 'en-US';
  utt.rate  = 0.88;
  utt.pitch = 0.8;
  if (_voice) utt.voice = _voice;

  utt.onstart = () => setStatus('Speaking…');
  utt.onend   = () => setStatus('Ready to help');
  utt.onerror = () => setStatus('Ready to help');

  speechSynthesis.speak(utt);
}

function setStatus(text) {
  if (_statusEl) _statusEl.textContent = text;
}

function toggleMute() {
  isMuted = !isMuted;
  if (_volBtn) _volBtn.textContent = isMuted ? '🔇' : '🔊';
  if (isMuted) {
    speechSynthesis?.cancel();
    setStatus('Ready to help');
  }
}

// ─── Scene update ─────────────────────────────────────────────────────────────
const WALL_NAMES = [
  'Exhibition_Wall_01', 'Exhibition_Wall_02',
  'Exhibition_Wall_03', 'Exhibition_Wall_04',
  'Exhibition_End_Wall_01', 'Exhibition_End_Wall_02',
];

const MOODS = {
  warm:     { wall: '#8B3A3A', ambient: '#ff9944', intensity: 0.6  },
  cool:     { wall: '#2a3a5a', ambient: '#4488ff', intensity: 0.5  },
  dramatic: { wall: null,      ambient: '#1a0a0a', intensity: 0.15 },
  minimal:  { wall: '#f5f0e8', ambient: '#ffffff', intensity: 0.85 },
};

function applySceneUpdate(params) {
  if (!params) return;

  // mood overrides individual params
  if (params.mood && MOODS[params.mood]) {
    const m = MOODS[params.mood];
    if (m.wall) WALL_NAMES.forEach(n => setRoomColor(n, m.wall));
    setAmbientLight(m.ambient, m.intensity);
    return;
  }

  if (params.wallColor) {
    WALL_NAMES.forEach(n => setRoomColor(n, params.wallColor));
  }
  if (params.ambientLightColor != null || params.ambientLightIntensity != null) {
    setAmbientLight(params.ambientLightColor, params.ambientLightIntensity);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function initMrHue() {
  resolveVoice();
  onModeChange(syncMode);
  // Don't call syncMode() here — panel is built via onArtistEnter() after role select
}

export function onArtistEnter() {
  syncMode();  // builds + shows panel if not yet built
  setTimeout(() => speak(OPENING_LINE), 800);
}

// ─── Role sync ────────────────────────────────────────────────────────────────
function syncMode() {
  if (!isCurator()) {
    speechSynthesis?.cancel();
    if (_panel)   _panel.style.display   = 'none';
    if (_miniBtn) _miniBtn.style.display = 'none';
    return;
  }
  if (!_built) {
    injectStyles();
    _panel   = buildPanel();
    _miniBtn = buildMiniBtn();
    document.body.appendChild(_panel);
    document.body.appendChild(_miniBtn);
    _built = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      _panel.style.opacity   = '1';
      _panel.style.transform = 'translateY(0)';
    }));
  } else {
    _miniBtn.style.display = 'flex';
  }
}

// ─── Open / close ─────────────────────────────────────────────────────────────
function openPanel() {
  if (!_panel) return;
  _miniBtn.style.display = 'none';
  _panel.style.display   = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    _panel.style.opacity   = '1';
    _panel.style.transform = 'translateY(0)';
  }));
}

function closePanel() {
  if (!_panel) return;
  speechSynthesis?.cancel();
  setStatus('Ready to help');
  _panel.style.opacity   = '0';
  _panel.style.transform = 'translateY(14px)';
  setTimeout(() => {
    _panel.style.display   = 'none';
    if (isCurator()) _miniBtn.style.display = 'flex';
  }, 280);
}

// ─── Panel DOM ────────────────────────────────────────────────────────────────
function buildPanel() {
  const panel = document.createElement('div');
  panel.id = 'mh-panel';
  panel.style.opacity   = '0';
  panel.style.transform = 'translateY(16px)';

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'mh-header';

  const avatar = document.createElement('div');
  avatar.className = 'mh-avatar';
  avatar.textContent = '🎩';
  header.appendChild(avatar);

  const info = document.createElement('div');
  info.className = 'mh-info';
  const nameEl = document.createElement('div');
  nameEl.className = 'mh-name';
  nameEl.textContent = 'Mr. Hue';
  _statusEl = document.createElement('div');
  _statusEl.className = 'mh-status';
  _statusEl.id = 'mh-status';
  _statusEl.textContent = 'Ready to help';
  info.appendChild(nameEl);
  info.appendChild(_statusEl);
  header.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'mh-actions';

  _volBtn = document.createElement('button');
  _volBtn.className = 'mh-icon-btn';
  _volBtn.title = 'Toggle sound';
  _volBtn.textContent = '🔊';
  _volBtn.addEventListener('click', toggleMute);
  actions.appendChild(_volBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'mh-icon-btn';
  closeBtn.title = 'Minimise';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closePanel);
  actions.appendChild(closeBtn);

  header.appendChild(actions);
  panel.appendChild(header);

  // ── Chat area ──
  _chatArea = document.createElement('div');
  _chatArea.className = 'mh-chat';
  _chatArea.id = 'mh-chat';

  addBubble(OPENING_LINE, 'assistant');

  panel.appendChild(_chatArea);

  // ── Input row ──
  const inputRow = document.createElement('div');
  inputRow.className = 'mh-input-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'mh-input';
  input.placeholder = 'Try: warmer walls, dim the lights, make it dramatic…';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'mh-send-btn';
  sendBtn.textContent = 'SEND';

  async function doSend() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    setStatus('Thinking…');
    speechSynthesis?.cancel();

    addBubble(text, 'user');
    _history.push({ role: 'user', content: text });

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: API_MODEL,
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: _history,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${err}`);
      }

      const data = await res.json();
      const full = data.content?.[0]?.text ?? '';

      console.log('[Mr. Hue] raw response:', full);

      // Extract JSON block — handle optional whitespace and Windows line-endings
      const jsonMatch = full.match(/```json\r?\n?([\s\S]*?)\r?\n?```/i);
      console.log('[Mr. Hue] json block found:', !!jsonMatch, jsonMatch?.[1]?.slice(0, 120));
      if (jsonMatch) {
        try {
          const cmd = JSON.parse(jsonMatch[1].trim());
          console.log('[Mr. Hue] parsed command:', cmd);
          if (cmd.action === 'scene_update') applySceneUpdate(cmd.params);
        } catch (parseErr) {
          console.warn('[Mr. Hue] JSON parse failed:', parseErr, jsonMatch[1]);
        }
      } else {
        console.warn('[Mr. Hue] no JSON block in response — scene not updated');
      }

      // Display and speak only the text part (strip all code fences)
      const displayText = full
        .replace(/```json[\s\S]*?```/gi, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim();

      _history.push({ role: 'assistant', content: full });
      addBubble(displayText || full, 'assistant', true);

    } catch (err) {
      console.error('[Mr. Hue] API error:', err);
      addBubble('The magic faltered… please try again.', 'assistant', false);
      setStatus('Ready to help');
    } finally {
      // If muted or speech unavailable, restore status here; otherwise speech onend handles it
      if (isMuted || !window.speechSynthesis) setStatus('Ready to help');
      input.disabled   = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.stopPropagation(); doSend(); }
  });

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  panel.appendChild(inputRow);

  return panel;
}

// addBubble — call with role 'assistant' or 'user'
// Automatically speaks assistant bubbles (except the opening, handled separately)
export function addBubble(text, role, autoSpeak = false) {
  if (!_chatArea) return;
  const bubble = document.createElement('div');
  bubble.className = role === 'assistant' ? 'mh-bubble mh-bubble--ai' : 'mh-bubble mh-bubble--user';
  bubble.textContent = text;
  _chatArea.appendChild(bubble);
  _chatArea.scrollTop = _chatArea.scrollHeight;
  if (autoSpeak && role === 'assistant') speak(text);
}

// ─── Mini button ─────────────────────────────────────────────────────────────
function buildMiniBtn() {
  const btn = document.createElement('button');
  btn.id = 'mh-mini-btn';
  btn.textContent = '🎩';
  btn.title = 'Open Mr. Hue';
  btn.style.display = 'none';
  btn.addEventListener('click', openPanel);
  return btn;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('mr-hue-css')) return;
  const s = document.createElement('style');
  s.id = 'mr-hue-css';
  s.textContent = `
    /* ── Panel ── */
    #mh-panel {
      position: fixed;
      bottom: 24px; right: 24px; transform: translateY(16px);
      width: 420px;
      display: flex; flex-direction: column;
      background: rgba(30, 18, 18, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(200, 155, 60, 0.22);
      border-radius: 14px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(200,155,60,0.06);
      z-index: 150;
      overflow: hidden;
      font-family: Georgia, serif;
      opacity: 0;
      transition: opacity 0.30s ease, transform 0.30s ease;
    }

    /* ── Header ── */
    .mh-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid rgba(200, 155, 60, 0.12);
      flex-shrink: 0;
    }
    .mh-avatar {
      width: 52px; height: 52px; flex-shrink: 0;
      border-radius: 50%;
      background: rgba(255, 235, 160, 0.07);
      border: 1px solid rgba(200, 155, 60, 0.28);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; line-height: 1;
    }
    .mh-info { flex: 1; min-width: 0; }
    .mh-name {
      font-size: 16px; font-weight: normal;
      color: #f0ddb0; letter-spacing: 0.06em;
      margin-bottom: 3px;
    }
    .mh-status {
      font-size: 11px; color: rgba(200, 160, 80, 0.50);
      letter-spacing: 0.04em;
    }
    .mh-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .mh-icon-btn {
      width: 30px; height: 30px; border-radius: 6px;
      background: transparent;
      border: 1px solid rgba(200, 155, 60, 0.15);
      color: rgba(200, 160, 80, 0.55);
      font-size: 14px; cursor: pointer; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .mh-icon-btn:hover {
      background: rgba(200, 155, 60, 0.12);
      color: #f0ddb0;
    }

    /* ── Chat area ── */
    .mh-chat {
      height: 120px; overflow-y: auto;
      padding: 12px 16px;
      background: rgba(0,0,0,0.15);
      display: flex; flex-direction: column; gap: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(200,155,60,0.2) transparent;
    }
    .mh-chat::-webkit-scrollbar { width: 4px; }
    .mh-chat::-webkit-scrollbar-thumb {
      background: rgba(200,155,60,0.2); border-radius: 2px;
    }
    .mh-bubble {
      max-width: 92%;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px; line-height: 1.75;
      letter-spacing: 0.01em;
    }
    .mh-bubble--ai {
      background: #3a2a2a;
      color: rgba(240, 220, 185, 0.90);
      align-self: flex-start;
      border-bottom-left-radius: 3px;
    }
    .mh-bubble--user {
      background: rgba(200, 155, 60, 0.18);
      color: rgba(240, 220, 185, 0.85);
      align-self: flex-end;
      border-bottom-right-radius: 3px;
      border: 1px solid rgba(200,155,60,0.2);
    }

    /* ── Input row ── */
    .mh-input-row {
      display: flex; gap: 8px; align-items: center;
      padding: 12px 16px;
      border-top: 1px solid rgba(200, 155, 60, 0.12);
      flex-shrink: 0;
    }
    .mh-input {
      flex: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(200, 155, 60, 0.20);
      border-radius: 8px;
      color: #f0e0c0;
      font-size: 12.5px; font-family: Georgia, serif;
      padding: 9px 12px;
      outline: none;
      transition: border-color 0.15s;
      letter-spacing: 0.02em;
    }
    .mh-input::placeholder { color: rgba(200, 160, 80, 0.30); }
    .mh-input:focus { border-color: rgba(200, 155, 60, 0.50); }
    .mh-send-btn {
      padding: 9px 16px; flex-shrink: 0;
      background: transparent;
      border: 1px solid #e8d5b0;
      border-radius: 8px;
      color: #e8d5b0;
      font-size: 11px; font-family: Georgia, serif;
      letter-spacing: 0.10em; cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .mh-send-btn:hover {
      background: rgba(232, 213, 176, 0.12);
      color: #fff8e8;
    }

    /* ── Mini button ── */
    #mh-mini-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 150;
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(30, 18, 18, 0.90);
      border: 1px solid rgba(200, 155, 60, 0.35);
      font-size: 24px; cursor: pointer; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.60);
      transition: background 0.15s, transform 0.15s;
    }
    #mh-mini-btn:hover {
      background: rgba(60, 35, 10, 0.92);
      transform: scale(1.08);
    }
  `;
  document.head.appendChild(s);
}
