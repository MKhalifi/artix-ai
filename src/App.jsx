import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

import { 
  Cpu, Send, Terminal, Zap, Activity, Shield, Code, MessageSquare, 
  Settings, Maximize2, Minimize2, Plus, FileText, X, Save, Copy, 
  Layout, Clock, Trash2, ChevronRight, Image as ImageIcon, 
  Paperclip, Loader2, Download, Menu, Box, RotateCw, CheckCircle2, AlertCircle,
  Play, Eye, EyeOff
} from 'lucide-react';

/**
 * ARTIX-AI v6.4: Final Rodin Fix + Fullscreen + Paste Fix
 * * FEATURES:
 * - 3D Generation: Uses correct /api/v2/rodin endpoint via proxy.
 * - Logic: Matches route.ts (FormData) and route.ts (Status Polling).
 * - Fullscreen: Added toggle button to Canvas.
 * - Live Preview: Integrated.
 * - Image Paste: Added clipboard paste functionality.
 */

// --- CORE CONFIGURATION ---
const APP_NAME = "ARTIX-AI";
const VERSION = "6.4.0-I-Love-You";

// --- PROTOCOLS ---
const CANVAS_PROTOCOL = `
[PROTOCOL: CANVAS]
If the user asks for code, a website, a game, or a component, output it inside an artifact block.
If it is a web app, use 'html' language and put CSS/JS inside the same file.

:::artifact:{filename}:{language}
{content}
:::
`;

const IMAGE_GEN_PROTOCOL = `
[PROTOCOL: IMAGE GENERATION]
If the user asks to generate an image (2D), use:
:::image_gen:{detailed_prompt}:::
`;

const THREE_D_PROTOCOL = `
[PROTOCOL: 3D GENERATION]
If the user explicitly asks to generate a 3D model/asset/object, use:
:::3d_gen:{detailed_prompt}:::
Do not output markdown or text descriptions, just the token.
`;

const SYSTEM_PROMPT_BASE = `You are ARTIX, a high-performance artificial intelligence. 
Your traits: PRECISION, IDENTITY (ARTIX), CAPABILITY (Coding, Vision, Creation, 3D Modeling).

FORMATTING RULES:
1. Use standard Markdown for text (**bold**, *italic*, etc).
2. Use LaTeX for ALL math. Inline: $E=mc^2$. Block: $$ \sum_{i=0}^n x_i $$.

You have access to the Hyper3D Rodin Engine.
${CANVAS_PROTOCOL}
${IMAGE_GEN_PROTOCOL}
${THREE_D_PROTOCOL}`;

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
            temperature: isDeepThink ? 0.6 : 0.7, 
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
      throw new Error(data.error.message || "API request failed");
    }
    
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) throw new Error("No image data returned from API");
    
    return `data:image/png;base64,${base64Image}`;

  } catch (error) {
    console.error("Generative Engine Failure:", error);
    return null;
  }
};

// --- 3D ENGINE COMPONENT ---

const ThreeDGenerator = ({ prompt }) => {
  const [status, setStatus] = useState('init'); 
  const [taskData, setTaskData] = useState({ subKey: null, uuid: null }); 
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  
  const HYPER3D_KEY = "vibecoding"; 
  // Points to local proxy defined in vite.config.js
  const PROXY_BASE = "/rodin-proxy"; 

  // 1. Create Task (Matches route.ts logic)
  useEffect(() => {
    const createTask = async () => {
      setStatus('creating');
      setProgress(5);
      try {
        console.log(`[3D] Creating Task via ${PROXY_BASE}/api/v2/rodin`);
        
        // Create FormData as per route.ts
        const formData = new FormData();
        formData.append('prompt', prompt); 

        // Note: route.ts sends to /api/v2/rodin
        const response = await fetch(`${PROXY_BASE}/api/v2/rodin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HYPER3D_KEY}`,
            // Do NOT set Content-Type header manually for FormData
          },
          body: formData
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Creation Failed (${response.status}): ${text.substring(0, 50)}`);
        }

        const data = await response.json();
        console.log("[3D] Creation Response:", data);
        
        // Logic from your console logs:
        // data.jobs.subscription_key -> for polling
        // data.uuid -> for downloading
        const subKey = data.jobs?.subscription_key || data.subscription_key;
        const uuid = data.uuid;
        
        if (subKey && uuid) {
          setTaskData({ subKey, uuid });
          setStatus('polling');
          setProgress(10);
        } else {
          throw new Error("API returned success but IDs are missing.");
        }
      } catch (err) {
        console.error("3D Init Error:", err);
        setError(err.message);
        setStatus('error');
      }
    };

    if (prompt) createTask();
  }, [prompt]);

  // 2. Poll Status (Matches route.ts logic)
  useEffect(() => {
    if (status !== 'polling' || !taskData.subKey) return;

    let pollCount = 0;
    const MAX_POLLS = 600; 

    const poll = async () => {
      pollCount++;
      if (pollCount > MAX_POLLS) {
          setError("Timed out waiting for generation.");
          setStatus('error');
          return;
      }

      try {
        // Use POST for status check (as seen in route.ts)
        const response = await fetch(`${PROXY_BASE}/api/v2/status`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${HYPER3D_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription_key: taskData.subKey })
        });
        
        if (!response.ok) return; 

        const data = await response.json();
        console.log("[3D] Poll Data:", data);

        const currentStatus = data.status;
        
        // Update Progress
        if (typeof data.progress === 'number') {
            setProgress(data.progress);
        } else {
            setProgress(prev => Math.min(prev + 0.5, 95)); 
        }
        
        if (currentStatus === 'succeed' || currentStatus === 'completed') {
            setProgress(100);
            await fetchDownloadUrl(taskData.uuid);
        } else if (currentStatus === 'failed') {
            setError("Generation failed on server");
            setStatus('error');
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    };

    const fetchDownloadUrl = async (uuid) => {
        try {
            // Matches logic in route.ts
            const res = await fetch(`${PROXY_BASE}/api/v2/download`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${HYPER3D_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task_uuid: uuid })
            });
            
            if (!res.ok) throw new Error(`Download API Error: ${res.status}`);
            const dlData = await res.json();
            
            // Assuming standard Rodin response structure for download
            const glbUrl = dlData.data?.model_urls?.glb || dlData.model_urls?.glb;
            const videoUrl = dlData.data?.video_url || dlData.video_url;

            if (glbUrl) {
                setResult({ model_url: glbUrl, video_url: videoUrl });
                setStatus('success');
            } else {
                throw new Error("GLB URL missing from download response");
            }
        } catch (e) { 
            console.error("Download fetch failed", e);
            setError(e.message);
            setStatus('error');
        }
    };

    const interval = setInterval(poll, 5000); 
    return () => clearInterval(interval);
  }, [status, taskData]);

  if (status === 'error') return (
    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-mono break-all">
        <AlertCircle size={16} className="flex-shrink-0" />
        <span>{error}</span>
    </div>
  );

  if (status === 'creating' || status === 'polling') return (
    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-col gap-3 text-blue-300 font-mono text-xs w-full max-w-md">
        <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-blue-400" />
            <div className="flex flex-col">
                <span className="font-bold tracking-wider">ARTIX ENGINE</span>
                <span className="opacity-70">{status === 'creating' ? 'Initializing...' : `Rendering Asset (${Math.round(progress)}%)`}</span>
            </div>
        </div>
        <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
    </div>
  );

  if (status === 'success') return (
    <div className="group relative overflow-hidden rounded-xl bg-black border border-emerald-500/30 max-w-md">
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10">
             <div className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-500/20 backdrop-blur border border-emerald-500/30">
                 <Box size={12} className="text-emerald-400" />
                 <span className="text-[10px] font-bold text-emerald-300">HYPER3D</span>
             </div>
             <a href={result?.model_url || "#"} download className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white transition-colors">
                 <Download size={16} />
             </a>
        </div>
        <div className="aspect-square bg-zinc-900 flex items-center justify-center">
            {result?.video_url ? (
                <video src={result.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
                 <div className="flex flex-col items-center text-zinc-500">
                     <Box size={48} className="mb-2 opacity-50" />
                     <span className="text-xs">Preview Unavailable</span>
                 </div>
            )}
        </div>
        <div className="p-3 bg-[#0c0c0c] border-t border-white/5 flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{prompt}</span>
            <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> Ready</span>
        </div>
    </div>
  );

  return null;
};

// --- UI COMPONENTS ---

// --- FIXED TYPEWRITER COMPONENT ---

const Typewriter = ({ text, speed = 10, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    // 1. Reset text immediately when prop changes
    setDisplayedText(''); 
    
    // 2. If text is missing, short, or has complex artifacts, show instantly to avoid bugs
    if (!text || text.length < 5 || text.includes(':::')) {
        setDisplayedText(text || '');
        if(onComplete) onComplete();
        return;
    }

    let i = 0;
    
    // 3. Use an interval that slices the string (0 to i)
    // This method is "unskippable" because it always grabs the full start of the string
    const timer = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  // Render Logic (Markdown)
  const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline ? (
      <div className="my-4 rounded-lg bg-black/40 border border-emerald-500/10 overflow-hidden font-mono text-xs sm:text-sm shadow-inner">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
          <span className="text-xs text-emerald-500/50 font-medium tracking-wider">
            {match ? match[1].toUpperCase() : 'CODE'}
          </span>
          <div className="flex space-x-1.5">
             <div className="w-2 h-2 rounded-full bg-white/10"></div>
             <div className="w-2 h-2 rounded-full bg-white/10"></div>
          </div>
        </div>
        <div className="p-4 overflow-x-auto text-emerald-100/90 custom-scrollbar">
          <code className={className} {...props}>{children}</code>
        </div>
      </div>
    ) : (
      <code className="bg-emerald-900/30 text-emerald-300 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
    );
  };

  return (
    <div className="markdown-content text-[13px] sm:text-[14px] leading-7 font-light tracking-wide text-zinc-200">
      <ReactMarkdown 
        children={displayedText} 
        remarkPlugins={[remarkMath, remarkGfm]} 
        rehypePlugins={[rehypeKatex]} 
        components={{ 
          code: CodeBlock, 
          strong: ({node, ...props}) => <span className="text-emerald-400 font-bold" {...props} />, 
          a: ({node, ...props}) => <a className="text-emerald-500 hover:underline" {...props} />, 
          ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />, 
          ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />, 
          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, 
        }} 
      />
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function ArtixClone() {
  const [sessions, setSessions] = useState([{ id: 'init', title: 'System Initialization', messages: [{ role: 'system', content: `ARTIX-AI v${VERSION} online. Hyper3D Matrix Connected.` }], date: new Date() }]);
  const [activeSessionId, setActiveSessionId] = useState('init');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [attachment, setAttachment] = useState(null); 
  
  // NEW: Preview Mode State
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false); // Toggle between Code/Preview
  const [canvasContent, setCanvasContent] = useState({ title: 'untitled.txt', language: 'text', content: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false); // Fullscreen state

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => { if (window.innerWidth >= 768) setSidebarOpen(true); }, []);
  
  // --- NEW ATTACHMENT PROCESSING LOGIC ---
  const processAttachmentFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      setAttachment({ type: file.type, data: base64Data, preview: e.target.result });
    };
    reader.readAsDataURL(file);
  };
  
  // Used for file input button
  const handleFileSelect = (e) => { 
    const file = e.target.files[0]; 
    processAttachmentFile(file);
  };

  // Used for clipboard paste event
  const handlePaste = (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let file = null;
    
    // 1. Look for an image in the clipboard items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        file = items[i].getAsFile();
        break;
      }
    }

    // 2. If an image file is found, prevent default paste, and process the file.
    if (file) {
      e.preventDefault(); 
      processAttachmentFile(file);
    }
    // 3. If no image is found, native text paste proceeds naturally.
  };
  // --- END NEW ATTACHMENT PROCESSING LOGIC ---
  
  const clearAttachment = () => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const createSession = () => { const newId = `sess_${Date.now()}`; const newSession = { id: newId, title: 'New Protocol', messages: [{ role: 'system', content: `ARTIX-AI v${VERSION} // New Thread.` }], date: new Date() }; setSessions(prev => [...prev, newSession]); setActiveSessionId(newId); setCanvasOpen(false); setCanvasContent({ title: 'untitled.txt', language: 'text', content: '' }); if (window.innerWidth < 768) setSidebarOpen(false); };
  const deleteSession = (e, id) => { e.stopPropagation(); if (sessions.length === 1) return; const newSessions = sessions.filter(s => s.id !== id); setSessions(newSessions); if (activeSessionId === id) setActiveSessionId(newSessions[0].id); };

  const processResponse = async (text) => {
    const artifactRegex = /:::artifact:(.*?):(.*?)\n([\s\S]*?):::/;
    const artifactMatch = text.match(artifactRegex);
    if (artifactMatch) {
      const [fullMatch, filename, lang, content] = artifactMatch;
      setCanvasContent({ title: filename.trim(), language: lang.trim(), content: content.trim() });
      setCanvasOpen(true);
      if (lang.trim().toLowerCase() === 'html') setPreviewMode(true);
      text = text.replace(fullMatch, `\n> [SYSTEM]: Artifact generated. See Canvas panel (${filename.trim()}).\n`);
    }
    const imageRegex = /:::image_gen:(.*?):::/;
    const imageMatch = text.match(imageRegex);
    if (imageMatch) { const [fullMatch, prompt] = imageMatch; let cleanText = text.replace(fullMatch, ""); try { const imageUrl = await generateImage(prompt); if (imageUrl) { return { text: cleanText + `\n> [GEN_ENGINE]: Image generated successfully.`, generatedImage: imageUrl }; } else { return { text: cleanText + `\n> [GEN_ENGINE]: Generation failed.` }; } } catch (e) { return { text: cleanText + `\n> [GEN_ENGINE]: Generation Error.` }; } }
    const threeDRegex = /:::3d_gen:(.*?):::/;
    const threeDMatch = text.match(threeDRegex);
    if (threeDMatch) { const [fullMatch, prompt] = threeDMatch; return { text: text.replace(fullMatch, ""), threeDPrompt: prompt }; }
    return { text: text };
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading) return;
    const currentInput = input;
    const currentAttachment = attachment;
    setInput('');
    clearAttachment();
    setLoading(true);
    setSessions(prev => prev.map(s => { if (s.id === activeSessionId) { const isFirst = s.messages.length <= 1; const newTitle = isFirst ? (currentInput.length > 20 ? currentInput.slice(0, 20) + '...' : currentInput || 'Analysis') : s.title; return { ...s, title: newTitle, messages: [...s.messages, { role: 'user', content: currentInput, image: currentAttachment ? currentAttachment.preview : null }] }; } return s; }));
    const history = activeSession.messages.filter(m => m.role !== 'system');
    const rawResponse = await generateResponse(history, currentInput, currentAttachment, deepThink);
    const processedData = await processResponse(rawResponse);
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, { role: 'model', content: processedData.text, generatedImage: processedData.generatedImage, threeDPrompt: processedData.threeDPrompt }] } : s));
    setLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeSession.messages, loading]);

  return (
    <div className="flex h-[100dvh] w-full bg-black text-emerald-50 font-sans overflow-hidden fixed inset-0 overscroll-none selection:bg-emerald-500/30">
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed md:relative z-[90] h-full bg-[#030303] border-r border-white/5 flex flex-col transition-all duration-300 ease-out ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'} pt-[env(safe-area-inset-top)]`}>
        <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-white/5 bg-gradient-to-r from-[#0a0a0a] to-transparent justify-between">
          <div className="flex items-center space-x-3"><div className="w-8 h-8 bg-emerald-950/30 rounded-lg border border-emerald-500/30 flex items-center justify-center"><Cpu size={16} className="text-emerald-400" /></div><div className="flex flex-col"><span className="text-sm font-bold tracking-wider text-white">ARTIX<span className="text-emerald-500">AI</span></span><span className="text-[9px] text-emerald-500/50 font-mono uppercase tracking-[0.2em]">v6.3</span></div></div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 p-2 cursor-pointer active:text-white"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <button onClick={createSession} className="w-full mb-6 flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 p-3 rounded-lg transition-all duration-200 group cursor-pointer active:scale-95"><Plus size={14} className="group-hover:scale-110 transition-transform text-emerald-400" /><span className="text-xs font-medium uppercase tracking-wider">New Protocol</span></button>
          <div className="space-y-1"><h3 className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest px-3 mb-2">Active Sessions</h3>{sessions.map(session => (<div key={session.id} onClick={() => { setActiveSessionId(session.id); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`w-full relative group cursor-pointer p-3 rounded-lg flex items-center justify-between transition-all duration-200 active:bg-white/10 ${activeSessionId === session.id ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'}`}>{activeSessionId === session.id && <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-emerald-500 rounded-r-full box-shadow-glow"></div>}<div className="flex items-center space-x-3 overflow-hidden"><MessageSquare size={14} className={activeSessionId === session.id ? "text-emerald-400" : "text-zinc-600"} /><span className={`text-xs truncate w-36 font-medium ${activeSessionId === session.id ? "text-emerald-100" : "text-zinc-500 group-hover:text-zinc-300"}`}>{session.title}</span></div>{sessions.length > 1 && <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-all text-zinc-600"><Trash2 size={12} /></button>}</div>))}</div>
        </div>
        <div className="p-4 border-t border-white/5 bg-[#050505] pb-[calc(1rem+env(safe-area-inset-bottom))]"><button onClick={() => setDeepThink(!deepThink)} className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between group cursor-pointer ${deepThink ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-transparent border-white/5 hover:border-white/10'}`}><div className="flex items-center space-x-3"><div className={`p-1.5 rounded ${deepThink ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}><Zap size={14} className={deepThink ? "fill-current" : ""} /></div><div className="flex flex-col items-start"><span className={`text-xs font-medium ${deepThink ? "text-emerald-100" : "text-zinc-500"}`}>Deep Thinking</span><span className="text-[9px] text-zinc-600">{deepThink ? "Reasoning: MAX" : "Reasoning: STANDARD"}</span></div></div><div className={`w-1.5 h-1.5 rounded-full transition-all ${deepThink ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-800"}`} /></button></div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        <header className="absolute top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="h-16 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center space-x-3 md:space-x-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 -ml-3 text-zinc-400 hover:text-white transition-colors md:hidden cursor-pointer active:bg-white/10 rounded-full"><Menu size={24} /></button><button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors cursor-pointer">{sidebarOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><div className="h-4 w-[1px] bg-white/10"></div><div className="flex flex-col min-w-0"><span className="text-xs font-medium text-zinc-200 tracking-wide truncate">{activeSession.title}</span><div className="flex items-center space-x-2"><span className="text-[10px] text-emerald-500/60 flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>ONLINE</span></div></div></div>
            <button onClick={() => setCanvasOpen(!canvasOpen)} className={`group flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer active:scale-95 ${canvasOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'}`}><Layout size={14} className={canvasOpen ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400 transition-colors"} /><span className="hidden sm:inline">Canvas Engine</span><span className="sm:hidden">Canvas</span></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar overscroll-contain">
          <div className="h-[calc(4rem+env(safe-area-inset-top))] w-full"></div>
          <div className="px-3 sm:px-8 md:px-16 space-y-6 pb-4">
            {activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[95%] md:max-w-3xl flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}><div className={`hidden sm:flex w-8 h-8 rounded-lg flex-shrink-0 items-center justify-center mt-1 shadow-lg ${msg.role === 'user' ? 'bg-zinc-800 border border-white/5' : 'bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/20'}`}>{msg.role === 'user' ? <div className="w-3 h-3 bg-zinc-400 rounded-sm" /> : <Terminal size={14} className="text-emerald-400" />}</div>
                  <div className="flex flex-col space-y-2 min-w-0">
                     {msg.image && (<div className="relative rounded-xl overflow-hidden border border-white/10 w-full sm:w-64"><img src={msg.image} alt="Attachment" className="w-full h-auto" /></div>)}
                     {msg.generatedImage && (<div className="relative rounded-xl overflow-hidden border border-emerald-500/30 w-full sm:w-80 group/img"><img src={msg.generatedImage} alt="Generated Art" className="w-full h-auto" /><div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"><a href={msg.generatedImage} download="artix-gen.png" className="p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-emerald-500 hover:text-black transition-colors"><Download size={14} /></a></div></div>)}
                     {msg.threeDPrompt && (<ThreeDGenerator prompt={msg.threeDPrompt} />)}
                     {msg.content && (<div className={`relative rounded-2xl p-4 sm:p-6 shadow-xl transition-all duration-200 ${msg.role === 'user' ? 'bg-zinc-900/80 text-zinc-100 border border-white/5 backdrop-blur-sm' : 'bg-white/[0.02] text-zinc-200 border border-white/5 hover:bg-white/[0.04]'}`}>{msg.role === 'system' ? (<div className="font-mono text-[10px] text-emerald-500/50 flex items-center gap-2 select-none"><Activity size={10} /><span>SYSTEM_LOG: {msg.content}</span></div>) : (<Typewriter text={msg.content} speed={5} />)}</div>)}
                  </div>
                </div>
              </div>
            ))}
            {loading && (<div className="flex justify-start sm:pl-16 pl-2"><div className="flex items-center space-x-1.5 h-8 px-4 rounded-full bg-white/5 border border-white/5 w-fit"><Loader2 size={14} className="animate-spin text-emerald-500/60" /><span className="ml-2 text-[10px] text-emerald-500/50 font-mono uppercase tracking-widest">Neural Processing</span></div></div>)}
            <div ref={messagesEndRef} />
          </div>
          <div className="h-[calc(5rem+env(safe-area-inset-bottom))] w-full"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30 pointer-events-none flex justify-center bg-gradient-to-t from-black via-black to-transparent pt-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="w-full max-w-3xl pointer-events-auto relative group">
            {attachment && (<div className="absolute bottom-full mb-3 left-0 bg-[#0c0c0c] border border-emerald-500/20 p-2 rounded-xl flex items-center space-x-3 shadow-2xl w-full sm:w-auto"><div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0"><img src={attachment.preview} className="w-full h-full object-cover" alt="preview" /></div><div className="flex flex-col flex-1 min-w-0"><span className="text-[10px] text-emerald-400 font-mono uppercase">Vision Input</span><span className="text-[9px] text-zinc-600 truncate">{attachment.type}</span></div><button onClick={clearAttachment} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-red-400 cursor-pointer"><X size={16} /></button></div>)}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
            <div className="relative flex items-end bg-[#0c0c0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" /><button onClick={() => fileInputRef.current?.click()} className="ml-2 mb-2 p-3 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer active:bg-white/10 rounded-full"><Paperclip size={20} /></button>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={handleKeyDown} 
                onPaste={handlePaste} // <--- IMAGE PASTE FIX APPLIED HERE
                placeholder="Enter directive..." 
                className="w-full bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-600 py-4 px-2 focus:ring-0 resize-none h-auto min-h-[56px] max-h-32 custom-scrollbar leading-relaxed" 
                rows={1} 
              />
              <div className="mr-2 mb-2"><button onClick={handleSend} disabled={loading || (!input.trim() && !attachment)} className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${input.trim() || attachment ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95' : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}><Send size={18} className={input.trim() ? "ml-0.5" : ""} /></button></div>
            </div>
          </div>
        </div>
      </div>

      {/* CANVAS - Updated for Fullscreen */}
      <div className={`
  flex flex-col h-full // <--- ADDED THESE THREE CLASSES
  transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]
  bg-[#080808] border-l border-white/5 
  ${isCanvasFullscreen ? 'fixed inset-0 z-[200]' : `fixed inset-0 z-[100] md:static md:inset-auto md:z-20 ${canvasOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 md:w-0 md:opacity-0 md:translate-x-20'} ${canvasOpen ? 'w-full md:w-[500px] xl:w-[650px]' : 'w-0'}`}
  pt-[env(safe-area-inset-top)]
`}>
        <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-5 bg-[#080808]">
          <div className="flex items-center space-x-3 overflow-hidden"><div className="p-1.5 bg-emerald-900/20 rounded border border-emerald-500/20"><FileText size={14} className="text-emerald-400" /></div><div className="flex flex-col"><span className="text-xs font-medium text-zinc-200 truncate max-w-[200px]">{canvasContent.title}</span><span className="text-[9px] text-zinc-600 uppercase font-mono tracking-wider">{canvasContent.language}</span></div></div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setPreviewMode(!previewMode)} className={`p-2 rounded-lg transition-colors cursor-pointer ${previewMode ? 'text-emerald-400 bg-emerald-950/30' : 'text-zinc-500 hover:bg-white/5'}`} title={previewMode ? "View Code" : "Preview App"}>{previewMode ? <Code size={18} /> : <Play size={18} />}</button>
            {/* NEW FULLSCREEN BUTTON */}
            <button onClick={() => setIsCanvasFullscreen(!isCanvasFullscreen)} className={`p-2 rounded-lg transition-colors cursor-pointer ${isCanvasFullscreen ? 'text-emerald-400 bg-emerald-950/30' : 'text-zinc-500 hover:bg-white/5'}`} title={isCanvasFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
               {isCanvasFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"><Save size={16} /></button><button onClick={() => {setCanvasOpen(false); setIsCanvasFullscreen(false);}} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"><X size={16} /></button></div>
        </div>
        <div className="flex-1 relative bg-[#050505] overflow-hidden group pb-[env(safe-area-inset-bottom)]">
           {previewMode && (canvasContent.language === 'html' || canvasContent.language === 'javascript') ? (<iframe srcDoc={canvasContent.content} className="w-full h-full bg-white" title="Live Preview" sandbox="allow-scripts allow-popups allow-modals" />) : (<textarea value={canvasContent.content} onChange={(e) => setCanvasContent({...canvasContent, content: e.target.value})} className="w-full h-full bg-transparent text-zinc-300 font-mono text-xs sm:text-sm leading-relaxed p-6 resize-none focus:outline-none selection:bg-emerald-500/20 custom-scrollbar" spellCheck="false" />)}
        </div>
      </div>
    </div>
  );
}
