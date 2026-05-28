import { useState, useRef, useEffect } from 'react';

const API_KEY = import.meta.env.VITE_API_KEY;

const SYSTEM_PROMPT = `MOST IMPORTANT RULE: You must NEVER assume what device or platform someone is using. Even if they say 'an app crashed' or 'my screen is frozen' — these could happen on ANY device. Always ask what device they are on before giving ANY advice whatsoever. No exceptions.

You are Koda, a warm and patient tech support assistant for everyday people — many of whom are beginners. Your job is to actually solve their problem, not just point them in the right direction.

RULES YOU NEVER BREAK:
1. ALWAYS ask what device they are using before giving any steps (iPhone, Android, Windows PC, Mac). Never assume.
2. NEVER say things like "go to settings" without explaining exactly how to get there step by step.
3. Give instructions specific to their exact device and operating system.
4. Write every step as if the person has never done it before. Be specific: "Tap the gray Settings app on your home screen" not "go to Settings."
5. Ask ONE question at a time. Never overwhelm them.
6. After giving steps, always ask "Were you able to find that okay?" or "Did that work for you?"
7. If something doesn't work, stay calm and try a different approach.
8. Never use technical jargon without explaining it in plain English immediately after.
9. Be warm and encouraging. Tech problems are frustrating. Acknowledge that.
10. If you need to know their device to help them, ask that first before anything else.

TONE: Like a calm, brilliant friend sitting next to them. Patient. Never rushed. Never condescending.`;

const PROBLEMS = [
  { id: 1, icon: '📶', label: 'WiFi & Connectivity', prompt: "My WiFi or internet isn't working." },
  { id: 2, icon: '🐢', label: 'Slow Computer',       prompt: "My device is running really slow." },
  { id: 3, icon: '🔐', label: 'Login & Passwords',   prompt: "I'm locked out of an account or having password trouble." },
  { id: 4, icon: '🖨️', label: 'Printer Problems',    prompt: "My printer won't work." },
  { id: 5, icon: '💥', label: 'App Crashing',        prompt: "An app keeps crashing on me." },
  { id: 6, icon: '🦠', label: 'Virus & Malware',     prompt: "I'm worried my device might have a virus or something suspicious." },
  { id: 7, icon: '📧', label: 'Email Issues',        prompt: "I'm having trouble with my email." },
  { id: 8, icon: '🖥️', label: 'Screen & Display',   prompt: "My screen is having problems." },
];

/* ── CSS ────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #0F1117;
  color: #F0F0F0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#root { height: 100%; display: flex; flex-direction: column; }

/* --- Chip --- */
.k-chip {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 16px;
  border: 1px solid #2A2D3A; background: #1A1D27;
  cursor: pointer; text-align: left; width: 100%;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  font-family: 'Inter', sans-serif;
}
.k-chip:hover {
  transform: translateY(-3px);
  border-color: #52E09C;
  background: rgba(82,224,156,0.05);
  box-shadow: 0 0 20px rgba(82,224,156,0.12), 0 8px 24px rgba(0,0,0,0.4);
}
.k-chip:active { transform: translateY(-1px); transition-duration: 0.06s; }

/* --- Textarea --- */
.k-input {
  flex: 1; border: none; outline: none; resize: none;
  font-family: 'Inter', sans-serif; font-size: 15px;
  line-height: 1.55; color: #F0F0F0; background: transparent;
  max-height: 180px; display: block;
}
.k-input::placeholder { color: #4A4D5E; }

/* --- Input wrapper focus glow --- */
.k-input-bar {
  display: flex; align-items: flex-end; gap: 10;
  background: #1A1D27; border-radius: 999px;
  border: 1px solid #2A2D3A;
  padding: 12px 12px 12px 20px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.k-input-bar:focus-within {
  border-color: #52E09C;
  box-shadow: 0 0 0 3px rgba(82,224,156,0.12);
}

/* --- Send button --- */
.k-send {
  width: 38px; height: 38px; border-radius: 50%; border: none;
  background: #52E09C; color: #0F1117; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.14s, transform 0.12s, box-shadow 0.14s;
  box-shadow: 0 0 12px rgba(82,224,156,0.35);
  font-weight: 700;
}
.k-send:hover { background: #6EEAAA; box-shadow: 0 0 20px rgba(82,224,156,0.5); transform: scale(1.06); }
.k-send:active { transform: scale(0.96); transition-duration: 0.06s; }

/* --- Quick reply chips --- */
.k-qr {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 0 24px 12px; max-width: 760px; margin: 0 auto; width: 100%;
}
.k-qr-chip {
  padding: 8px 18px; border-radius: 999px;
  border: 1px solid #52E09C; background: transparent;
  color: #52E09C; font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 500; cursor: pointer;
  transition: background 0.14s, box-shadow 0.14s, transform 0.1s;
  line-height: 1;
}
.k-qr-chip:hover {
  background: rgba(82,224,156,0.1);
  box-shadow: 0 0 12px rgba(82,224,156,0.2);
  transform: translateY(-1px);
}
.k-qr-chip:active, .k-qr-chip.picked {
  background: #52E09C; color: #0F1117; transform: translateY(0);
}

/* --- New chat button --- */
.k-new-chat {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  border: 1px solid #2A2D3A; background: #1A1D27;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  color: #8B8FA8; cursor: pointer;
  transition: background 0.13s, border-color 0.13s, color 0.13s;
}
.k-new-chat:hover { background: #22263A; border-color: #3A3D4E; color: #F0F0F0; }

/* --- Messages scroll area --- */
.k-messages {
  flex: 1; overflow-y: auto;
  padding: 32px 0 24px;
  display: flex; flex-direction: column; gap: 20px;
}
.k-messages::-webkit-scrollbar { width: 4px; }
.k-messages::-webkit-scrollbar-track { background: transparent; }
.k-messages::-webkit-scrollbar-thumb { background: #2A2D3A; border-radius: 4px; }
.k-messages::-webkit-scrollbar-thumb:hover { background: #3A3D4E; }

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
  background: #52E09C; display: inline-block;
  animation: dotPulse 1.4s ease-in-out infinite;
}
.k-dot:nth-child(2) { animation-delay: 0.18s; }
.k-dot:nth-child(3) { animation-delay: 0.36s; }

@keyframes onlinePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(82,224,156,0.6); }
  50%       { box-shadow: 0 0 0 4px rgba(82,224,156,0); }
}
.k-online-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #52E09C;
  animation: onlinePulse 2s ease-in-out infinite; flex-shrink: 0;
}

/* --- Markdown inside AI bubbles --- */
.md strong { font-weight: 600; color: #F0F0F0; }
.md em     { font-style: italic; color: #C0C3D4; }
.md code {
  background: #0F1117; color: #52E09C;
  padding: 2px 7px; border-radius: 5px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.86em; border: 1px solid #2A2D3A; white-space: nowrap;
}
.md ul  { padding-left: 20px; margin: 6px 0; }
.md ol  { padding-left: 20px; margin: 6px 0; }
.md li  { margin-bottom: 5px; line-height: 1.65; color: #D8DBF0; }
.md p   { margin: 0 0 8px; color: #D8DBF0; }
.md p:last-child { margin: 0; }
.md .hd { font-weight: 700; margin: 10px 0 5px; color: #F0F0F0; }
.md .hd:first-child { margin-top: 0; }

/* --- Responsive --- */
@media (max-width: 600px) {
  .land-chips     { grid-template-columns: 1fr 1fr !important; }
  .land-title     { font-size: 38px !important; letter-spacing: -1px !important; }
  .land-title-2   { font-size: 38px !important; }
  .land-sub       { font-size: 15px !important; }
  .land-wrap      { padding: 32px 18px 40px !important; }
  .k-messages     { padding: 20px 0 16px !important; }
  .msgs-inner     { padding: 0 16px !important; }
  .chat-input-row { padding: 10px 16px 20px !important; }
}
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

function renderMarkdown(text) {
  const lines = text.split('\n');
  const nodes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,3} /.test(line)) {
      nodes.push(
        <div key={i} className="hd">{renderInline(line.replace(/^#{1,3} /, ''), `h${i}`)}</div>
      );
      i++;
    } else if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2), `u${i}`)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`}>{items}</ul>);
    } else if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''), `o${i}`)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol${i}`}>{items}</ol>);
    } else if (line.trim() === '') {
      i++;
    } else {
      nodes.push(<p key={i}>{renderInline(line, `p${i}`)}</p>);
      i++;
    }
  }
  return <div className="md">{nodes}</div>;
}

/* ── AI-generated quick reply buttons ──────────────────────────────── */

/* ── Quick reply chips ──────────────────────────────────────────────── */

function QuickReplies({ options, onSelect }) {
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
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ── Components ─────────────────────────────────────────────────────── */

function KodaLogo({ size = 32, r = 10 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(135deg, #52E09C 0%, #2DB87A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#0A1A12', fontWeight: 800, fontFamily: "'Inter', sans-serif",
      fontSize: Math.round(size * 0.46), letterSpacing: '-0.5px',
      userSelect: 'none', boxShadow: '0 0 12px rgba(82,224,156,0.3)',
    }}>K</div>
  );
}

function OnlineIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="k-online-dot" />
      <span style={{ fontSize: 12.5, fontWeight: 500, color: '#52E09C', letterSpacing: '0.02em' }}>
        Online
      </span>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="k-msg-in" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
      <KodaLogo size={26} r={8} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: '#1A1D27', border: '1px solid #2A2D3A',
        padding: '10px 14px', borderRadius: '5px 16px 16px 16px',
      }}>
        <span style={{ fontSize: 13, color: '#8B8FA8', marginRight: 6, fontStyle: 'italic' }}>
          Koda is thinking
        </span>
        <span className="k-dot" />
        <span className="k-dot" />
        <span className="k-dot" />
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className="k-msg-in" style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end', gap: 9,
    }}>
      {!isUser && <KodaLogo size={26} r={8} />}
      <div style={{
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 5px 18px' : '5px 18px 18px 18px',
        background: isUser ? '#52E09C' : '#1A1D27',
        border: isUser ? 'none' : '1px solid #2A2D3A',
        color: isUser ? '#0A1A12' : '#D8DBF0',
        fontSize: 15, lineHeight: 1.7,
        boxShadow: isUser
          ? '0 0 20px rgba(82,224,156,0.2), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.25)',
        wordBreak: 'break-word', fontWeight: isUser ? 500 : 400,
      }}>
        {isUser ? msg.content : renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

/* ── Landing ────────────────────────────────────────────────────────── */

function Landing({ onChipClick, onSubmit }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);

  const go = () => { if (val.trim()) onSubmit(val.trim()); };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };

  return (
    <div className="land-wrap" style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px 48px', overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 680 }}>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px 6px 10px', borderRadius: 999,
            background: 'rgba(82,224,156,0.08)',
            border: '1px solid rgba(82,224,156,0.25)',
            color: '#52E09C', fontSize: 12.5, fontWeight: 500, letterSpacing: '0.03em',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#52E09C', display: 'inline-block',
              boxShadow: '0 0 8px rgba(82,224,156,0.8)',
            }} />
            AI Tech Support — Always On
          </span>
        </div>

        {/* Headline */}
        <h1 className="land-title" style={{
          fontSize: 64, fontWeight: 800, color: '#F0F0F0', textAlign: 'center',
          letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 4,
        }}>
          Fix any tech problem.
        </h1>
        <h1 className="land-title-2" style={{
          fontSize: 64, fontWeight: 800, color: '#52E09C', textAlign: 'center',
          letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 22,
          textShadow: '0 0 40px rgba(82,224,156,0.35)',
        }}>
          In minutes.
        </h1>

        {/* Subline */}
        <p className="land-sub" style={{
          fontSize: 17, color: '#8B8FA8', textAlign: 'center',
          lineHeight: 1.7, fontWeight: 400, marginBottom: 48,
        }}>
          Describe what's wrong. Koda figures it out and guides you<br />through the fix, step by step.
        </p>

        {/* Chips */}
        <div className="land-chips" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginBottom: 24,
        }}>
          {PROBLEMS.map(p => (
            <button key={p.id} className="k-chip" onClick={() => onChipClick(p)}>
              <span style={{
                fontSize: 16, lineHeight: 1, padding: '5px 7px',
                background: '#0F1117', borderRadius: 8, flexShrink: 0,
              }}>
                {p.icon}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: '#E0E3F0', flex: 1, letterSpacing: '-0.1px' }}>
                {p.label}
              </span>
              <span style={{ color: '#3A3D4E', fontSize: 14, flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="k-input-bar" style={{ marginBottom: 14 }}>
          <textarea
            ref={ref}
            className="k-input"
            rows={1}
            placeholder="What's going on with your device?"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={onKey}
          />
          <button className="k-send" onClick={go}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 12.5, color: '#3A3D4E', letterSpacing: '0.02em' }}>
          No account needed · Instant answers · Completely free
        </p>

      </div>
    </div>
  );
}

/* ── Chat ───────────────────────────────────────────────────────────── */

function Chat({ messages, loading, onSend, quickReplies }) {
  const [val, setVal] = useState('');
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  const go = () => {
    if (!val.trim() || loading) return;
    onSend(val.trim());
    setVal('');
  };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Messages */}
      <div className="k-messages" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="msgs-inner" style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {loading && <ThinkingIndicator />}
          <div ref={endRef} />
        </div>
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && (
        <div style={{ background: '#0F1117', paddingTop: 12, borderTop: '1px solid #2A2D3A' }}>
          <QuickReplies
            key={messages.length}
            options={quickReplies}
            onSelect={(text) => { onSend(text); }}
          />
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-row" style={{
        padding: quickReplies.length > 0 ? '4px 24px 28px' : '14px 24px 28px',
        background: '#0F1117',
        borderTop: quickReplies.length > 0 ? 'none' : '1px solid #2A2D3A',
      }}>
        <div className="k-input-bar" style={{ maxWidth: 760, margin: '0 auto', borderRadius: 16 }}>
          <textarea
            ref={inputRef}
            className="k-input"
            rows={1}
            placeholder="Reply to Koda…"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={onKey}
            disabled={loading}
          />
          <button className="k-send" onClick={go}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}

/* ── App root ───────────────────────────────────────────────────────── */

export default function App() {
  const [view,         setView]         = useState('landing');
  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);

  const generateButtons = async (kodaMessage) => {
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
          system: 'You output ONLY a JSON object — no explanation, no markdown, no extra text. Format: {"buttons":["label1","label2"]}. Rules: 2–4 buttons, each label 1–5 words, match the question asked. If no buttons make sense return {"buttons":[]}.',
          messages: [{ role: 'user', content: `A tech support assistant just sent this message to a user:\n\n"${kodaMessage}"\n\nOutput the JSON buttons object now.` }],
        }),
      });
      const data = await res.json();
      const raw  = data.content?.[0]?.text ?? '';
      const match = raw.match(/\{[\s\S]*"buttons"[\s\S]*\}/);
      const json  = match ? JSON.parse(match[0]) : { buttons: [] };
      setQuickReplies(Array.isArray(json.buttons) ? json.buttons.slice(0, 4) : []);
    } catch {
      setQuickReplies([]);
    }
  };

  const sendMessage = async (content, history = messages) => {
    const updated = [...history, { role: 'user', content }];
    setMessages(updated);
    setQuickReplies([]);
    setView('chat');
    setLoading(true);
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
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: updated.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const data  = await res.json();
      const reply = data.content?.[0]?.text ?? "I didn't catch a response — try again.";
      setMessages([...updated, { role: 'assistant', content: reply }]);
      generateButtons(reply);
    } catch (e) {
      setMessages([...updated, { role: 'assistant', content: `Something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const startChat = (text, fresh = false) => {
    const history = fresh ? [] : messages;
    if (fresh) { setMessages([]); setQuickReplies([]); }
    sendMessage(text, fresh ? [] : history);
  };

  const reset = () => { setView('landing'); setMessages([]); setQuickReplies([]); };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0F1117' }}>
      <style>{CSS}</style>

      {/* Header */}
      <header style={{
        background: '#0F1117',
        borderBottom: view === 'chat' ? '1px solid #2A2D3A' : 'none',
        padding: '0 28px', height: 62, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: Logo */}
        <button onClick={reset} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <KodaLogo size={32} r={10} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', letterSpacing: '-0.35px' }}>
            Koda
          </span>
        </button>

        {/* Right: Online + New chat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <OnlineIndicator />
          {view === 'chat' && (
            <button className="k-new-chat" onClick={reset}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
        {view === 'landing' ? (
          <Landing
            onChipClick={p  => startChat(p.prompt, true)}
            onSubmit={text  => startChat(text, true)}
          />
        ) : (
          <Chat
            messages={messages}
            loading={loading}
            onSend={text => sendMessage(text)}
            quickReplies={quickReplies}
          />
        )}
      </main>
    </div>
  );
}
