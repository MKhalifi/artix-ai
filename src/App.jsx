import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Send, 
  Terminal, 
  Zap, 
  Activity, 
  Shield, 
  Code, 
  MessageSquare,
  Settings,
  Maximize2,
  Minimize2,
  Plus,
  FileText,
  X,
  Save,
  Copy,
  Layout,
  Clock,
  Trash2,
  ChevronRight
} from 'lucide-react';

/**
 * ARTIX-AI v4.0: "Obsidian" UI Overhaul
 * * DESIGN FIXES:
 * - Removed static line numbers (cleaner editor)
 * - Floating Input Bar with blur effects
 * - High-fidelity glassmorphism headers
 * - Refined message bubbles and spacing
 * - Better mobile responsiveness
 */

// --- CORE CONFIGURATION ---
const APP_NAME = "ARTIX-AI";
const VERSION = "4.0.0-Obsidian";

// Hidden protocol instruction
const CANVAS_PROTOCOL = `
[PROTOCOL OVERRIDE: CANVAS ENGINE]
If the user asks for code, a document, or a substantial text artifact, you MUST output it in the following format to trigger the visual canvas:

:::artifact:{filename}:{language}
{content}
:::

Do not wrap the content in markdown code blocks inside the artifact tags. Raw text only.
Keep the conversational part of your response outside these tags.
`;

const SYSTEM_PROMPT_BASE = `You are ARTIX-AI, a high-performance artificial intelligence. 
Your traits are:
1. PRECISION: Answer with extreme accuracy.
2. IDENTITY: You are ARTIX. Not Google.
3. CAPABILITY: Full coding and reasoning.
4. AESTHETIC: Hacker/Cyberpunk efficiency.
${CANVAS_PROTOCOL}`;

const SYSTEM_PROMPT_DEEP_THINK = `
[MODE: DEEP THINK]
1. Deconstruct request.
2. Plan execution.
3. Audit logic.
4. Final Output.
`;

// --- MOCK API HANDLER ---
const generateResponse = async (history, userInput, isDeepThink) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  const systemInstruction = isDeepThink 
    ? SYSTEM_PROMPT_BASE + "\n" + SYSTEM_PROMPT_DEEP_THINK 
    : SYSTEM_PROMPT_BASE;

  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  contents.push({ role: 'user', parts: [{ text: userInput }] });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: isDeepThink ? 0.6 : 0.85,
            maxOutputTokens: 8192,
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "System Warning: No coherence detected.";

  } catch (error) {
    console.error("Core Failure:", error);
    return `[SYSTEM ERROR]: Connection to Neural Core failed. ${error.message}`;
  }
};

// --- HELPER COMPONENTS ---

const Typewriter = ({ text, speed = 2, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const index = useRef(0);

  useEffect(() => {
    setDisplayedText('');
    index.current = 0;
    const timer = setInterval(() => {
      if (index.current < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index.current));
        index.current++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  const formatText = (input) => {
    const parts = input.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const content = part.replace(/```.*\n?/, '').replace(/```$/, '');
        return (
          <div key={i} className="my-4 rounded-lg bg-black/40 border border-emerald-500/10 overflow-hidden font-mono text-xs sm:text-sm shadow-inner">
             <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
               <span className="text-xs text-emerald-500/50 font-medium tracking-wider">CODE_BLOCK</span>
               <div className="flex space-x-1.5">
                 <div className="w-2 h-2 rounded-full bg-white/10"></div>
                 <div className="w-2 h-2 rounded-full bg-white/10"></div>
               </div>
             </div>
            <pre className="p-4 overflow-x-auto text-emerald-100/90 custom-scrollbar"><code>{content}</code></pre>
          </div>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return <div>{formatText(displayedText)}</div>;
};

// --- MAIN APPLICATION ---

export default function ArtixClone() {
  // State
  const [sessions, setSessions] = useState([
    { id: 'init', title: 'System Initialization', messages: [{ role: 'system', content: `ARTIX-AI v${VERSION} online. Awaiting input.` }], date: new Date() }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('init');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  
  // Canvas State
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasContent, setCanvasContent] = useState({ title: 'untitled.txt', language: 'text', content: '' });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages, loading]);

  // --- LOGIC ---

  const createSession = () => {
    const newId = `sess_${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'New Protocol',
      messages: [{ role: 'system', content: `ARTIX-AI v${VERSION} // New Thread Started.` }],
      date: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
    setCanvasOpen(false);
    setCanvasContent({ title: 'untitled.txt', language: 'text', content: '' });
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    if (sessions.length === 1) return; 
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) setActiveSessionId(newSessions[0].id);
  };

  const parseArtifacts = (text) => {
    const regex = /:::artifact:(.*?):(.*?)\n([\s\S]*?):::/;
    const match = text.match(regex);
    if (match) {
      const [fullMatch, filename, lang, content] = match;
      setCanvasContent({ title: filename.trim(), language: lang.trim(), content: content.trim() });
      setCanvasOpen(true);
      return text.replace(fullMatch, `\n> [SYSTEM]: Artifact generated. See Canvas panel (${filename.trim()}).\n`);
    }
    return text;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const currentInput = input;
    setInput('');
    setLoading(true);

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const isFirst = s.messages.length <= 1;
        const newTitle = isFirst ? (currentInput.length > 25 ? currentInput.slice(0, 25) + '...' : currentInput) : s.title;
        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, { role: 'user', content: currentInput }]
        };
      }
      return s;
    }));

    const history = activeSession.messages.filter(m => m.role !== 'system');
    let rawResponse = await generateResponse(history, currentInput, deepThink);
    const processedResponse = parseArtifacts(rawResponse);

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: [...s.messages, { role: 'model', content: processedResponse }] } 
        : s
    ));

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- RENDER ---

  return (
    <div className="flex h-screen bg-black text-emerald-50 font-sans overflow-hidden selection:bg-emerald-500/30">
      
      {/* 1. SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0'} flex-shrink-0 transition-all duration-500 ease-in-out border-r border-white/5 bg-[#030303] flex flex-col relative overflow-hidden`}>
        
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 bg-gradient-to-r from-[#0a0a0a] to-transparent">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20"></div>
              <div className="relative w-8 h-8 bg-emerald-950/30 rounded-lg border border-emerald-500/30 flex items-center justify-center">
                <Cpu size={16} className="text-emerald-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white">ARTIX<span className="text-emerald-500">AI</span></span>
              <span className="text-[9px] text-emerald-500/50 font-mono uppercase tracking-[0.2em]">Neural Core</span>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <button 
            onClick={createSession}
            className="w-full mb-6 flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 p-3 rounded-lg transition-all duration-200 group"
          >
            <Plus size={14} className="group-hover:scale-110 transition-transform text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wider">New Protocol</span>
          </button>

          <div className="space-y-1">
            <h3 className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest px-3 mb-2">Active Sessions</h3>
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full relative group cursor-pointer p-3 rounded-lg flex items-center justify-between transition-all duration-200 ${
                  activeSessionId === session.id 
                    ? 'bg-emerald-500/5 border border-emerald-500/20' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                {activeSessionId === session.id && (
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-emerald-500 rounded-r-full box-shadow-glow"></div>
                )}
                
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare size={14} className={activeSessionId === session.id ? "text-emerald-400" : "text-zinc-600"} />
                  <div className="flex flex-col overflow-hidden">
                    <span className={`text-xs truncate w-36 font-medium ${activeSessionId === session.id ? "text-emerald-100" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                      {session.title}
                    </span>
                    <span className="text-[9px] text-zinc-700">{session.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                {sessions.length > 1 && (
                  <button 
                    onClick={(e) => deleteSession(e, session.id)} 
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-all text-zinc-600"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#050505]">
           <button 
            onClick={() => setDeepThink(!deepThink)}
            className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between group ${
              deepThink 
                ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                : 'bg-transparent border-white/5 hover:border-white/10'
            }`}
           >
             <div className="flex items-center space-x-3">
               <div className={`p-1.5 rounded ${deepThink ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Zap size={14} className={deepThink ? "fill-current" : ""} />
               </div>
               <div className="flex flex-col items-start">
                 <span className={`text-xs font-medium ${deepThink ? "text-emerald-100" : "text-zinc-500"}`}>Deep Think</span>
                 <span className="text-[9px] text-zinc-600">{deepThink ? "Reasoning: MAX" : "Reasoning: STD"}</span>
               </div>
             </div>
             <div className={`w-1.5 h-1.5 rounded-full transition-all ${deepThink ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-800"}`} />
           </button>
        </div>
      </div>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-black to-black">
        
        {/* Header */}
        <header className="h-16 absolute top-0 left-0 right-0 border-b border-white/5 flex items-center justify-between px-6 z-20 backdrop-blur-md bg-black/50">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors">
              {sidebarOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex flex-col">
               <span className="text-xs font-medium text-zinc-200 tracking-wide">{activeSession.title}</span>
               <div className="flex items-center space-x-2">
                 <span className="text-[10px] text-emerald-500/60 flex items-center gap-1">
                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                   ONLINE
                 </span>
               </div>
            </div>
          </div>
          
          <button 
            onClick={() => setCanvasOpen(!canvasOpen)}
            className={`group flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
              canvasOpen 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
            }`}
          >
            <Layout size={14} className={canvasOpen ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400 transition-colors"} />
            <span>Canvas Engine</span>
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pt-20 pb-32 px-4 sm:px-8 md:px-16 space-y-8 custom-scrollbar">
          {activeSession.messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[90%] lg:max-w-3xl flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-1 shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 border border-white/5' 
                    : 'bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/20'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="w-3 h-3 bg-zinc-400 rounded-sm" /> 
                  ) : (
                    <Terminal size={14} className="text-emerald-400" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`relative rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200 ${
                  msg.role === 'user' 
                    ? 'bg-zinc-900/80 text-zinc-100 border border-white/5 backdrop-blur-sm' 
                    : 'bg-white/[0.02] text-zinc-200 border border-white/5 hover:bg-white/[0.04]'
                }`}>
                  {msg.role === 'system' ? (
                     <div className="font-mono text-[10px] text-emerald-500/50 flex items-center gap-2 select-none">
                       <Activity size={10} />
                       <span>SYSTEM_LOG: {msg.content}</span>
                     </div>
                  ) : (
                    <div className="text-[13px] sm:text-[14px] leading-7 font-light tracking-wide">
                       {msg.role === 'model' ? <Typewriter text={msg.content} speed={1} /> : <div className="whitespace-pre-wrap">{msg.content}</div>}
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start pl-16">
               <div className="flex items-center space-x-1.5 h-8 px-4 rounded-full bg-white/5 border border-white/5 w-fit">
                  <div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-pulse delay-150"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-pulse delay-300"></div>
                  <span className="ml-2 text-[10px] text-emerald-500/50 font-mono uppercase tracking-widest">Processing</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Input */}
        <div className="absolute bottom-6 left-0 right-0 px-4 z-30 pointer-events-none flex justify-center">
          <div className="w-full max-w-3xl pointer-events-auto relative group">
            
            {/* Glow Effect behind input */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
            
            <div className="relative flex items-end bg-[#0c0c0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-white/20 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter directive..."
                className="w-full bg-transparent border-none text-sm text-zinc-100 placeholder-zinc-600 p-4 pl-5 pr-14 focus:ring-0 resize-none h-auto min-h-[56px] max-h-48 custom-scrollbar leading-relaxed"
                rows={1}
              />
              
              <div className="absolute right-2 bottom-2">
                <button 
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                    input.trim() && !loading 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 hover:scale-105 active:scale-95' 
                      : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} className={input.trim() && !loading ? "ml-0.5" : ""} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. CANVAS ENGINE (Right Panel) */}
      <div className={`${canvasOpen ? 'w-[500px] xl:w-[650px] translate-x-0 opacity-100' : 'w-0 translate-x-20 opacity-0'} hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] border-l border-white/5 bg-[#080808] relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]`}>
        
        {/* Canvas Header */}
        <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-5 bg-[#080808]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-1.5 bg-emerald-900/20 rounded border border-emerald-500/20">
               <FileText size={14} className="text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-zinc-200 truncate max-w-[200px]">{canvasContent.title}</span>
              <span className="text-[9px] text-zinc-600 uppercase font-mono tracking-wider">{canvasContent.language}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
             <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors" title="Save">
               <Save size={16} />
             </button>
             <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors" title="Copy">
               <Copy size={16} />
             </button>
             <button 
              onClick={() => setCanvasOpen(false)}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
             >
               <X size={16} />
             </button>
          </div>
        </div>

        {/* Canvas Editor Area */}
        <div className="flex-1 relative bg-[#050505] overflow-hidden group">
           <textarea
            value={canvasContent.content}
            onChange={(e) => setCanvasContent({...canvasContent, content: e.target.value})}
            className="w-full h-full bg-transparent text-zinc-300 font-mono text-xs sm:text-sm leading-relaxed p-6 resize-none focus:outline-none selection:bg-emerald-500/20 custom-scrollbar"
            spellCheck="false"
           />
           
           {/* Empty State */}
           {!canvasContent.content && (
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                  <Layout size={32} className="text-zinc-700" />
               </div>
               <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Canvas Empty</span>
               <span className="text-[10px] text-zinc-700 mt-2 font-mono">Waiting for artifact generation...</span>
             </div>
           )}
        </div>

        {/* Canvas Footer */}
        <div className="h-8 border-t border-white/5 bg-[#080808] flex items-center justify-between px-4 select-none">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
              <span className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-wider">Live</span>
            </div>
            <span className="text-[10px] text-zinc-700">UTF-8</span>
          </div>
          <span className="text-[10px] text-zinc-600 font-mono">{canvasContent.content.length} chars</span>
        </div>
      </div>

    </div>
  );
}