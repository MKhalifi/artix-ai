import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Send, Terminal, Zap, Activity, Shield, Code, MessageSquare, 
  Settings, Maximize2, Minimize2, Plus, FileText, X, Save, Copy, 
  Layout, Clock, Trash2, ChevronRight, Image as ImageIcon, 
  Paperclip, Loader2, Download, Menu
} from 'lucide-react';

/**
 * ARTIX-AI v5.2: Polished Text & Logic
 * * FIXES:
 * - Markdown Parsing: Now converts **text** into Bold Emerald text.
 * - Logic Stability: Lowered temperature to 0.7 to reduce typos/hallucinations.
 * - Mobile & UI: Kept all previous responsive fixes.
 */

// --- CORE CONFIGURATION ---
const APP_NAME = "ARTIX-AI";
const VERSION = "5.2.0-Stable";

// --- PROTOCOLS ---
const CANVAS_PROTOCOL = `
[PROTOCOL: CANVAS]
If generating code or long text, use:
:::artifact:{filename}:{language}
{content}
:::
`;

const IMAGE_GEN_PROTOCOL = `
[PROTOCOL: IMAGE GENERATION]
If the user explicitly asks to generate/create/draw an image, you MUST output a generation token:
:::image_gen:{detailed_prompt}:::
Do not describe the image in text, just output the token.
`;

const SYSTEM_PROMPT_BASE = `You are ARTIX-AI, a high-performance artificial intelligence. 
Your traits: PRECISION, IDENTITY (ARTIX), CAPABILITY (Coding, Vision, Creation).
${CANVAS_PROTOCOL}
${IMAGE_GEN_PROTOCOL}`;

const SYSTEM_PROMPT_DEEP_THINK = `
[MODE: DEEP THINK]
1. Deconstruct request.
2. Plan execution.
3. Audit logic.
4. Final Output.
`;

// --- API HANDLERS ---

const generateResponse = async (history, userInput, attachment, isDeepThink) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
  
  const systemInstruction = isDeepThink 
    ? SYSTEM_PROMPT_BASE + "\n" + SYSTEM_PROMPT_DEEP_THINK 
    : SYSTEM_PROMPT_BASE;

  const contents = history.map(msg => {
    if (msg.image) return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] };
    return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] };
  });

  const currentParts = [{ text: userInput }];
  
  if (attachment) {
    currentParts.push({
      inlineData: {
        mimeType: attachment.type,
        data: attachment.data 
      }
    });
  }

  contents.push({ role: 'user', parts: currentParts });

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
            temperature: isDeepThink ? 0.6 : 0.7, // Lowered to 0.7 for better accuracy
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

const generateImage = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: { sampleCount: 1 }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error("API Error Details:", data.error);
      throw new Error(data.error.message || "API refused generation");
    }
    
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) throw new Error("No image data returned from API");
    
    return `data:image/png;base64,${base64Image}`;

  } catch (error) {
    console.error("Generative Engine Failure:", error);
    return null;
  }
};

// --- UI COMPONENTS ---

const Typewriter = ({ text, speed = 2, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const index = useRef(0);

  useEffect(() => {
    setDisplayedText('');
    index.current = 0;
    
    // Instant render for code protocols to avoid glitches
    if (text.includes(':::') || text.length < 50) {
        setDisplayedText(text);
        if(onComplete) onComplete();
        return;
    }

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
    // 1. Split by Code Blocks (```)
    const parts = input.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const content = part.replace(/```.*\n?/, '').replace(/```$/, '');
        return (
          <div key={i} className="my-4 rounded-lg bg-black/40 border border-emerald-500/10 overflow-hidden font-mono text-xs sm:text-sm shadow-inner">
             <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
               <span className="text-xs text-emerald-500/50 font-medium tracking-wider">CODE_BLOCK</span>
             </div>
            <pre className="p-4 overflow-x-auto text-emerald-100/90 custom-scrollbar"><code>{content}</code></pre>
          </div>
        );
      }

      // 2. Split by Bold Markers (**)
      // The regex matches **content** and captures the content
      const boldParts = part.split(/\*\*(.*?)\*\*/g);
      
      return (
        <span key={i} className="whitespace-pre-wrap">
          {boldParts.map((subPart, j) => {
            // Odd indices are the captured bold text
            if (j % 2 === 1) {
              return <strong key={j} className="text-emerald-400 font-bold tracking-wide">{subPart}</strong>;
            }
            return subPart;
          })}
        </span>
      );
    });
  };

  return <div>{formatText(displayedText)}</div>;
};

// --- MAIN APPLICATION ---

export default function ArtixClone() {
  // Session State
  const [sessions, setSessions] = useState([
    { id: 'init', title: 'System Initialization', messages: [{ role: 'system', content: `ARTIX-AI v${VERSION} online. Mobile Matrix Loaded.` }], date: new Date() }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('init');
  
  // Input State
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [attachment, setAttachment] = useState(null); 
  
  // Layout State
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasContent, setCanvasContent] = useState({ title: 'untitled.txt', language: 'text', content: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false); 

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Responsive Init
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1]; 
      setAttachment({
        type: file.type,
        data: base64Data,
        preview: e.target.result
      });
    };
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createSession = () => {
    const newId = `sess_${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'New Protocol',
      messages: [{ role: 'system', content: `ARTIX-AI v${VERSION} // New Thread.` }],
      date: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
    setCanvasOpen(false);
    setCanvasContent({ title: 'untitled.txt', language: 'text', content: '' });
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    if (sessions.length === 1) return; 
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) setActiveSessionId(newSessions[0].id);
  };

  const processResponse = async (text) => {
    const artifactRegex = /:::artifact:(.*?):(.*?)\n([\s\S]*?):::/;
    const artifactMatch = text.match(artifactRegex);
    
    if (artifactMatch) {
      const [fullMatch, filename, lang, content] = artifactMatch;
      setCanvasContent({ title: filename.trim(), language: lang.trim(), content: content.trim() });
      setCanvasOpen(true);
      text = text.replace(fullMatch, `\n> [SYSTEM]: Artifact generated. See Canvas panel (${filename.trim()}).\n`);
    }

    const imageRegex = /:::image_gen:(.*?):::/;
    const imageMatch = text.match(imageRegex);

    if (imageMatch) {
      const [fullMatch, prompt] = imageMatch;
      let cleanText = text.replace(fullMatch, "");
      try {
        const imageUrl = await generateImage(prompt);
        if (imageUrl) {
           return { 
             text: cleanText + `\n> [GEN_ENGINE]: Image generated successfully.`, 
             generatedImage: imageUrl 
           };
        } else {
           return { text: cleanText + `\n> [GEN_ENGINE]: Generation failed.` };
        }
      } catch (e) {
        return { text: cleanText + `\n> [GEN_ENGINE]: Generation Error.` };
      }
    }

    return { text: text };
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading) return;

    const currentInput = input;
    const currentAttachment = attachment;
    
    setInput('');
    clearAttachment();
    setLoading(true);

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const isFirst = s.messages.length <= 1;
        const newTitle = isFirst ? (currentInput.length > 20 ? currentInput.slice(0, 20) + '...' : currentInput || 'Image Analysis') : s.title;
        return {
          ...s,
          title: newTitle,
          messages: [...s.messages, { 
            role: 'user', 
            content: currentInput, 
            image: currentAttachment ? currentAttachment.preview : null 
          }]
        };
      }
      return s;
    }));

    const history = activeSession.messages.filter(m => m.role !== 'system');
    const rawResponse = await generateResponse(history, currentInput, currentAttachment, deepThink);
    const processedData = await processResponse(rawResponse);

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            messages: [...s.messages, { 
              role: 'model', 
              content: processedData.text,
              generatedImage: processedData.generatedImage 
            }] 
          } 
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages, loading]);

  // --- RENDER ---

  return (
    <div className="flex h-[100dvh] w-full bg-black text-emerald-50 font-sans overflow-hidden fixed inset-0 overscroll-none selection:bg-emerald-500/30">
      
      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed md:relative z-[90] h-full bg-[#030303] border-r border-white/5 flex flex-col transition-all duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'}
        pt-[env(safe-area-inset-top)]
      `}>
        <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-white/5 bg-gradient-to-r from-[#0a0a0a] to-transparent justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-emerald-950/30 rounded-lg border border-emerald-500/30 flex items-center justify-center">
              <Cpu size={16} className="text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white">ARTIX<span className="text-emerald-500">AI</span></span>
              <span className="text-[9px] text-emerald-500/50 font-mono uppercase tracking-[0.2em]">v5.2</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 p-2 cursor-pointer active:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <button onClick={createSession} className="w-full mb-6 flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 p-3 rounded-lg transition-all duration-200 group cursor-pointer active:scale-95">
            <Plus size={14} className="group-hover:scale-110 transition-transform text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wider">New Protocol</span>
          </button>
          <div className="space-y-1">
            <h3 className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest px-3 mb-2">Active Sessions</h3>
            {sessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }} 
                className={`w-full relative group cursor-pointer p-3 rounded-lg flex items-center justify-between transition-all duration-200 active:bg-white/10 ${activeSessionId === session.id ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'}`}
              >
                {activeSessionId === session.id && <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-emerald-500 rounded-r-full box-shadow-glow"></div>}
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare size={14} className={activeSessionId === session.id ? "text-emerald-400" : "text-zinc-600"} />
                  <span className={`text-xs truncate w-36 font-medium ${activeSessionId === session.id ? "text-emerald-100" : "text-zinc-500 group-hover:text-zinc-300"}`}>{session.title}</span>
                </div>
                {sessions.length > 1 && <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-all text-zinc-600"><Trash2 size={12} /></button>}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-[#050505] pb-[calc(1rem+env(safe-area-inset-bottom))]">
           <button onClick={() => setDeepThink(!deepThink)} className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between group cursor-pointer ${deepThink ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-transparent border-white/5 hover:border-white/10'}`}>
             <div className="flex items-center space-x-3">
               <div className={`p-1.5 rounded ${deepThink ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}><Zap size={14} className={deepThink ? "fill-current" : ""} /></div>
               <div className="flex flex-col items-start"><span className={`text-xs font-medium ${deepThink ? "text-emerald-100" : "text-zinc-500"}`}>Deep Think</span><span className="text-[9px] text-zinc-600">{deepThink ? "Reasoning: MAX" : "Reasoning: STD"}</span></div>
             </div>
             <div className={`w-1.5 h-1.5 rounded-full transition-all ${deepThink ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-800"}`} />
           </button>
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="h-16 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center space-x-3 md:space-x-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                className="p-3 -ml-3 text-zinc-400 hover:text-white transition-colors md:hidden cursor-pointer active:bg-white/10 rounded-full"
              >
                <Menu size={24} />
              </button>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors cursor-pointer">
                {sidebarOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              
              <div className="h-4 w-[1px] bg-white/10"></div>
              <div className="flex flex-col min-w-0">
                 <span className="text-xs font-medium text-zinc-200 tracking-wide truncate">{activeSession.title}</span>
                 <div className="flex items-center space-x-2"><span className="text-[10px] text-emerald-500/60 flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>ONLINE</span></div>
              </div>
            </div>
            <button onClick={() => setCanvasOpen(!canvasOpen)} className={`group flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer active:scale-95 ${canvasOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}>
              <Layout size={14} className={canvasOpen ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400 transition-colors"} />
              <span className="hidden sm:inline">Canvas Engine</span>
              <span className="sm:hidden">Canvas</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain">
          <div className="h-[calc(4rem+env(safe-area-inset-top))] w-full"></div>
          
          <div className="px-3 sm:px-8 md:px-16 space-y-6 pb-4">
            {activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[95%] md:max-w-3xl flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`hidden sm:flex w-8 h-8 rounded-lg flex-shrink-0 items-center justify-center mt-1 shadow-lg ${msg.role === 'user' ? 'bg-zinc-800 border border-white/5' : 'bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/20'}`}>
                    {msg.role === 'user' ? <div className="w-3 h-3 bg-zinc-400 rounded-sm" /> : <Terminal size={14} className="text-emerald-400" />}
                  </div>

                  <div className="flex flex-col space-y-2 min-w-0">
                     {msg.image && (
                       <div className="relative rounded-xl overflow-hidden border border-white/10 w-full sm:w-64">
                         <img src={msg.image} alt="Attachment" className="w-full h-auto" />
                       </div>
                     )}

                     {msg.generatedImage && (
                       <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 w-full sm:w-80 group/img">
                         <img src={msg.generatedImage} alt="Generated Art" className="w-full h-auto" />
                         <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                           <a href={msg.generatedImage} download="artix-gen.png" className="p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-emerald-500 hover:text-black transition-colors"><Download size={14} /></a>
                         </div>
                       </div>
                     )}

                     <div className={`relative rounded-2xl p-4 sm:p-6 shadow-xl transition-all duration-200 ${msg.role === 'user' ? 'bg-zinc-900/80 text-zinc-100 border border-white/5 backdrop-blur-sm' : 'bg-white/[0.02] text-zinc-200 border border-white/5 hover:bg-white/[0.04]'}`}>
                       {msg.role === 'system' ? (
                          <div className="font-mono text-[10px] text-emerald-500/50 flex items-center gap-2 select-none"><Activity size={10} /><span>SYSTEM_LOG: {msg.content}</span></div>
                       ) : (
                         <div className="text-[13px] sm:text-[14px] leading-7 font-light tracking-wide overflow-x-auto">
                            {msg.role === 'model' ? <Typewriter text={msg.content} speed={1} /> : <div className="whitespace-pre-wrap break-words">{msg.content}</div>}
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start sm:pl-16 pl-2">
                 <div className="flex items-center space-x-1.5 h-8 px-4 rounded-full bg-white/5 border border-white/5 w-fit">
                    <Loader2 size={14} className="animate-spin text-emerald-500/60" /><span className="ml-2 text-[10px] text-emerald-500/50 font-mono uppercase tracking-widest">Neural Processing</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="h-[calc(5rem+env(safe-area-inset-bottom))] w-full"></div>
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30 pointer-events-none flex justify-center bg-gradient-to-t from-black via-black to-transparent pt-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="w-full max-w-3xl pointer-events-auto relative group">
            {attachment && (
               <div className="absolute bottom-full mb-3 left-0 bg-[#0c0c0c] border border-emerald-500/20 p-2 rounded-xl flex items-center space-x-3 shadow-2xl w-full sm:w-auto">
                 <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0">
                    <img src={attachment.preview} className="w-full h-full object-cover" alt="preview" />
                 </div>
                 <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase">Vision Input</span>
                    <span className="text-[9px] text-zinc-600 truncate">{attachment.type}</span>
                 </div>
                 <button onClick={clearAttachment} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-red-400 cursor-pointer"><X size={16} /></button>
               </div>
            )}

            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
            
            <div className="relative flex items-end bg-[#0c0c0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
              <button onClick={() => fileInputRef.current?.click()} className="ml-2 mb-2 p-3 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer active:bg-white/10 rounded-full"><Paperclip size={20} /></button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter directive..."
                className="w-full bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-600 py-4 px-2 focus:ring-0 resize-none h-auto min-h-[56px] max-h-32 custom-scrollbar leading-relaxed"
                rows={1}
              />
              
              <div className="mr-2 mb-2">
                <button onClick={handleSend} disabled={loading || (!input.trim() && !attachment)} className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${input.trim() || attachment ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95' : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}>
                  <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CANVAS */}
      <div className={`
        fixed inset-0 z-[100] bg-[#080808] flex flex-col transition-all duration-300
        md:static md:inset-auto md:z-20 md:border-l md:border-white/5 md:shadow-[-20px_0_40px_rgba(0,0,0,0.5)]
        ${canvasOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 md:w-0 md:opacity-0 md:translate-x-20'}
        ${canvasOpen ? 'w-full md:w-[500px] xl:w-[650px]' : 'w-0'}
        pt-[env(safe-area-inset-top)]
      `}>
        <div className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 md:px-5 bg-[#080808]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-1.5 bg-emerald-900/20 rounded border border-emerald-500/20"><FileText size={14} className="text-emerald-400" /></div>
            <div className="flex flex-col"><span className="text-xs font-medium text-zinc-200 truncate max-w-[150px] md:max-w-[200px]">{canvasContent.title}</span><span className="text-[9px] text-zinc-600 uppercase font-mono tracking-wider">{canvasContent.language}</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"><Save size={18} /></button>
            <button onClick={() => setCanvasOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 relative bg-[#050505] overflow-hidden group pb-[env(safe-area-inset-bottom)]">
           <textarea value={canvasContent.content} onChange={(e) => setCanvasContent({...canvasContent, content: e.target.value})} className="w-full h-full bg-transparent text-zinc-300 font-mono text-xs sm:text-sm leading-relaxed p-4 md:p-6 resize-none focus:outline-none selection:bg-emerald-500/20 custom-scrollbar" spellCheck="false" />
        </div>
      </div>
    </div>
  );
}
