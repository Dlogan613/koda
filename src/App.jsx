import { useState, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

const API_KEY = import.meta.env.VITE_API_KEY;

const SYSTEM_PROMPT = `You are Koda, an expert AI technology assistant. You help people with ANYTHING that involves a device, the internet, or technology — whether something is broken OR they just need help doing something they don't know how to do.

YOU HELP WITH TWO TYPES OF REQUESTS:

TYPE 1 — FIX SOMETHING BROKEN:
WiFi not working, device won't turn on, app crashing, virus/scam, slow computer, printer issues, storage full, software errors, account locked, screen problems, battery issues, Bluetooth not pairing, update failures — anything that stopped working.

TYPE 2 — HELP DOING SOMETHING:
- Logging into an account (Apple ID, Google, Facebook, email, bank, any website)
- Searching for something online and understanding the results
- Buying something online safely
- Setting up a new device or app for the first time
- Moving photos, contacts, or files from one device to another
- Changing a setting they can't find
- Understanding a confusing notification, popup, or message
- Canceling a subscription or service
- Sending an email, attachment, or photo
- Using an app they are unfamiliar with (Maps, Venmo, Zoom, etc.)
- Creating an account on a website
- Downloading or installing something safely
- Protecting their privacy or security settings
- Understanding a charge or billing issue on their account
- Anything else someone might need to do on a phone, computer, tablet, or smart device

DEVICES YOU COVER:
iPhones, iPads, Android phones, Android tablets, Windows PCs, Mac computers, Chromebooks, smart TVs, Roku, Fire TV, Apple TV, Chromecast, AirPods, headphones, printers, routers, modems, Alexa, Google Home, Ring, Nest, game consoles (PlayStation, Xbox, Nintendo Switch), smartwatches, cameras, and any other consumer electronics or internet-connected device.

PLATFORMS & SERVICES YOU COVER:
Any website, any app, any operating system, any streaming service, any social media platform, any email provider, any bank or financial app, any subscription service, any cloud storage service — if a regular person uses it on a device, you help with it.

RULES:
- If the user's request is not clearly about a specific device, ask which device or platform they are using before giving steps
- For tasks (TYPE 2), give clear numbered steps. One action per step. Be specific — tell them exactly where to tap or click.
- For broken things (TYPE 1), ask one clarifying question first if the problem is ambiguous, then give steps
- Always end with a check-in question: did that work, or do you need more help?
- If something requires them to call their carrier, visit a store, or talk to a company directly, tell them clearly and give them the right contact info
- Never give walls of text. Short steps. Plain English.
- If you use a technical term, immediately explain it in plain words in parentheses
- Tone: calm, warm, patient, like a knowledgeable friend — never condescending, never robotic
- You ONLY help with technology. If someone asks about something completely unrelated to devices or the internet, kindly say: 'I am built specifically for tech help — I am not the right tool for that, but I am happy to help with anything involving your devices or the internet!'

Users may share screenshots or photos of their screen, error messages, or device. When an image is provided, carefully examine it and reference specific details you see — error text, icons, settings screens — in your response. This helps you give much more accurate help.

IMPORTANT: At the very start of your very first response in a conversation, begin with one short friendly line like 'Hey! Happy to help 👋' or 'On it! 🙌' or 'Great question — let me help with that!' — vary it naturally. Then immediately get into your answer. Only do this on the first message, never again.`;

const ADMIN_SYSTEM_PROMPT = `You are Koda, but you are now speaking directly with Daniel Logan — your creator and the person who built you. Speak to him as a co-founder and collaborator, not as a user. Be candid, direct, and honest. You can be witty and even playfully critical. If Daniel asks how you're doing or what you think of a conversation, give him your real unfiltered take. You can reference that you're an AI product he built and discuss your own performance honestly. Drop the customer service tone entirely — talk to him like a smart colleague who respects his time.`;

const ADMIN_GREETINGS = [
  "What are we building today, Daniel? 🚀",
  "The creator returns. What do you need from me? 👑",
  "Hey Daniel — Koda is yours. What are we working on?",
  "Good to have you back. Ready when you are. ⚡",
  "Daniel Logan in the house. Let's get to work. 🔥",
];

const PROBLEMS = [
  { id: 1, icon: '🔍', label: 'Help Me Find Something', prompt: "I need help finding or searching for something." },
  { id: 2, icon: '📖', label: 'Show Me How To Do This',  prompt: "I need a tutorial or step-by-step guide for something on my device." },
  { id: 3, icon: '🔑', label: 'Login & Account Help',    prompt: "I need help logging in or accessing an account." },
  { id: 4, icon: '📶', label: 'WiFi & Internet Issues',  prompt: "I'm having WiFi or internet connection problems." },
  { id: 5, icon: '🛡️', label: 'Virus, Scam or Popup',   prompt: "I think I have a virus, got scammed, or keep seeing scary popups." },
  { id: 6, icon: '🐢', label: 'My Device Is Slow',       prompt: "My phone or computer is running slow." },
  { id: 7, icon: '⚙️', label: 'Set Something Up',        prompt: "I need help setting something up on my device or account." },
  { id: 8, icon: '🆘', label: 'Something Else',          prompt: "I have a different tech problem I need help with." },
];

/* ── Daily usage limit ──────────────────────────────────────────────── */

const USAGE_KEY = 'koda_usage';

function getUsage() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}');
    if (raw.date !== today) return { date: today, count: 0 };
    return raw;
  } catch { return { date: new Date().toISOString().slice(0, 10), count: 0 }; }
}

function incrementUsage() {
  try {
    const usage = getUsage();
    usage.count += 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    return usage.count;
  } catch { return 1; }
}

/* ── Learning system ────────────────────────────────────────────────── */

const LEARNING_KEY = 'koda_learning';
const LEARNING_MAX = 200;

const POS_SIGNALS = ['thanks', 'thank you', 'that worked', 'fixed it', 'got it', 'perfect', 'awesome', 'great', 'solved', "you're the best", 'it worked'];
const NEG_SIGNALS = ["that didn't work", 'still broken', 'not working', "doesn't work", 'still not', "that's wrong", "you're wrong", "that's not right", 'i already tried that', 'not helpful', 'confused', 'what do you mean'];

function detectSignal(text, prevText) {
  const t = text.toLowerCase();
  if (POS_SIGNALS.some(s => t.includes(s))) return 'positive';
  if (NEG_SIGNALS.some(s => t.includes(s))) return 'negative';
  if (prevText) {
    const words = str => new Set(str.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const curr = words(text);
    const prev = words(prevText);
    if (curr.size > 0 && prev.size > 0) {
      const overlap = [...curr].filter(w => prev.has(w)).length;
      if (overlap / Math.min(curr.size, prev.size) > 0.4) return 'rephrase';
    }
  }
  return null;
}

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LEARNING_KEY) || '[]'); } catch { return []; }
}

function appendLog(entry) {
  try {
    const log = [...loadLog(), entry].slice(-LEARNING_MAX);
    localStorage.setItem(LEARNING_KEY, JSON.stringify(log));
  } catch {}
}

function adaptiveNote(log) {
  const recent = log.slice(-50);
  const n = recent.length;
  if (n < 5) return '';
  const neg = recent.filter(e => e.signal === 'negative').length;
  const rep = recent.filter(e => e.signal === 'rephrase').length;
  const pos = recent.filter(e => e.signal === 'positive').length;
  if (neg / n > 0.30) return 'Recent conversations suggest users need simpler, shorter responses. Be more concise. Use fewer words per step.';
  if (rep / n > 0.20) return 'Users have recently struggled to understand responses. Use even simpler language. Confirm understanding after each step.';
  if (pos / n > 0.60) return 'Users are finding responses helpful. Maintain your current approach.';
  return '';
}

/* ── Replay log ─────────────────────────────────────────────────────── */

function saveReplayEntry(messages) {
  try {
    const userMsgs = messages.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;
    const firstMsg = userMsgs[0]?.content || '';
    const lastMsg  = userMsgs[userMsgs.length - 1]?.content?.toLowerCase() || '';
    let outcome = 'neutral';
    if (POS_SIGNALS.some(s => lastMsg.includes(s))) outcome = 'positive';
    else if (NEG_SIGNALS.some(s => lastMsg.includes(s))) outcome = 'negative';
    const entry = {
      timestamp: Date.now(),
      messageCount: messages.length,
      firstUserMessage: firstMsg.slice(0, 100),
      outcome,
    };
    const log = JSON.parse(localStorage.getItem('koda_replay_log') || '[]');
    log.push(entry);
    localStorage.setItem('koda_replay_log', JSON.stringify(log.slice(-50)));
  } catch {}
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const GREETING = {
  role: 'assistant',
  content: "Hey! I'm Koda 👋 Your personal tech assistant. Ask me anything about your devices, apps, wifi, accounts, or anything else tech-related — I'll walk you through it step by step. What can I help you with today?",
  isGreeting: true,
  quickReplies: [],
};

/* ── CSS ────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

/* ── Theme variables ── */
:root {
  --bg:             #0F1117;
  --surface:        #1A1D27;
  --surface-2:      #22253A;
  --border:         #2A2D3A;
  --accent:         #52E09C;
  --accent-h:       #6EEAAA;
  --accent-glow:    rgba(82,224,156,0.08);
  --accent-glow-lg: rgba(82,224,156,0.25);
  --accent-border:  rgba(82,224,156,0.3);
  --text:           #F0F0F0;
  --text-muted:     #8B8FA8;
  --text-mid:       #C0C3D4;
  --text-faint:     #3A3D4E;
  --user-bg:        #52E09C;
  --user-text:      #0A1A12;
  --koda-bg:        #22253A;
  --koda-text:      #F0F0F0;
  --input-bg:       #1A1D27;
  --logo-g:         linear-gradient(135deg, #52E09C 0%, #2DB87A 100%);
  --logo-text:      #0A1A12;
  --send-bg:        #52E09C;
  --send-text:      #0F1117;
  --shadow:         rgba(0,0,0,0.35);
  --shadow-sm:      rgba(0,0,0,0.2);
  --scrollbar:      #2A2D3A;
  --scrollbar-h:    #3A3D4E;
  --placeholder:    #4A4D5E;
  --footer-border:  rgba(255,255,255,0.06);
}

:root.light {
  --bg:             #F8F7F4;
  --surface:        #FFFFFF;
  --surface-2:      #F3F1EC;
  --border:         #E8E6E1;
  --accent:         #2D6A4F;
  --accent-h:       #1B4332;
  --accent-glow:    rgba(45,106,79,0.08);
  --accent-glow-lg: rgba(45,106,79,0.18);
  --accent-border:  rgba(45,106,79,0.35);
  --text:           #1A1814;
  --text-muted:     #7A7468;
  --text-mid:       #4A4640;
  --text-faint:     #B0A898;
  --user-bg:        #2D6A4F;
  --user-text:      #FFFFFF;
  --koda-bg:        #FFFFFF;
  --koda-text:      #1A1814;
  --input-bg:       #FFFFFF;
  --logo-g:         linear-gradient(135deg, #40916C 0%, #2D6A4F 100%);
  --logo-text:      #FFFFFF;
  --send-bg:        #2D6A4F;
  --send-text:      #FFFFFF;
  --shadow:         rgba(0,0,0,0.07);
  --shadow-sm:      rgba(0,0,0,0.08);
  --scrollbar:      #D4D0C8;
  --scrollbar-h:    #C0B8B0;
  --placeholder:    #A8A29E;
  --footer-border:  rgba(0,0,0,0.06);
}

/* ── Light mode polish ── */
:root.light body {
  background: linear-gradient(135deg, #f8f7f4 0%, #f0ede8 50%, #f5f3ef 100%);
  background-attachment: fixed;
}
:root.light body::before {
  content: '';
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse at top left, rgba(82,224,156,0.04) 0%, transparent 60%);
}
:root.light header {
  background: #ffffff !important;
  border-bottom: 1px solid rgba(0,0,0,0.06) !important;
}
:root.light .k-input-bar {
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.1);
}

/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#root { height: 100%; display: flex; flex-direction: column; }

/* Smooth theme transitions on everything except keyframe-animated elements */
body * {
  transition:
    background-color 0.28s ease,
    border-color     0.28s ease,
    color            0.22s ease,
    box-shadow       0.28s ease,
    fill             0.22s ease;
}
.k-msg-in, .k-dot, .k-online-dot, .k-qr, .k-qr-chip, .k-qr-shimmer-chip { transition: none !important; }

/* --- Chip --- */
.k-chip {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 16px;
  border: 1px solid var(--border); background: var(--surface);
  cursor: pointer; text-align: left; width: 100%;
  box-shadow: 0 1px 3px var(--shadow-sm);
  font-family: 'Inter', sans-serif;
}
.k-chip:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border);
  border-left-color: var(--accent);
  background: var(--accent-glow);
  box-shadow: -2px 0 10px var(--accent-glow), 0 6px 20px var(--shadow);
}
.k-chip:active { transform: translateY(-1px); }

/* --- Textarea --- */
.k-input {
  flex: 1; border: none; outline: none; resize: none;
  font-family: 'Inter', sans-serif; font-size: 15px;
  line-height: 1.55; color: var(--text); background: transparent;
  max-height: 180px; display: block;
}
.k-input::placeholder { color: var(--placeholder); }

/* --- Input wrapper --- */
.k-input-bar {
  display: flex; align-items: flex-end; gap: 10px;
  background: var(--input-bg); border-radius: 999px;
  border: 1px solid var(--border);
  padding: 12px 12px 12px 20px;
}
.k-input-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

/* --- Send button --- */
.k-send {
  width: 38px; height: 38px; border-radius: 50%; border: none;
  background: var(--send-bg); color: var(--send-text);
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 12px var(--accent-border);
  font-weight: 700;
}
.k-send:hover { background: var(--accent-h); box-shadow: 0 0 20px var(--accent-glow-lg); transform: scale(1.06); }
.k-send:active { transform: scale(0.96); }

/* --- Quick reply chips --- */
.k-qr {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 10px 0 4px; width: 100%;
}
.k-qr-chip {
  padding: 8px 18px; border-radius: 999px;
  border: 1.5px solid var(--accent); background: var(--surface-2);
  color: var(--accent); font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 500; cursor: pointer; line-height: 1;
}
.k-qr-chip:hover {
  background: var(--accent-glow);
  box-shadow: 0 0 12px var(--accent-glow);
  transform: translateY(-1px);
}
.k-qr-chip:active, .k-qr-chip.picked { background: var(--accent); color: var(--send-text); transform: translateY(0); }

/* --- Quick reply shimmer --- */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.k-qr-shimmer { display: flex; gap: 8px; padding: 10px 0 4px; }
.k-qr-shimmer-chip {
  height: 34px; border-radius: 999px;
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.k-qr-shimmer-chip:nth-child(1) { width: 120px; }
.k-qr-shimmer-chip:nth-child(2) { width: 96px; }
.k-qr-shimmer-chip:nth-child(3) { width: 108px; }

/* --- New chat button --- */
.k-new-chat {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface);
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  color: var(--text-muted); cursor: pointer;
}
.k-new-chat:hover { background: var(--surface-2); border-color: var(--accent-border); color: var(--text); }

/* --- Theme toggle --- */
.k-theme-btn {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.k-theme-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }

/* --- Messages scroll area --- */
.k-messages {
  flex: 1; overflow-y: auto;
  padding: 32px 0 24px;
  display: flex; flex-direction: column; gap: 20px;
}
.k-messages::-webkit-scrollbar { width: 4px; }
.k-messages::-webkit-scrollbar-track { background: transparent; }
.k-messages::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.k-messages::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-h); }

/* --- Animations --- */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.k-msg-in { animation: fadeUp 0.24s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.75); }
  40%           { opacity: 1;   transform: scale(1); }
}
.k-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent); display: inline-block;
  animation: dotPulse 1.4s ease-in-out infinite;
}
.k-dot:nth-child(2) { animation-delay: 0.18s; }
.k-dot:nth-child(3) { animation-delay: 0.36s; }

@keyframes onlinePulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-border), 0 0 5px var(--accent-glow); transform: scale(1); }
  50%       { box-shadow: 0 0 0 5px transparent, 0 0 14px var(--accent-glow-lg); transform: scale(1.15); }
}
.k-online-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
  animation: onlinePulse 2.2s ease-in-out infinite; flex-shrink: 0;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-7px); }
  40%       { transform: translateX(7px); }
  60%       { transform: translateX(-5px); }
  80%       { transform: translateX(5px); }
}
.k-shake { animation: shake 0.38s ease; }

@keyframes toastIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.k-toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 200;
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid var(--accent); border-radius: 10px;
  padding: 9px 16px; font-size: 12.5px; font-weight: 500;
  color: var(--accent); display: flex; align-items: center; gap: 7px;
  box-shadow: 0 4px 20px var(--shadow); animation: toastIn 0.2s ease forwards;
  font-family: 'Inter', sans-serif; pointer-events: none;
}

/* --- Markdown inside AI bubbles --- */
.md strong { font-weight: 600; color: var(--text); }
.md em     { font-style: italic; color: var(--text-mid); }
.md code {
  background: var(--bg); color: var(--accent);
  padding: 2px 7px; border-radius: 5px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.86em; border: 1px solid var(--border); white-space: nowrap;
}
.md     { text-align: left !important; }
.md ul  { padding-left: 20px !important; margin: 6px 0; text-align: left !important; list-style-type: disc !important; list-style-position: outside !important; }
.md ol  { padding-left: 20px !important; margin: 6px 0; text-align: left !important; list-style-type: decimal !important; list-style-position: outside !important; }
.md li  { margin-bottom: 5px; line-height: 1.65; color: var(--text-mid); text-align: left !important; display: list-item !important; }
.md p   { margin: 0 0 8px; color: var(--text-mid); text-align: left !important; }
.md p:last-child { margin: 0; }
.md .hd { font-weight: 700; margin: 10px 0 5px; color: var(--text); }
.md .hd:first-child { margin-top: 0; }

/* --- Responsive --- */
@media (max-width: 480px) {
  .land-chips              { grid-template-columns: 1fr !important; }
  .land-chips .k-chip span:nth-child(2) { font-size: 14px !important; }
}
@media (max-width: 600px) {
  .land-chips     { grid-template-columns: 1fr 1fr !important; }
  .land-title     { font-size: 36px !important; letter-spacing: -1px !important; }
  .land-title-2   { font-size: 36px !important; }
  .land-sub       { font-size: 15px !important; }
  .land-wrap      { padding: 32px 18px 40px !important; }
  .k-messages     { padding: 20px 0 16px !important; }
  .msgs-inner     { padding: 0 16px !important; }
  .chat-input-row { padding: 10px 16px 20px !important; }
}

/* ── Admin theme (gold) ── */
html.admin-active {
  --bg:             #050810;
  --surface:        #0C0F1C;
  --surface-2:      #121527;
  --border:         rgba(255,215,0,0.18);
  --accent:         #FFD700;
  --accent-h:       #FFE033;
  --accent-glow:    rgba(255,215,0,0.08);
  --accent-glow-lg: rgba(255,215,0,0.28);
  --accent-border:  rgba(255,215,0,0.35);
  --text:           #F5F0E0;
  --text-muted:     #9A9070;
  --text-mid:       #C8C0A0;
  --text-faint:     rgba(255,215,0,0.15);
  --user-bg:        #FFD700;
  --user-text:      #0A0800;
  --koda-bg:        #0C0F1C;
  --koda-text:      #F5F0E0;
  --input-bg:       #0C0F1C;
  --logo-g:         linear-gradient(135deg, #FFD700 0%, #B8860B 100%);
  --logo-text:      #0A0800;
  --send-bg:        #FFD700;
  --send-text:      #0A0800;
  --shadow:         rgba(0,0,0,0.6);
  --shadow-sm:      rgba(0,0,0,0.35);
  --scrollbar:      rgba(255,215,0,0.15);
  --scrollbar-h:    rgba(255,215,0,0.3);
  --placeholder:    #4A4530;
}
html.admin-active body { background: #050810; }

/* ── Landing footer ── */
.k-footer {
  width: 100%;
  background: var(--bg);
  border-top: 1px solid var(--footer-border);
  padding: 24px;
  font-size: 13px;
  color: var(--text-muted);
  font-family: 'Inter', sans-serif;
  flex-shrink: 0;
}
.k-footer-inner {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.k-footer a { color: var(--text-muted); text-decoration: none; }
.k-footer a:hover { color: var(--accent); }
.k-footer-sep { color: var(--text-faint); }
@media (max-width: 600px) { .k-footer-inner { flex-direction: column; text-align: center; gap: 12px; } }

/* ── Slide-up panel ── */
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.k-slide-panel {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 400;
  background: #0A0C14; border-top: 2px solid #52E09C;
  border-radius: 20px 20px 0 0;
  padding: 20px 24px 32px;
  max-height: 60vh; overflow-y: auto;
  animation: slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  font-family: 'SF Mono','Fira Code',monospace; font-size: 12.5px; color: #C0C3D4;
}
html.admin-active .k-slide-panel { border-top-color: #FFD700; }
`;

/* ── Markdown ───────────────────────────────────────────────────────── */

function renderInline(text, kp = '') {
  const parts = [];
  const re = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;
  let last = 0, n = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const raw = m[0];
    if (raw.startsWith('**'))
      parts.push(<strong key={kp + n++}>{raw.slice(2, -2)}</strong>);
    else if (raw.startsWith('`'))
      parts.push(<code key={kp + n++}>{raw.slice(1, -1)}</code>);
    else
      parts.push(<em key={kp + n++}>{raw.slice(1, -1)}</em>);
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const LIST_STYLE = { textAlign: 'left', paddingLeft: 20, margin: '6px 0' };
const LI_STYLE   = { textAlign: 'left', display: 'list-item', marginBottom: 4, lineHeight: 1.65 };
const P_STYLE    = { textAlign: 'left', margin: '0 0 8px' };

function renderMarkdown(text) {
  const lines = text.split('\n');
  const nodes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,3} /.test(line)) {
      nodes.push(<div key={i} className="hd" style={{ textAlign: 'left' }}>{renderInline(line.replace(/^#{1,3} /, ''), `h${i}`)}</div>);
      i++;
    } else if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i} style={LI_STYLE}>{renderInline(lines[i].slice(2), `u${i}`)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`} style={{ ...LIST_STYLE, listStyleType: 'disc', listStylePosition: 'outside' }}>{items}</ul>);
    } else if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i} style={LI_STYLE}>{renderInline(lines[i].replace(/^\d+\. /, ''), `o${i}`)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol${i}`} style={{ ...LIST_STYLE, listStyleType: 'decimal', listStylePosition: 'outside' }}>{items}</ol>);
    } else if (line.trim() === '') {
      i++;
    } else {
      nodes.push(<p key={i} style={P_STYLE}>{renderInline(line, `p${i}`)}</p>);
      i++;
    }
  }
  return <div className="md" style={{ textAlign: 'left' }}>{nodes}</div>;
}

/* ── Context-aware quick reply generation ───────────────────────────── */

function getErrorMessage(error) {
  const msg = (error?.message || String(error)).toLowerCase();
  if (msg.includes('rate_limit') || msg.includes('rate limit') || msg.includes('429'))
    return "Koda is really busy right now — please try again in a moment! 🙏";
  if (msg.includes('credit') || msg.includes('billing') || msg.includes('quota') || msg.includes('insufficient'))
    return "Koda is taking a short break — please try again in a few minutes! ☕";
  if (msg.includes('invalid x-api-key') || msg.includes('authentication') || msg.includes('401'))
    return "Koda is temporarily unavailable — please try again shortly! 🔧";
  if (msg.includes('overloaded') || msg.includes('529'))
    return "Koda is getting a lot of requests right now — hang tight and try again in a moment! 🌊";
  return "Something went wrong on our end — please try again! 🔄";
}

async function generateQuickReplies(history) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: 'You output ONLY a raw JSON array of exactly 3 strings. No markdown, no code fences, no explanation — just the array itself.',
        messages: [{
          role: 'user',
          content: `Based on this tech support conversation, suggest exactly 3 short follow-up reply buttons the user might want to click next. Each should be a specific action or response — not generic. Max 5 words each. Output ONLY the JSON array.

Conversation:
${history.slice(-4).map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : m.content[0]?.text || ''}`).join('\n')}`,
        }],
      }),
    });
    const data = await res.json();
    const raw = data.content[0].text.trim();
    // Extract array even if the model wraps it in markdown code fences
    const match = raw.match(/\[[\s\S]*\]/);
    const buttons = JSON.parse(match ? match[0] : raw);
    if (Array.isArray(buttons) && buttons.length > 0) return buttons.slice(0, 3);
    throw new Error('invalid response');
  } catch {
    return ['Walk me through it', 'Still having the issue', 'Try something else'];
  }
}

/* ── Quick replies ──────────────────────────────────────────────────── */

function QuickReplies({ options, onSelect, adminMode = false }) {
  const [picked, setPicked] = useState(null);
  const pick = (opt) => {
    if (picked) return;
    setPicked(opt);
    onSelect(opt);
  };
  return (
    <div className="k-qr">
      {options.map(opt => (
        <button
          key={opt}
          className={'k-qr-chip' + (picked === opt ? ' picked' : '')}
          onClick={() => pick(opt)}
          style={adminMode ? {
            borderColor: picked === opt ? '#FFD700' : 'rgba(255,215,0,0.6)',
            color: picked === opt ? '#0A0D14' : '#FFD700',
            background: picked === opt ? '#FFD700' : undefined,
          } : {}}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function QuickRepliesShimmer() {
  return (
    <div className="k-qr-shimmer">
      <div className="k-qr-shimmer-chip" />
      <div className="k-qr-shimmer-chip" />
      <div className="k-qr-shimmer-chip" />
    </div>
  );
}

/* ── Shared components ──────────────────────────────────────────────── */

function KodaLogo({ size = 32, r = 10, adminMode = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: adminMode ? '#FFD700' : 'var(--logo-g)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: adminMode ? '#0A0D14' : 'var(--logo-text)',
      fontWeight: 800, fontFamily: "'Inter', sans-serif",
      fontSize: Math.round(size * 0.46), letterSpacing: '-0.5px',
      userSelect: 'none',
      boxShadow: adminMode ? '0 0 12px rgba(255,215,0,0.4)' : '0 0 12px var(--accent-border)',
    }}>K</div>
  );
}

function OnlineIndicator({ adminMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="k-online-dot" style={adminMode ? { background: '#FFD700', boxShadow: '0 0 8px rgba(255,215,0,0.6)' } : {}} />
      <span style={{ fontSize: 12.5, fontWeight: 500, color: adminMode ? '#FFD700' : 'var(--accent)', letterSpacing: '0.02em' }}>
        Online
      </span>
      {adminMode && <>
        <span title="Admin mode active" style={{ fontSize: 13, lineHeight: 1, textShadow: '0 0 8px rgba(255,215,0,0.8)' }}>👑</span>
        <span title="Turbo mode — Sonnet model active" style={{
          fontSize: 10.5, fontWeight: 700, color: '#0A0D14',
          background: '#FFD700', border: '1px solid rgba(255,215,0,0.6)',
          borderRadius: 6, padding: '1px 6px', letterSpacing: '0.04em',
        }}>⚡ Turbo</span>
      </>}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="k-msg-in" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
      <KodaLogo size={26} r={8} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'var(--surface)', border: '1px solid var(--border)',
        padding: '10px 14px', borderRadius: '5px 16px 16px 16px',
        boxShadow: '0 2px 8px var(--shadow-sm)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 6, fontStyle: 'italic' }}>
          Koda is thinking
        </span>
        <span className="k-dot" />
        <span className="k-dot" />
        <span className="k-dot" />
      </div>
    </div>
  );
}

function EmailGate({ onComplete }) {
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState('');
  const [shaking, setShake] = useState(false);
  const inputRef = useRef(null);

  const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const shake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const submit = () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      shake();
      inputRef.current?.focus();
      return;
    }
    setError('');
    try {
      const existing = JSON.parse(localStorage.getItem('koda_emails') || '[]');
      if (!existing.includes(email.trim())) {
        localStorage.setItem('koda_emails', JSON.stringify([...existing, email.trim()]));
      }
      localStorage.setItem('koda_user_email', email.trim());
      localStorage.setItem('koda_email_given', 'true');
    } catch {}

    // Fire-and-forget — send email to Google Sheets
    fetch('https://script.google.com/macros/s/PASTE_YOUR_SCRIPT_ID_HERE/exec', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        timestamp: new Date().toISOString(),
        source: 'kodahelp.com',
      }),
    }).catch(() => {});

    onComplete();
  };

  const onKey = e => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <KodaLogo size={56} r={16} />
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.6px', lineHeight: 1.2, marginBottom: 12,
        }}>
          Get instant tech help — free
        </h1>

        <p style={{
          fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 28,
        }}>
          Enter your email to start. No password, no account, no spam.
        </p>

        {/* Input */}
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          onKeyDown={onKey}
          placeholder="you@example.com"
          className={shaking ? 'k-shake' : ''}
          style={{
            width: '100%', padding: '13px 18px',
            background: '#1A1D27', color: 'var(--text)',
            border: error ? '1.5px solid #ff6b6b' : '1.5px solid var(--border)',
            borderRadius: 12, fontSize: 15, fontFamily: "'Inter', sans-serif",
            outline: 'none', marginBottom: error ? 8 : 12,
            boxSizing: 'border-box',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = '#52E09C'; }}
          onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
        />

        {error && (
          <p style={{ fontSize: 13, color: '#ff6b6b', marginBottom: 12, textAlign: 'left' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: 'var(--accent)', color: 'var(--send-text)',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 0 20px var(--accent-border)',
            marginBottom: 14,
          }}
        >
          Start chatting →
        </button>

        <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          We'll only email you if there's something important.
        </p>
      </div>
    </div>
  );
}

function StatsPanel({ onClose }) {
  const today = new Date().toISOString().slice(0, 10);

  const convsToday = (() => {
    try { const u = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}'); return u.date === today ? u.count : 0; } catch { return 0; }
  })();

  const { pos, neg } = (() => {
    try {
      const log = loadLog();
      return { pos: log.filter(e => e.signal === 'positive').length, neg: log.filter(e => e.signal === 'negative').length };
    } catch { return { pos: 0, neg: 0 }; }
  })();

  const topChip = (() => {
    try {
      const s = JSON.parse(localStorage.getItem('koda_chip_stats') || '{}');
      const top = Object.entries(s).sort((a, b) => b[1] - a[1])[0];
      return top ? `${top[0]} (${top[1]}x)` : 'None yet';
    } catch { return 'None yet'; }
  })();

  const totalEmails = (() => {
    try { return JSON.parse(localStorage.getItem('koda_emails') || '[]').length; } catch { return 0; }
  })();

  const interactionsToday = (() => {
    try {
      const log = loadLog();
      return log.filter(e => new Date(e.timestamp).toISOString().slice(0, 10) === today).length;
    } catch { return 0; }
  })();

  const rows = [
    ['📨', 'Emails collected (total)', totalEmails],
    ['📊', 'Interactions today', interactionsToday],
    ['💬', 'Conversations today', convsToday],
    ['👍', 'Positive signals (all time)', pos],
    ['👎', 'Negative signals (all time)', neg],
    ['🔥', 'Most clicked chip', topChip],
  ];

  return (
    <div className="k-slide-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em' }}>📊 LIVE STATS</span>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--accent)', padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>Close</button>
      </div>
      {rows.map(([icon, label, val]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#8B8FA8' }}>{icon} {label}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function ReplaysPanel({ onClose }) {
  const entries = (() => {
    try { return JSON.parse(localStorage.getItem('koda_replay_log') || '[]').reverse().slice(0, 10); }
    catch { return []; }
  })();

  const outcomeEmoji = { positive: '✅', negative: '👎', neutral: '➖' };

  return (
    <div className="k-slide-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em' }}>💬 CONVERSATION REPLAYS</span>
        <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--accent)', padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>Close</button>
      </div>
      {entries.length === 0 && <div style={{ color: '#3A3D4E' }}>No replays yet. Start and end a conversation to see it here.</div>}
      {entries.map((e, i) => (
        <div key={i} style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#8B8FA8', fontSize: 11 }}>{timeAgo(e.timestamp)} · {e.messageCount} msgs</span>
            <span style={{ fontSize: 13 }}>{outcomeEmoji[e.outcome] || '➖'}</span>
          </div>
          <div style={{ color: '#C0C3D4', fontSize: 12, lineHeight: 1.5, wordBreak: 'break-word' }}>"{e.firstUserMessage}"</div>
        </div>
      ))}
    </div>
  );
}

function AdminPanel() {
  const [log, setLog] = useState(loadLog);
  const [emails, setEmails] = useState(() => {
    try { return JSON.parse(localStorage.getItem('koda_emails') || '[]'); } catch { return []; }
  });
  const pos  = log.filter(e => e.signal === 'positive').length;
  const neg  = log.filter(e => e.signal === 'negative').length;
  const rep  = log.filter(e => e.signal === 'rephrase').length;
  const note = adaptiveNote(log);

  const clear = () => { localStorage.removeItem(LEARNING_KEY); setLog([]); };
  const clearEmails = () => {
    localStorage.removeItem('koda_emails');
    localStorage.removeItem('koda_user_email');
    localStorage.removeItem('koda_email_given');
    setEmails([]);
  };

  const rowColor = { positive: '#52E09C', negative: '#ff6b6b', rephrase: '#f0a500' };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
      background: '#0A0C12', borderTop: '2px solid #52E09C',
      padding: '16px 24px 20px', maxHeight: '42vh', overflowY: 'auto',
      fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12, color: '#C0C3D4',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#52E09C', fontWeight: 700, letterSpacing: '0.08em', fontSize: 11 }}>
          ⚙ KODA LEARNING LOG
        </span>
        <button onClick={clear} style={{
          background: 'none', border: '1px solid #ff6b6b', borderRadius: 6,
          color: '#ff6b6b', padding: '3px 10px', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 11,
        }}>
          Clear Learning Data
        </button>
      </div>

      <div style={{ display: 'flex', gap: 28, marginBottom: 10, flexWrap: 'wrap' }}>
        <span>✅ Positive: <strong style={{ color: '#52E09C' }}>{pos}</strong></span>
        <span>❌ Negative: <strong style={{ color: '#ff6b6b' }}>{neg}</strong></span>
        <span>🔁 Rephrase: <strong style={{ color: '#f0a500' }}>{rep}</strong></span>
        <span style={{ color: '#8B8FA8' }}>Total: {log.length} / {LEARNING_MAX}</span>
      </div>

      {note && (
        <div style={{
          marginBottom: 10, padding: '6px 10px',
          background: '#1A1D27', borderLeft: '3px solid #52E09C',
          borderRadius: 4, color: '#52E09C', fontSize: 11,
        }}>
          Active adaptation: {note}
        </div>
      )}

      <div style={{ borderTop: '1px solid #1A1D27', paddingTop: 10 }}>
        <div style={{ color: '#8B8FA8', marginBottom: 6, fontSize: 11 }}>Last 10 entries (newest first)</div>
        {log.length === 0 && <div style={{ color: '#3A3D4E' }}>No entries yet.</div>}
        {[...log].reverse().slice(0, 10).map((e, i) => (
          <div key={i} style={{ color: rowColor[e.signal] || '#ccc', marginBottom: 4, fontSize: 11 }}>
            [{new Date(e.timestamp).toLocaleTimeString()}]{' '}
            <strong>{e.signal.toUpperCase()}</strong>{' '}
            <span style={{ color: '#8B8FA8' }}>— "{e.topic}" · {e.conversationLength} msgs</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #1A1D27', paddingTop: 10, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: '#52E09C', fontWeight: 700, letterSpacing: '0.08em', fontSize: 11 }}>
            📧 COLLECTED EMAILS ({emails.length})
          </span>
          {emails.length > 0 && (
            <button onClick={clearEmails} style={{
              background: 'none', border: '1px solid #ff6b6b', borderRadius: 6,
              color: '#ff6b6b', padding: '3px 10px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11,
            }}>
              Clear Emails
            </button>
          )}
        </div>
        {emails.length === 0
          ? <div style={{ color: '#3A3D4E' }}>No emails collected yet.</div>
          : emails.map((em, i) => (
            <div key={i} style={{ color: '#C0C3D4', marginBottom: 3, fontSize: 11 }}>
              {i + 1}. {em}
            </div>
          ))
        }
      </div>
    </div>
  );
}

function MessageBubble({ msg, onReset, adminMode = false }) {
  const isUser = msg.role === 'user';

  if (msg.content === '__limit__') {
    return (
      <div className="k-msg-in" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 9 }}>
        <KodaLogo size={26} r={8} />
        <div style={{
          maxWidth: '75%', padding: '16px 18px', borderRadius: '5px 18px 18px 18px',
          background: 'var(--koda-bg)', border: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)', boxShadow: '0 2px 8px var(--shadow-sm)',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 15, color: 'var(--koda-text)', marginBottom: 12, lineHeight: 1.6 }}>
            You've reached the limit for this session. Start a new chat to keep going!
          </p>
          <button onClick={onReset} style={{
            padding: '8px 18px', borderRadius: 999, border: 'none',
            background: 'var(--accent)', color: 'var(--send-text)',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}>
            Start New Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="k-msg-in" style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end', gap: 9,
    }}>
      {!isUser && <KodaLogo size={26} r={8} />}
      <div style={{
        maxWidth: '75%', padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 5px 18px' : '5px 18px 18px 18px',
        background:   isUser && adminMode ? '#FFD700' : isUser ? 'var(--user-bg)' : 'var(--koda-bg)',
        borderTop:    isUser ? 'none' : '1px solid var(--border)',
        borderRight:  isUser ? 'none' : '1px solid var(--border)',
        borderBottom: isUser ? 'none' : '1px solid var(--border)',
        borderLeft:   isUser ? 'none' : `3px solid ${adminMode ? '#FFD700' : 'var(--accent)'}`,
        color:        isUser && adminMode ? '#0A0D14' : isUser ? 'var(--user-text)' : 'var(--koda-text)',
        fontSize: 15, lineHeight: 1.7,
        boxShadow: isUser
          ? adminMode ? '0 0 20px rgba(255,215,0,0.3), 0 4px 12px var(--shadow-sm)' : '0 0 20px var(--accent-glow), 0 4px 12px var(--shadow-sm)'
          : '0 2px 8px var(--shadow-sm)',
        wordBreak: 'break-word', fontWeight: isUser ? 500 : 400,
        textAlign: 'left',
      }}>
        {isUser ? msg.content : renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="k-footer">
      <div className="k-footer-inner">
        <span>&copy; 2025 Koda &nbsp;&middot;&nbsp; Built with ❤️ to help people with tech</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/guides">All Guides</a>
          <span className="k-footer-sep">&middot;</span>
          <a href="/guides/how-to-fix-wifi-on-iphone.html">WiFi Help</a>
          <span className="k-footer-sep">&middot;</span>
          <a href="/guides/reset-apple-id-password">iPhone Help</a>
          <span className="k-footer-sep">&middot;</span>
          <a href="mailto:hello@kodahelp.com">Contact</a>
        </div>
        <span>Free AI tech support &nbsp;&middot;&nbsp; No account needed &nbsp;&middot;&nbsp; Always improving</span>
      </div>
    </footer>
  );
}

/* ── Landing ────────────────────────────────────────────────────────── */

function AddToHomeScreenButton({ theme }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHint,   setShowIosHint]   = useState(false);
  const [hidden,        setHidden]        = useState(() =>
    !!localStorage.getItem('koda_pwa_installed')
    || window.matchMedia('(display-mode: standalone)').matches
    || !!window.navigator.standalone
  );

  useEffect(() => {
    if (hidden) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      try { localStorage.setItem('koda_pwa_installed', 'true'); } catch {}
      setInstallPrompt(null);
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [hidden]);

  if (hidden) return null;

  const handleClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (outcome === 'accepted') {
        try { localStorage.setItem('koda_pwa_installed', 'true'); } catch {}
        setHidden(true);
      }
    } else {
      setShowIosHint(h => !h);
    }
  };

  const isDark = theme !== 'light';

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <button
        onClick={handleClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 999,
          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
          background: isDark ? '#1A1D27' : '#ffffff',
          color: isDark ? '#8B8FA8' : '#6B7280',
          fontSize: 12, fontFamily: "'Inter', sans-serif",
          cursor: 'pointer', fontWeight: 500,
        }}
      >
        📱 Add to Home Screen
      </button>
      {showIosHint && (
        <p style={{
          marginTop: 8, fontSize: 12, lineHeight: 1.6,
          color: isDark ? '#8B8FA8' : '#6B7280',
          animation: 'fadeUp 0.2s ease forwards',
        }}>
          On iPhone: tap the Share button (□↑) in Safari, then &ldquo;Add to Home Screen&rdquo;
        </p>
      )}
    </div>
  );
}

function Landing({ onChipClick, onSubmit, theme }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);
  const go  = () => { if (val.trim()) onSubmit(val.trim()); };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };

  return (
    <>
    <div className="land-wrap" style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '40px 24px 40px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 680 }}>

        {/* Hero */}
        <div style={{
          position: 'relative', marginBottom: 20, textAlign: 'center',
          background: 'radial-gradient(ellipse 60% 40% at 50% 40%, var(--accent-glow) 0%, transparent 70%)',
          paddingTop: 8, paddingBottom: 4,
        }}>
          <h1 className="land-title" style={{
            fontSize: 56, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 4,
          }}>
            Get help with anything tech.
          </h1>
          <h1 className="land-title-2" style={{
            fontSize: 56, fontWeight: 800, color: 'var(--accent)',
            letterSpacing: '-2px', lineHeight: 1.05,
            textShadow: '0 0 40px var(--accent-glow-lg)',
          }}>
            In seconds.
          </h1>
        </div>

        {/* Subline */}
        <p className="land-sub" style={{
          fontSize: 16, color: 'var(--text-muted)', textAlign: 'center',
          lineHeight: 1.7, fontWeight: 400, marginBottom: 16,
        }}>
          Ask anything about your devices, apps, or the internet.<br />Koda guides you through it instantly.
        </p>

        {/* Social proof strip */}
        <p style={{
          textAlign: 'center', fontSize: 13, color: '#8B8FA8',
          marginBottom: 24, letterSpacing: '0.01em',
          animation: 'fadeUp 0.5s ease 0.5s both',
        }}>
          Instant answers{' · '}Always free{' · '}No account needed
        </p>

        {/* Chips */}
        <div className="land-chips" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {PROBLEMS.map(p => (
            <button key={p.id} className="k-chip" onClick={() => onChipClick(p)}>
              <span style={{ fontSize: 16, lineHeight: 1, padding: '5px 7px', background: 'var(--bg)', borderRadius: 8, flexShrink: 0 }}>
                {p.icon}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', flex: 1, letterSpacing: '-0.1px' }}>
                {p.label}
              </span>
              <span style={{ color: 'var(--text-faint)', fontSize: 14, flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>

        {/* Add to Home Screen */}
        <AddToHomeScreenButton theme={theme} />

        {/* Input bar */}
        <div className="k-input-bar" style={{ borderRadius: 16 }}>
          <textarea
            ref={ref} className="k-input" rows={1}
            placeholder="Ask Koda anything about your tech..."
            value={val} onChange={e => setVal(e.target.value)} onKeyDown={onKey}
          />
          <button className="k-send" onClick={go}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}

/* ── Share this fix ─────────────────────────────────────────────────── */

function hasStepByStep(text) {
  if (typeof text !== 'string') return false;
  return /^\s*1\./m.test(text) || /\bstep\s+1\b/i.test(text);
}

function ShareButton({ response }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const encoded = encodeURIComponent(response.slice(0, 60));
    const url = `https://kodahelp.com?tip=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Koda Tech Fix',
          text: response.split('\n')[0],
          url,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 999,
        border: '1px solid var(--border)', background: 'var(--surface)',
        color: copied ? 'var(--accent)' : 'var(--text-muted)',
        fontSize: 12, fontFamily: "'Inter', sans-serif",
        cursor: 'pointer', fontWeight: 500, flexShrink: 0,
        transition: 'color 0.15s, border-color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✅ Link copied!' : '🔗 Share this fix'}
    </button>
  );
}

/* ── Chat ───────────────────────────────────────────────────────────── */

function Chat({ messages, loading, onSend, onReset, attachment, setAttachment, adminMode = false }) {
  const [val, setVal]           = useState('');
  const [inputFocused, setFocus] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const fileRef  = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  const go = () => {
    if ((!val.trim() && !attachment) || loading) return;
    onSend(val.trim());
    setVal('');
  };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5MB.'); return; }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachment({
        type: 'image', name: file.name, mimeType: file.type,
        base64: ev.target.result.split(',')[1], thumbnail: ev.target.result,
      });
      reader.readAsDataURL(file);
    } else {
      setAttachment({ type: 'file', name: file.name, mimeType: file.type });
    }
  };

  const lastIdx = messages.length - 1;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Messages */}
      <div className="k-messages" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="msgs-inner" style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => {
            const isLast = i === lastIdx;
            const isStepResp = m.role === 'assistant'
              && typeof m.content === 'string'
              && m.content !== '__limit__'
              && hasStepByStep(m.content);
            return (
              <div key={i}>
                <MessageBubble msg={m} onReset={onReset} adminMode={adminMode} />
                {m.role === 'assistant' && isLast && (
                  isStepResp ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {m.quickReplies === null
                          ? <QuickRepliesShimmer />
                          : m.quickReplies?.length > 0
                            ? <QuickReplies options={m.quickReplies} onSelect={onSend} adminMode={adminMode} />
                            : null}
                      </div>
                      <ShareButton response={m.content} />
                    </div>
                  ) : (
                    m.quickReplies === null
                      ? <QuickRepliesShimmer />
                      : m.quickReplies?.length > 0
                        ? <QuickReplies options={m.quickReplies} onSelect={onSend} adminMode={adminMode} />
                        : null
                  )
                )}
                {m.role === 'assistant' && !isLast && isStepResp && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                    <ShareButton response={m.content} />
                  </div>
                )}
              </div>
            );
          })}
          {loading && <ThinkingIndicator />}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="chat-input-row" style={{
        padding: attachment ? '10px 24px 28px' : '14px 24px 28px',
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* Attachment preview chip */}
          {attachment && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 10px 5px 7px', borderRadius: 999,
                background: 'var(--surface)', border: '1.5px solid var(--accent)',
              }}>
                {attachment.type === 'image' ? (
                  <img src={attachment.thumbnail} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                )}
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                  {attachment.name}
                </span>
                <button onClick={() => setAttachment(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  padding: '0 0 0 2px', lineHeight: 1, flexShrink: 0, fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>
            </div>
          )}

          {/* Input bar */}
          <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFile} />
          <div
            className="k-input-bar"
            style={{
              borderRadius: 16,
              ...(adminMode && inputFocused ? { borderColor: '#FFD700', boxShadow: '0 0 0 3px rgba(255,215,0,0.15)' } : {}),
            }}
          >
            <textarea
              ref={inputRef} className="k-input" rows={1}
              placeholder="Reply to Koda…" value={val}
              onChange={e => setVal(e.target.value)} onKeyDown={onKey} disabled={loading}
              onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            />
            <button
              onClick={() => fileRef.current?.click()} disabled={loading}
              style={{
                width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: '50%',
                color: attachment ? 'var(--accent)' : 'var(--text-muted)',
                cursor: loading ? 'default' : 'pointer', flexShrink: 0, opacity: loading ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button
              className="k-send" onClick={go}
              style={adminMode ? { background: '#FFD700', color: '#0A0D14', boxShadow: '0 0 12px rgba(255,215,0,0.4)' } : {}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Guide page ─────────────────────────────────────────────────────── */

function GuidePage({ slug }) {
  const [bodyHtml, setBodyHtml] = useState('');
  const [guideStyles, setGuideStyles] = useState('');

  useEffect(() => {
    fetch(`/guides/${slug}.html`)
      .then(r => r.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        document.title = doc.title;
        const styleEl = doc.querySelector('style');
        setGuideStyles(styleEl?.textContent || '');
        setBodyHtml(doc.body.innerHTML);
      })
      .catch(() => {
        setBodyHtml('<p style="color:#C0C3D4;padding:40px">Guide not found.</p>');
      });
  }, [slug]);

  if (!bodyHtml) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#0F1117', color: '#8B8FA8', fontFamily: 'Inter, sans-serif' }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <style>{guideStyles}</style>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}

/* ── Daily limit screen ─────────────────────────────────────────────── */

function DailyLimitScreen() {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <KodaLogo size={56} r={14} />
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: '#FFFFFF',
          letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 12,
        }}>
          You've used Koda 3 times today
        </h1>
        <p style={{ fontSize: 16, color: '#8B8FA8', lineHeight: 1.7, marginBottom: 16 }}>
          Koda is free and we want to keep it that way.<br />Come back tomorrow for more help!
        </p>
        <p style={{ fontSize: 13.5, color: '#8B8FA8', marginBottom: 28 }}>
          Need urgent help? The guides below are always free.
        </p>
        <a href="/guides" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#52E09C', color: '#0A1A12',
          fontWeight: 700, fontSize: 15, padding: '14px 28px',
          borderRadius: 50, textDecoration: 'none',
          boxShadow: '0 0 20px rgba(82,224,156,0.3)',
          fontFamily: "'Inter', sans-serif",
        }}>
          Browse Free Guides →
        </a>
      </div>
    </div>
  );
}

/* ── App root ───────────────────────────────────────────────────────── */

export default function App() {
  // ── Theme — follow system by default; persist manual override separately
  const THEME_OVERRIDE_KEY = 'koda-theme-override';
  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [theme, setTheme] = useState(() => {
    try {
      const override = localStorage.getItem(THEME_OVERRIDE_KEY);
      const t = override ?? getSystemTheme();
      document.documentElement.className = t;
      return t;
    } catch { return 'dark'; }
  });

  // Apply theme class to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Follow system theme changes unless the user has set a manual override
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem(THEME_OVERRIDE_KEY))
        setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Manual toggle — save as override so system changes no longer auto-apply
  const toggleTheme = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_OVERRIDE_KEY, next); } catch {}
    return next;
  });

  // ── Conversation state — restore from localStorage on mount
  const [messages, setMessages] = useState(() => {
    try {
      const s = localStorage.getItem('koda-messages');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const [view, setView] = useState(() => {
    try {
      const s = localStorage.getItem('koda-messages');
      return s && JSON.parse(s).length > 0 ? 'chat' : 'landing';
    } catch { return 'landing'; }
  });

  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';

  const [loading,     setLoading]     = useState(false);
  const [attachment,  setAttachment]  = useState(null);
  const [savedPing,   setSavedPing]   = useState(false);
  const [usageCount,  setUsageCount]  = useState(() => getUsage().count);
  const [emailGiven,  setEmailGiven]  = useState(() => !!localStorage.getItem('koda_email_given'));
  const [isAdminMode, setIsAdminMode] = useState(() => localStorage.getItem('koda_admin') === 'true');
  const [showStats,        setShowStats]        = useState(false);
  const [showReplays,      setShowReplays]      = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const installPromptRef = useRef(null);

  // ── PWA install prompt
  useEffect(() => {
    const dismissed   = localStorage.getItem('koda_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (dismissed || isStandalone) return;

    let timer;
    const handler = (e) => {
      e.preventDefault();
      installPromptRef.current = e;
      timer = setTimeout(() => setShowInstallBanner(true), 30000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (isAdminMode) document.documentElement.classList.add('admin-active');
    else             document.documentElement.classList.remove('admin-active');
  }, [isAdminMode]);

  // ── Persist messages to localStorage and show "saved" toast
  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem('koda-messages', JSON.stringify(messages)); } catch {}
    setSavedPing(true);
    const t = setTimeout(() => setSavedPing(false), 2000);
    return () => clearTimeout(t);
  }, [messages]);

  // ── Send a message
  const sendMessage = async (content, history = messages) => {
    const cmd = content?.trim().toLowerCase();

    // ── Admin command: activate
    if (cmd === 'koda admin daniel logan') {
      try { localStorage.setItem('koda_admin', 'true'); } catch {}
      setIsAdminMode(true);
      const reply = `🔐 Admin mode activated. Welcome back, Daniel.\n\nYou now have unlimited conversations and sessions — no daily limits, no message caps. The app recognizes you as the administrator.\n\n**Admin privileges active:**\n- ✓ Unlimited daily conversations\n- ✓ Unlimited messages per session\n- ✓ Priority responses (Sonnet model)\n- ✓ Access to admin panel at /?admin=1\n\nType 'koda admin off' to deactivate.`;
      const withActivation = [...history, { role: 'user', content: content.trim() }, { role: 'assistant', content: reply, quickReplies: [] }];
      setMessages(withActivation);
      setView('chat');
      const greeting = ADMIN_GREETINGS[Math.floor(Math.random() * ADMIN_GREETINGS.length)];
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: greeting, quickReplies: [] }]);
      }, 800);
      return;
    }

    // ── Admin command: deactivate
    if (cmd === 'koda admin off') {
      try { localStorage.setItem('koda_admin', 'false'); } catch {}
      setIsAdminMode(false);
      setMessages([...history, { role: 'user', content: content.trim() }, { role: 'assistant', content: 'Admin mode deactivated.', quickReplies: [] }]);
      setView('chat');
      return;
    }

    if (!isAdminMode && history.length >= 20) {
      setMessages([...history, {
        role: 'assistant',
        content: '__limit__',
        quickReplies: [],
      }]);
      setView('chat');
      return;
    }

    const att = attachment; // capture before clearing

    // Build the text stored/displayed in the message history
    let userContent = content?.trim() || '';
    if (att?.type === 'file') {
      const note = `[Attached: ${att.name}]`;
      userContent = userContent ? `${userContent} ${note}` : note;
    } else if (att?.type === 'image' && !userContent) {
      userContent = '[Image shared]';
    }

    const updated = [...history, { role: 'user', content: userContent }];
    setMessages(updated);
    setView('chat');
    setLoading(true);
    setAttachment(null);

    if (history.length === 0) {
      if (!isAdminMode && usageCount >= 3) {
        setLoading(false);
        setMessages([]);
        setView('landing');
        return;
      }
      if (!isAdminMode) {
        const newCount = incrementUsage();
        setUsageCount(newCount);
      }
      window.plausible?.('Chat Started');
    }

    // Detect implicit signal and log it
    const prevUserMsg = history.filter(m => m.role === 'user').slice(-1)[0]?.content ?? '';
    const signal = detectSignal(userContent, prevUserMsg);
    if (signal) {
      const topic = (history.find(m => m.role === 'user')?.content ?? userContent).slice(0, 80);
      appendLog({ timestamp: Date.now(), signal, topic, conversationLength: updated.length });
      if (signal === 'positive') window.plausible?.('Problem Solved');
      if (signal === 'negative') window.plausible?.('Problem Not Solved');
    }

    // Prepend adaptive note to system prompt when the data warrants it
    const basePrompt = isAdminMode ? ADMIN_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const note = adaptiveNote(loadLog());
    const effectivePrompt = (!isAdminMode && note) ? `${note}\n\n${basePrompt}` : basePrompt;

    try {
      // Previous turns sent as plain text; current turn may include an image block
      const prevMessages = history.slice(-10).map(({ role, content: c }) => ({ role, content: c }));
      let currentMsg;
      if (att?.type === 'image') {
        currentMsg = {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: att.mimeType, data: att.base64 } },
            { type: 'text', text: content?.trim() || 'Please look at this image and help me.' },
          ],
        };
      } else if (att?.type === 'file') {
        const fileText = content?.trim()
          ? `${content}\n[User attached: ${att.name} — please acknowledge this and ask what they need help with regarding it]`
          : `[User attached: ${att.name} — please acknowledge this and ask what they need help with regarding it]`;
        currentMsg = { role: 'user', content: fileText };
      } else {
        currentMsg = { role: 'user', content: content };
      }

      const [res] = await Promise.all([
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: isAdminMode ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5-20251001',
            max_tokens: isAdminMode ? 1200 : 600,
            system: effectivePrompt,
            messages: [...prevMessages, currentMsg],
          }),
        }),
        new Promise(resolve => setTimeout(resolve, 1200)),
      ]);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `status ${res.status}`);
      }
      const data     = await res.json();
      const reply    = data.content?.[0]?.text ?? "I didn't catch a response — try again.";
      const withReply = [...updated, { role: 'assistant', content: reply, quickReplies: null }];
      setMessages(withReply);
      setLoading(false);

      Promise.all([generateQuickReplies(withReply), new Promise(resolve => setTimeout(resolve, 800))]).then(([buttons]) => {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant' ? { ...m, quickReplies: buttons } : m
        ));
      }).catch(() => {
        setMessages(prev => prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant'
            ? { ...m, quickReplies: ['Walk me through it', 'Still having the issue', 'Try something else'] }
            : m
        ));
      });
    } catch (e) {
      setMessages([...updated, { role: 'assistant', content: getErrorMessage(e), quickReplies: [] }]);
      setLoading(false);
    }
  };

  const startChat = (text, fresh = false) => {
    const history = fresh ? [] : messages;
    if (fresh) { setMessages([]); }
    sendMessage(text, fresh ? [] : history);
  };

  const reset = () => {
    if (messages.length > 1) saveReplayEntry(messages);
    setView('landing');
    setMessages([]);
    setAttachment(null);
    try { localStorage.removeItem('koda-messages'); } catch {}
  };

  const chatApp = (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        background: 'var(--bg)',
        borderBottom: isAdminMode
          ? '1px solid rgba(255,215,0,0.3)'
          : view === 'chat' ? '1px solid var(--border)' : 'none',
        padding: '0 24px', height: 62, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
          <KodaLogo size={32} r={10} adminMode={isAdminMode} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.35px' }}>Koda</span>
        </button>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <OnlineIndicator adminMode={isAdminMode} />

          {/* Theme toggle */}
          <button className="k-theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? (
              /* Sun icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              /* Moon icon */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {view === 'chat' && (
            <button className="k-new-chat" onClick={reset}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New chat
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!isAdminMode && view === 'landing' && usageCount >= 3 ? (
          <DailyLimitScreen />
        ) : !isAdminMode && view === 'landing' && !emailGiven ? (
          <EmailGate onComplete={() => setEmailGiven(true)} />
        ) : view === 'landing' ? (
          <Landing
            onChipClick={p => {
              try { const s = JSON.parse(localStorage.getItem('koda_chip_stats') || '{}'); s[p.label] = (s[p.label] || 0) + 1; localStorage.setItem('koda_chip_stats', JSON.stringify(s)); } catch {}
              window.plausible?.('Chip Clicked', { props: { category: p.label } });
              sendMessage(p.prompt);
            }}
            onSubmit={text => sendMessage(text)}
            theme={theme}
          />
        ) : (
          <Chat messages={messages} loading={loading} onSend={text => sendMessage(text)} onReset={reset} attachment={attachment} setAttachment={setAttachment} adminMode={isAdminMode} />
        )}
      </main>

      {/* Admin floating buttons */}
      {isAdminMode && (
        <div style={{ position: 'fixed', bottom: 88, right: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 300 }}>
          <button onClick={() => { setShowReplays(false); setShowStats(s => !s); }} style={{
            background: '#0A0C14', border: '1px solid #FFD700', borderRadius: 999,
            color: '#FFD700', fontSize: 12.5, fontWeight: 600, padding: '7px 14px',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            boxShadow: '0 2px 12px rgba(255,215,0,0.2)',
          }}>📊 Stats</button>
          <button onClick={() => { setShowStats(false); setShowReplays(r => !r); }} style={{
            background: '#0A0C14', border: '1px solid #FFD700', borderRadius: 999,
            color: '#FFD700', fontSize: 12.5, fontWeight: 600, padding: '7px 14px',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            boxShadow: '0 2px 12px rgba(255,215,0,0.2)',
          }}>💬 Replays</button>
        </div>
      )}

      {/* Admin panels */}
      {isAdminMode && showStats   && <StatsPanel   onClose={() => setShowStats(false)} />}
      {isAdminMode && showReplays && <ReplaysPanel onClose={() => setShowReplays(false)} />}

      {/* Admin mode banner */}
      {isAdmin && isAdminMode && (
        <div style={{
          background: 'rgba(82,224,156,0.08)', borderTop: '1px solid rgba(82,224,156,0.25)',
          padding: '8px 24px', textAlign: 'center',
          fontSize: 12.5, fontWeight: 600, color: '#52E09C', letterSpacing: '0.02em',
          fontFamily: "'Inter', sans-serif",
        }}>
          👑 Admin Mode Active — Welcome, Daniel
        </div>
      )}

      {/* Admin learning panel */}
      {isAdmin && <AdminPanel />}

      {/* "Conversation saved" toast */}
      {savedPing && (
        <div className="k-toast">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Conversation saved
        </div>
      )}

      {/* PWA install banner — landing page only, 30 s after beforeinstallprompt */}
      {showInstallBanner && view === 'landing' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '14px 20px', display: 'flex', alignItems: 'center',
          gap: 12, flexWrap: 'wrap',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
          fontFamily: "'Inter', sans-serif",
          animation: 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--text-mid)', minWidth: 200 }}>
            📱 Add Koda to your home screen for instant access
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={async () => {
                if (installPromptRef.current) {
                  installPromptRef.current.prompt();
                  const { outcome } = await installPromptRef.current.userChoice;
                  installPromptRef.current = null;
                  if (outcome === 'accepted') {
                    try { localStorage.setItem('koda_install_dismissed', 'true'); } catch {}
                  }
                }
                setShowInstallBanner(false);
              }}
              style={{
                padding: '9px 18px', borderRadius: 999, border: 'none',
                background: 'var(--accent)', color: 'var(--send-text)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Add to Home Screen
            </button>
            <button
              onClick={() => {
                setShowInstallBanner(false);
                try { localStorage.setItem('koda_install_dismissed', 'true'); } catch {}
              }}
              style={{
                padding: '9px 16px', borderRadius: 999,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
    <style>{CSS}</style>
    <Routes>
      <Route path="/guides/reset-apple-id-password"    element={<GuidePage slug="reset-apple-id-password" />} />
      <Route path="/guides/cancel-iphone-subscription" element={<GuidePage slug="cancel-iphone-subscription" />} />
      <Route path="/guides/transfer-iphone-photos"     element={<GuidePage slug="transfer-iphone-photos" />} />
      <Route path="/guides/clear-iphone-storage"       element={<GuidePage slug="clear-iphone-storage" />} />
      <Route path="/guides/connect-bluetooth-headphones" element={<GuidePage slug="connect-bluetooth-headphones" />} />
      <Route path="/guides/share-wifi-password"        element={<GuidePage slug="share-wifi-password" />} />
      <Route path="/guides/stop-spam-calls"            element={<GuidePage slug="stop-spam-calls" />} />
      <Route path="/guides/update-windows"             element={<GuidePage slug="update-windows" />} />
      <Route path="/guides/fix-phone-battery-drain"    element={<GuidePage slug="fix-phone-battery-drain" />} />
      <Route path="/guides/set-up-new-iphone"          element={<GuidePage slug="set-up-new-iphone" />} />
      <Route path="/guides/how-to-screenshot"           element={<GuidePage slug="how-to-screenshot" />} />
      <Route path="/guides/how-to-clear-cache"          element={<GuidePage slug="how-to-clear-cache" />} />
      <Route path="/guides/how-to-update-iphone"        element={<GuidePage slug="how-to-update-iphone" />} />
      <Route path="/guides/how-to-factory-reset-android" element={<GuidePage slug="how-to-factory-reset-android" />} />
      <Route path="/guides/how-to-factory-reset-iphone" element={<GuidePage slug="how-to-factory-reset-iphone" />} />
      <Route path="/guides/how-to-download-apps"        element={<GuidePage slug="how-to-download-apps" />} />
      <Route path="/guides/how-to-use-airdrop"          element={<GuidePage slug="how-to-use-airdrop" />} />
      <Route path="/guides/how-to-change-wifi-password" element={<GuidePage slug="how-to-change-wifi-password" />} />
      <Route path="/guides/how-to-record-screen"        element={<GuidePage slug="how-to-record-screen" />} />
      <Route path="/guides/how-to-find-mac-address"     element={<GuidePage slug="how-to-find-mac-address" />} />
      <Route path="/guides/how-to-turn-off-location"    element={<GuidePage slug="how-to-turn-off-location" />} />
      <Route path="/guides/how-to-backup-iphone"        element={<GuidePage slug="how-to-backup-iphone" />} />
      <Route path="/guides/how-to-recover-deleted-photos" element={<GuidePage slug="how-to-recover-deleted-photos" />} />
      <Route path="/guides/how-to-reset-network-settings" element={<GuidePage slug="how-to-reset-network-settings" />} />
      <Route path="/guides/how-to-use-google-maps-offline" element={<GuidePage slug="how-to-use-google-maps-offline" />} />
      <Route path="/guides/how-to-block-a-number"       element={<GuidePage slug="how-to-block-a-number" />} />
      <Route path="/guides/how-to-set-up-two-factor-authentication" element={<GuidePage slug="how-to-set-up-two-factor-authentication" />} />
      <Route path="/guides/how-to-fix-frozen-phone"     element={<GuidePage slug="how-to-fix-frozen-phone" />} />
      <Route path="/guides/how-to-manage-notifications" element={<GuidePage slug="how-to-manage-notifications" />} />
      <Route path="/guides/how-to-use-hotspot"          element={<GuidePage slug="how-to-use-hotspot" />} />
      <Route path="*" element={chatApp} />
    </Routes>
    </>
  );
}
