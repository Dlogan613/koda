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
  --input-bg:       #F3F1EC;
  --logo-g:         linear-gradient(135deg, #40916C 0%, #2D6A4F 100%);
  --logo-text:      #FFFFFF;
  --send-bg:        #2D6A4F;
  --send-text:      #FFFFFF;
  --shadow:         rgba(0,0,0,0.07);
  --shadow-sm:      rgba(0,0,0,0.04);
  --scrollbar:      #D4D0C8;
  --scrollbar-h:    #C0B8B0;
  --placeholder:    #A8A29E;
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
.k-msg-in, .k-dot, .k-online-dot, .k-qr, .k-qr-chip { transition: none !important; }

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
  padding: 4px 0 8px; width: 100%;
}
.k-qr-chip {
  padding: 8px 18px; border-radius: 999px;
  border: 1px solid var(--accent); background: var(--surface);
  color: var(--accent); font-family: 'Inter', sans-serif;
  font-size: 13.5px; font-weight: 500; cursor: pointer; line-height: 1;
}
.k-qr-chip:hover {
  background: var(--accent-glow);
  box-shadow: 0 0 12px var(--accent-glow);
  transform: translateY(-1px);
}
.k-qr-chip:active, .k-qr-chip.picked { background: var(--accent); color: var(--send-text); transform: translateY(0); }

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
      nodes.push(<div key={i} className="hd">{renderInline(line.replace(/^#{1,3} /, ''), `h${i}`)}</div>);
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

/* ── Button parsing ─────────────────────────────────────────────────── */

function parseButtons(text) {
  const t = text.toLowerCase();
  if (t.includes('what device') || t.includes('which device') || t.includes('device are you') || t.includes('device do you')) return ['iPhone', 'Android', 'Windows PC', 'Mac'];
  if (t.includes('which app') || t.includes('what app') || t.includes('app is')) return ['Safari/Browser', 'Email', 'Social Media', 'Other app'];
  if (t.includes('still') && (t.includes('working') || t.includes('fix') || t.includes('help'))) return ['Yes, fixed!', 'Still broken', 'Something changed'];
  if (t.includes('how long') || t.includes('when did') || t.includes('when did this')) return ['Just now', 'Few days ago', 'Longer'];
  if (t.includes('windows') && t.includes('mac')) return ['Windows PC', 'Mac'];
  if (t.includes('iphone') && t.includes('android')) return ['iPhone', 'Android', 'Windows PC', 'Mac'];
  if (t.includes('restart') || t.includes('restarted') || t.includes('tried')) return ['Yes I tried', 'Not yet', 'Tried, did not work'];
  if (t.includes('error') && t.includes('message')) return ['Yes, has error', 'No error message', 'Not sure'];
  if (t.includes('connected') || t.includes('connection')) return ['Yes connected', 'Not connected', 'Keeps dropping'];
  if (t.includes('update') || t.includes('updated')) return ['Yes updated', 'Not updated', 'Not sure'];
  if (t.includes('?')) return ['Yes', 'No', 'Not sure'];
  return ['Tell me more', 'Try something else', 'Start over'];
}

/* ── Quick replies ──────────────────────────────────────────────────── */

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
        <button key={opt} className={'k-qr-chip' + (picked === opt ? ' picked' : '')} onClick={() => pick(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ── Shared components ──────────────────────────────────────────────── */

function KodaLogo({ size = 32, r = 10 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: 'var(--logo-g)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--logo-text)', fontWeight: 800, fontFamily: "'Inter', sans-serif",
      fontSize: Math.round(size * 0.46), letterSpacing: '-0.5px',
      userSelect: 'none', boxShadow: '0 0 12px var(--accent-border)',
    }}>K</div>
  );
}

function OnlineIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="k-online-dot" />
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--accent)', letterSpacing: '0.02em' }}>
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

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className="k-msg-in" style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      alignItems: 'flex-end', gap: 9,
    }}>
      {!isUser && <KodaLogo size={26} r={8} />}
      <div style={{
        maxWidth: '75%', padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 5px 18px' : '5px 18px 18px 18px',
        background:   isUser ? 'var(--user-bg)'   : 'var(--koda-bg)',
        borderTop:    isUser ? 'none' : '1px solid var(--border)',
        borderRight:  isUser ? 'none' : '1px solid var(--border)',
        borderBottom: isUser ? 'none' : '1px solid var(--border)',
        borderLeft:   isUser ? 'none' : '3px solid var(--accent)',
        color:        isUser ? 'var(--user-text)' : 'var(--koda-text)',
        fontSize: 15, lineHeight: 1.7,
        boxShadow: isUser
          ? '0 0 20px var(--accent-glow), 0 4px 12px var(--shadow-sm)'
          : '0 2px 8px var(--shadow-sm)',
        wordBreak: 'break-word', fontWeight: isUser ? 500 : 400,
        textAlign: 'left',
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
  const go  = () => { if (val.trim()) onSubmit(val.trim()); };
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
            background: 'var(--accent-glow)', border: '1px solid var(--accent-border)',
            color: 'var(--accent)', fontSize: 12.5, fontWeight: 500, letterSpacing: '0.03em',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
              display: 'inline-block', boxShadow: '0 0 8px var(--accent-glow-lg)',
            }} />
            AI Tech Support — Always On
          </span>
        </div>

        {/* Headline with radial glow */}
        <div style={{
          position: 'relative', marginBottom: 22,
          background: 'radial-gradient(ellipse 60% 40% at 50% 40%, var(--accent-glow) 0%, transparent 70%)',
          paddingTop: 8, paddingBottom: 4,
        }}>
          <h1 className="land-title" style={{
            fontSize: 64, fontWeight: 800, color: 'var(--text)', textAlign: 'center',
            letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 4,
          }}>
            Fix any tech problem.
          </h1>
          <h1 className="land-title-2" style={{
            fontSize: 64, fontWeight: 800, color: 'var(--accent)', textAlign: 'center',
            letterSpacing: '-2px', lineHeight: 1.05,
            textShadow: '0 0 40px var(--accent-glow-lg)',
          }}>
            In minutes.
          </h1>
        </div>

        {/* Subline */}
        <p className="land-sub" style={{
          fontSize: 17, color: 'var(--text-muted)', textAlign: 'center',
          lineHeight: 1.7, fontWeight: 400, marginBottom: 48,
        }}>
          Describe what's wrong. Koda figures it out and guides you<br />through the fix, step by step.
        </p>

        {/* Chips */}
        <div className="land-chips" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
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

        {/* Input bar */}
        <div className="k-input-bar" style={{ marginBottom: 14, borderRadius: 16 }}>
          <textarea
            ref={ref} className="k-input" rows={1}
            placeholder="What's going on with your device?"
            value={val} onChange={e => setVal(e.target.value)} onKeyDown={onKey}
          />
          <button className="k-send" onClick={go}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-faint)', letterSpacing: '0.02em' }}>
          No account needed · Instant answers · Completely free
        </p>

      </div>
    </div>
  );
}

/* ── Chat ───────────────────────────────────────────────────────────── */

function Chat({ messages, loading, onSend }) {
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

  const lastIdx = messages.length - 1;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Messages */}
      <div className="k-messages" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="msgs-inner" style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => (
            <div key={i}>
              <MessageBubble msg={m} />
              {m.role === 'assistant' && m.quickReplies?.length > 0 && i === lastIdx && !loading && (
                <QuickReplies options={m.quickReplies} onSelect={onSend} />
              )}
            </div>
          ))}
          {loading && <ThinkingIndicator />}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="chat-input-row" style={{
        padding: '14px 24px 28px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}>
        <div className="k-input-bar" style={{ maxWidth: 760, margin: '0 auto', borderRadius: 16 }}>
          <textarea
            ref={inputRef} className="k-input" rows={1}
            placeholder="Reply to Koda…" value={val}
            onChange={e => setVal(e.target.value)} onKeyDown={onKey} disabled={loading}
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

  const [loading,   setLoading]   = useState(false);
  const [savedPing, setSavedPing] = useState(false);

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
    const updated = [...history, { role: 'user', content }];
    setMessages(updated);
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
      const data     = await res.json();
      const reply    = data.content?.[0]?.text ?? "I didn't catch a response — try again.";
      const withReply = [...updated, { role: 'assistant', content: reply, quickReplies: parseButtons(reply) }];
      setMessages(withReply);
    } catch (e) {
      setMessages([...updated, { role: 'assistant', content: `Something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const startChat = (text, fresh = false) => {
    const history = fresh ? [] : messages;
    if (fresh) { setMessages([]); }
    sendMessage(text, fresh ? [] : history);
  };

  const reset = () => {
    setView('landing');
    setMessages([]);
    try { localStorage.removeItem('koda-messages'); } catch {}
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{CSS}</style>

      {/* Header */}
      <header style={{
        background: 'var(--bg)',
        borderBottom: view === 'chat' ? '1px solid var(--border)' : 'none',
        padding: '0 24px', height: 62, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
          <KodaLogo size={32} r={10} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.35px' }}>Koda</span>
        </button>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <OnlineIndicator />

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
        {view === 'landing' ? (
          <Landing onChipClick={p => startChat(p.prompt, true)} onSubmit={text => startChat(text, true)} />
        ) : (
          <Chat messages={messages} loading={loading} onSend={text => sendMessage(text)} />
        )}
      </main>

      {/* "Conversation saved" toast */}
      {savedPing && (
        <div className="k-toast">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Conversation saved
        </div>
      )}
    </div>
  );
}
