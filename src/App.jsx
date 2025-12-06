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
  Play, Eye, EyeOff, Heart, Sparkles, Camera, Film, Gamepad2, Trophy
} from 'lucide-react';

/**
 * ARTIX-AI v7.6: The Pong Update
 * * FEATURES:
 * - Gravity Easter Egg (11/05/2025)
 * - Hafsa Glitch (Hafsa)
 * - Eiffel Tower Animation (Paris)
 * - Artix Video Loop (Artix)
 * - Photo & Video Album Gallery (Muah)
 * - Multiplayer Pong (Ping Pong)
 */

// --- CONFIGURATION ---
const APP_NAME = "ARTIX-AI";
const VERSION = "7.6.0";

// --- YOUR MEDIA CONFIGURATION ---
const ALBUM_MEDIA = [
  { type: 'image', src: '/photo1.jpeg' },
  { type: 'image', src: '/photo2.jpeg' },
  { type: 'video', src: '/video1.MP4' }, 
  { type: 'image', src: '/photo3.jpeg' },
  { type: 'video', src: '/video2.mp4' }, 
  { type: 'image', src: '/photo4.JPEG' },
  { type: 'video', src: '/video3.mp4' },
  { type: 'video', src: '/video4.mp4' },
];

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
    if (data.error) throw new Error(data.error.message || "API request failed");
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
  const PROXY_BASE = "/rodin-proxy"; 

  useEffect(() => {
    const createTask = async () => {
      setStatus('creating');
      setProgress(5);
      try {
        const formData = new FormData();
        formData.append('prompt', prompt); 
        const response = await fetch(`${PROXY_BASE}/api/v2/rodin`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${HYPER3D_KEY}` },
          body: formData
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Creation Failed (${response.status}): ${text.substring(0, 50)}`);
        }
        const data = await response.json();
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
        setError(err.message);
        setStatus('error');
      }
    };
    if (prompt) createTask();
  }, [prompt]);

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
        const response = await fetch(`${PROXY_BASE}/api/v2/status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${HYPER3D_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription_key: taskData.subKey })
        });
        if (!response.ok) return; 
        const data = await response.json();
        const currentStatus = data.status;
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
      } catch (err) { console.warn("Polling error:", err); }
    };
    const fetchDownloadUrl = async (uuid) => {
        try {
            const res = await fetch(`${PROXY_BASE}/api/v2/download`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${HYPER3D_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_uuid: uuid })
            });
            if (!res.ok) throw new Error(`Download API Error: ${res.status}`);
            const dlData = await res.json();
            const glbUrl = dlData.data?.model_urls?.glb || dlData.model_urls?.glb;
            const videoUrl = dlData.data?.video_url || dlData.video_url;
            if (glbUrl) {
                setResult({ model_url: glbUrl, video_url: videoUrl });
                setStatus('success');
            } else {
                throw new Error("GLB URL missing from download response");
            }
        } catch (e) { setError(e.message); setStatus('error'); }
    };
    const interval = setInterval(poll, 5000); 
    return () => clearInterval(interval);
  }, [status, taskData]);

  if (status === 'error') return ( <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-mono break-all"><AlertCircle size={16} /><span>{error}</span></div> );
  if (status === 'creating' || status === 'polling') return ( <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-col gap-3 text-blue-300 font-mono text-xs w-full max-w-md"><div className="flex items-center gap-3"><Loader2 size={16} className="animate-spin text-blue-400" /><div className="flex flex-col"><span className="font-bold tracking-wider">ARTIX ENGINE</span><span className="opacity-70">{status === 'creating' ? 'Initializing...' : `Rendering Asset (${Math.round(progress)}%)`}</span></div></div><div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden"><div className="h-full bg-blue-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div></div></div> );
  if (status === 'success') return ( <div className="group relative overflow-hidden rounded-xl bg-black border border-emerald-500/30 max-w-md"><div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10"><div className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-500/20 backdrop-blur border border-emerald-500/30"><Box size={12} className="text-emerald-400" /><span className="text-[10px] font-bold text-emerald-300">HYPER3D</span></div><a href={result?.model_url || "#"} download className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white transition-colors"><Download size={16} /></a></div><div className="aspect-square bg-zinc-900 flex items-center justify-center">{result?.video_url ? (<video src={result.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />) : (<div className="flex flex-col items-center text-zinc-500"><Box size={48} className="mb-2 opacity-50" /><span className="text-xs">Preview Unavailable</span></div>)}</div><div className="p-3 bg-[#0c0c0c] border-t border-white/5 flex justify-between items-center"><span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{prompt}</span><span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> Ready</span></div></div> );
  return null;
};

// --- TYPEWRITER ---
const Typewriter = ({ text, speed = 5, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    setDisplayedText(''); 
    if (!text || text.length < 5 || text.includes(':::')) {
        setDisplayedText(text || '');
        if(onComplete) onComplete();
        return;
    }
    let i = 0;
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

  const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline ? (
      <div className="my-4 rounded-lg bg-black/40 border border-emerald-500/10 overflow-hidden font-mono text-xs sm:text-sm shadow-inner">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5"><span className="text-xs text-emerald-500/50 font-medium tracking-wider">{match ? match[1].toUpperCase() : 'CODE'}</span><div className="flex space-x-1.5"><div className="w-2 h-2 rounded-full bg-white/10"></div><div className="w-2 h-2 rounded-full bg-white/10"></div></div></div><div className="p-4 overflow-x-auto text-emerald-100/90 custom-scrollbar"><code className={className} {...props}>{children}</code></div>
      </div>
    ) : (<code className="bg-emerald-900/30 text-emerald-300 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>);
  };

  return ( <div className="markdown-content text-[13px] sm:text-[14px] leading-7 font-light tracking-wide text-zinc-200"><ReactMarkdown children={displayedText} remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={{ code: CodeBlock, strong: ({node, ...props}) => <span className="text-emerald-400 font-bold" {...props} />, a: ({node, ...props}) => <a className="text-emerald-500 hover:underline" {...props} />, ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />, ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />, p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, }} /></div> );
};

// --- EIFFEL TOWER AESTHETIC COMPONENT ---
const EiffelTowerAnimation = () => {
    return (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 via-transparent to-black pointer-events-none"></div>
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                {[...Array(25)].map((_, i) => (
                    <div key={i} className="absolute animate-pulse text-yellow-100/40" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s` }}>
                        <Sparkles size={Math.random() > 0.5 ? 10 : 20} />
                    </div>
                ))}
            </div>
            <div className="relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <svg width="320" height="480" viewBox="0 0 400 600" className="stroke-emerald-200/90 fill-none" style={{ strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    <defs><linearGradient id="parisGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399" /><stop offset="50%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
                    <style>{`.draw-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: draw 4.5s ease-in-out forwards; stroke: url(#parisGrad); } @keyframes draw { to { stroke-dashoffset: 0; } }`}</style>
                    <path className="draw-path" d="M200,20 L200,80 M200,20 L195,80 L205,80 L200,20 M185,150 L215,150 L210,80 L190,80 L185,150 M170,280 L230,280 L215,150 L185,150 L170,280" />
                    <path className="draw-path" d="M170,280 L140,400 L110,550 L160,550 L175,400 M230,280 L260,400 L290,550 L240,550 L225,400" />
                    <path className="draw-path" d="M140,550 Q200,450 260,550" />
                    <path className="draw-path" d="M140,400 L260,400 M175,400 L225,400 M190,150 L210,150 M160,530 L240,530" />
                </svg>
            </div>
            <div className="mt-8 text-center z-10">
                <h1 className="text-6xl font-thin tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-yellow-100 to-emerald-200 animate-pulse" style={{ animationDuration: '4s' }}>PARIS</h1>
                <p className="text-[10px] text-emerald-500/50 uppercase tracking-widest mt-2 font-mono">Je t'aime</p>
            </div>
        </div>
    );
};

// --- PONG GAME COMPONENT ---
const PongGame = ({ onClose }) => {
  const canvasRef = useRef(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Game Objects
    const ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 6, speed: 5, dx: 5, dy: 5, color: '#10b981' };
    const paddleWidth = 10, paddleHeight = 80;
    const p1 = { x: 10, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, score: 0, dy: 0, speed: 8 };
    const p2 = { x: canvas.width - 20, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, score: 0, dy: 0, speed: 8 };

    // Keys
    const keys = { w: false, s: false, ArrowUp: false, ArrowDown: false };

    const handleKeyDown = (e) => {
        if(e.key === 'w' || e.key === 'W') keys.w = true;
        if(e.key === 's' || e.key === 'S') keys.s = true;
        if(e.key === 'ArrowUp') keys.ArrowUp = true;
        if(e.key === 'ArrowDown') keys.ArrowDown = true;
    };
    const handleKeyUp = (e) => {
        if(e.key === 'w' || e.key === 'W') keys.w = false;
        if(e.key === 's' || e.key === 'S') keys.s = false;
        if(e.key === 'ArrowUp') keys.ArrowUp = false;
        if(e.key === 'ArrowDown') keys.ArrowDown = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resetBall = () => {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        ball.speed = 5;
        ball.dx = -ball.dx;
    };

    const update = () => {
        // Paddle Movement
        if (keys.w && p1.y > 0) p1.y -= p1.speed;
        if (keys.s && p1.y < canvas.height - p1.height) p1.y += p1.speed;
        if (keys.ArrowUp && p2.y > 0) p2.y -= p2.speed;
        if (keys.ArrowDown && p2.y < canvas.height - p2.height) p2.y += p2.speed;

        // Ball Movement
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall Collision (Top/Bottom)
        if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) ball.dy *= -1;

        // Paddle Collision
        let player = (ball.x < canvas.width / 2) ? p1 : p2;
        if (
            ball.x - ball.radius < player.x + player.width &&
            ball.x + ball.radius > player.x &&
            ball.y + ball.radius > player.y &&
            ball.y - ball.radius < player.y + player.height
        ) {
            // Hit logic
            let collidePoint = ball.y - (player.y + player.height / 2);
            collidePoint = collidePoint / (player.height / 2);
            let angleRad = (Math.PI / 4) * collidePoint;
            let direction = (ball.x < canvas.width / 2) ? 1 : -1;
            
            ball.dx = direction * ball.speed * Math.cos(angleRad);
            ball.dy = ball.speed * Math.sin(angleRad);
            ball.speed += 0.2; // Increase speed
        }

        // Scoring
        if (ball.x - ball.radius < 0) {
            p2.score++;
            setScores({p1: p1.score, p2: p2.score});
            resetBall();
        } else if (ball.x + ball.radius > canvas.width) {
            p1.score++;
            setScores({p1: p1.score, p2: p2.score});
            resetBall();
        }
    };

    const draw = () => {
        // Clear
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Net
        ctx.beginPath();
        ctx.setLineDash([5, 15]);
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10b98133'; // Low opacity emerald
        ctx.stroke();

        // Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = ball.color;

        // Paddles
        ctx.fillStyle = '#10b981';
        ctx.fillRect(p1.x, p1.y, p1.width, p1.height);
        ctx.fillRect(p2.x, p2.y, p2.width, p2.height);
        ctx.shadowBlur = 0; // Reset glow for other elements
    };

    const gameLoop = () => {
        update();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Initial Draw before loop
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Start loop
    gameLoop();

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full max-w-4xl aspect-video bg-black border-4 border-emerald-900/50 rounded-xl shadow-2xl shadow-emerald-500/20 overflow-hidden">
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>
        
        {/* Score Board */}
        <div className="absolute top-4 left-0 right-0 flex justify-between px-12 z-10 font-mono text-4xl font-bold text-emerald-500/50 select-none">
            <span>{scores.p1}</span>
            <span>{scores.p2}</span>
        </div>

        {/* Controls Hint */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 z-10 text-[10px] text-emerald-500/30 font-mono uppercase tracking-widest select-none">
            <span>P1: W / S</span>
            <span>P2: UP / DOWN</span>
        </div>

        <canvas 
            ref={canvasRef} 
            width={800} 
            height={450} 
            className="w-full h-full block"
        />

        <button onClick={onClose} className="absolute top-4 right-4 z-30 p-2 bg-emerald-900/20 hover:bg-red-900/40 text-emerald-500 hover:text-red-400 rounded-full transition-colors cursor-pointer border border-emerald-500/20">
            <X size={20} />
        </button>
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
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false); 
  const [canvasContent, setCanvasContent] = useState({ title: 'untitled.txt', language: 'text', content: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false); 

  // --- EASTER EGG STATES ---
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchMessage, setGlitchMessage] = useState(null);
  const [gravityActive, setGravityActive] = useState(false);
  const [daysCounter, setDaysCounter] = useState(null);
  const [parisActive, setParisActive] = useState(false);
  const [artixActive, setArtixActive] = useState(false);
  const [muahActive, setMuahActive] = useState(false);
  
  // --- PONG STATES ---
  const [pongActive, setPongActive] = useState(false);
  const [pongStatus, setPongStatus] = useState('idle'); // idle, waiting, playing

  const flickerRef = useRef(null);
  const glitchTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);
  const chatRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    return () => {
      if (flickerRef.current) clearInterval(flickerRef.current);
      if (glitchTimeoutRef.current) clearTimeout(glitchTimeoutRef.current);
      document.documentElement.classList.remove('glitch-flicker'); 
    };
  }, []);

  useEffect(() => { if (window.innerWidth >= 768) setSidebarOpen(true); }, []);
  
  // --- TRIGGERS ---
  const handleHafsaTrigger = () => {
    if (glitchActive || gravityActive || parisActive || artixActive || muahActive || pongActive) return; 
    setGlitchActive(true);
    setInput('Hafsa...'); 
    flickerRef.current = setInterval(() => { document.documentElement.classList.toggle('glitch-flicker'); }, 50); 
    glitchTimeoutRef.current = setTimeout(() => { clearInterval(flickerRef.current); document.documentElement.classList.remove('glitch-flicker'); }, 3000); 
    glitchTimeoutRef.current = setTimeout(() => { setGlitchMessage("I love you ❤️"); }, 4500); 
  };

  const triggerGravityEffect = () => {
    if (gravityActive || glitchActive || parisActive || artixActive || muahActive || pongActive) return;
    setGravityActive(true);
    setInput(''); 
    const targetDate = new Date(2025, 4, 11); 
    const today = new Date();
    const diffTime = Math.abs(today - targetDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const elements = [sidebarRef.current, chatRef.current, canvasRef.current];
    elements.forEach(el => { if(el) { const rotation = Math.random() * 90 - 45; el.style.transition = "transform 2s cubic-bezier(0.5, 0, 0.5, 1), opacity 1.5s ease"; el.style.transform = `translateY(150vh) rotate(${rotation}deg)`; el.style.pointerEvents = "none"; } });
    setTimeout(() => { setDaysCounter(diffDays); }, 2000);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    const lowerVal = value.toLowerCase();

    // TRIGGER CHECKER
    if (lowerVal.includes('hafsa') && !glitchActive) handleHafsaTrigger();
    else if (value.includes('11/05/2025') && !gravityActive) triggerGravityEffect();
    else if (lowerVal.includes('paris') && !parisActive && !glitchActive && !gravityActive && !artixActive && !muahActive && !pongActive) {
        setParisActive(true);
        setTimeout(() => { setParisActive(false); setInput(''); }, 5000); 
    }
    else if (lowerVal.includes('artix') && !artixActive && !parisActive && !glitchActive && !gravityActive && !muahActive && !pongActive) {
        setArtixActive(true);
        setInput('');
    }
    else if (lowerVal.includes('muah') && !muahActive && !artixActive && !parisActive && !glitchActive && !gravityActive && !pongActive) {
        setMuahActive(true);
        setInput('');
    }
  };

  const processAttachmentFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target.result.split(',')[1];
      setAttachment({ type: file.type, data: base64Data, preview: e.target.result });
    };
    reader.readAsDataURL(file);
  };
  
  const handleFileSelect = (e) => { const file = e.target.files[0]; processAttachmentFile(file); };
  const handlePaste = (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let file = null;
    for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { file = items[i].getAsFile(); break; } }
    if (file) { e.preventDefault(); processAttachmentFile(file); }
  };
  
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
    const lowerInput = input.toLowerCase();

    // --- PONG TRIGGER LOGIC ---
    if (lowerInput.includes('ping pong') || (pongStatus === 'waiting' && lowerInput.includes('join'))) {
        if (!pongActive) {
            // First trigger: Open Lobby
            setPongActive(true);
            setPongStatus('waiting');
            setInput('');
        } else if (pongStatus === 'waiting') {
            // Second trigger: Start Game
            setPongStatus('playing');
            setInput('');
        }
        return; // Stop normal chat sending
    }

    if ((!input.trim() && !attachment) || loading) return;
    
    // Check other triggers
    if (lowerInput.includes('hafsa') && !glitchActive) { handleHafsaTrigger(); return; }
    if (input.includes('11/05/2025') && !gravityActive) { triggerGravityEffect(); return; }
    if (lowerInput.includes('paris') && !parisActive) { setParisActive(true); setTimeout(() => { setParisActive(false); setInput(''); }, 5000); return; }
    if (lowerInput.includes('artix') && !artixActive) { setArtixActive(true); setInput(''); return; }
    if (lowerInput.includes('muah') && !muahActive) { setMuahActive(true); setInput(''); return; }

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

      {/* --- EASTER EGG OVERLAYS --- */}
      
      {/* 1. PARIS OVERLAY */}
      {parisActive && <EiffelTowerAnimation />}

      {/* 2. ARTIX VIDEO OVERLAY */}
      {artixActive && (
        <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center animate-in fade-in duration-500">
            <video src="/artix_video.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
            <button onClick={() => setArtixActive(false)} className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-red-500/80 rounded-full text-white/70 hover:text-white transition-all duration-300 z-50 backdrop-blur-sm cursor-pointer border border-white/10"><X size={24} /></button>
            <div className="absolute bottom-10 left-10 z-40 pointer-events-none"><h1 className="text-4xl font-black text-white/20 tracking-[0.3em] select-none">ARTIX CORE</h1></div>
        </div>
      )}

      {/* 3. MUAH ALBUM OVERLAY */}
      {muahActive && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 overflow-hidden">
             {/* Header */}
             <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-50">
                <div className="flex items-center space-x-3">
                    <Heart className="text-red-500 fill-red-500 animate-pulse" />
                    <span className="text-2xl font-light tracking-[0.2em] text-white">I HATE MY LIFE IF YOU FIND THIS</span>
                </div>
                <button onClick={() => setMuahActive(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white cursor-pointer"><X size={24} /></button>
             </div>
             
             {/* Gallery Grid */}
             <div className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar pt-24 pb-20 px-4 sm:px-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                    {ALBUM_MEDIA.map((item, index) => (
                        <div key={index} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl hover:scale-[1.02] transition-transform duration-500">
                             {item.type === 'video' ? (
                                <>
                                    <video src={item.src} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full backdrop-blur-sm z-20"><Film size={14} className="text-white/80" /></div>
                                </>
                             ) : (
                                <img src={item.src} alt={`Memory ${index + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x800/18181b/10b981?text=Photo+${index+1}`; }} />
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
                                <span className="text-emerald-400 font-mono text-xs">{item.type === 'video' ? `VID_00${index + 1}` : `IMG_00${index + 1}`}</span>
                             </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
      )}

      {/* 4. HAFSA GLITCH OVERLAY */}
      {glitchMessage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 transition-opacity duration-1000 opacity-100">
            <div className="text-7xl sm:text-9xl animate-pulse transition-all duration-1000 text-red-500 font-extrabold tracking-widest text-center shadow-2xl">
                {glitchMessage}
            </div>
        </div>
      )}

      {/* 5. GRAVITY OVERLAY */}
      {daysCounter !== null && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-black transition-opacity duration-1000">
            <div className="animate-pulse mb-8"><Heart size={100} className="text-red-500 fill-red-500 shadow-red-500 drop-shadow-[0_0_35px_rgba(220,38,38,0.8)]" /></div>
            <h1 className="text-4xl sm:text-6xl font-thin text-white mb-4 tracking-widest text-center">We have been together for</h1>
            <div className="text-8xl sm:text-9xl font-bold text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] font-mono">{daysCounter}</div>
            <h2 className="text-2xl sm:text-3xl font-light text-zinc-400 mt-4 tracking-[0.5em] uppercase">DAYS</h2>
            <p className="mt-12 text-zinc-600 text-sm font-mono opacity-50">Since 11/05/2025</p>
        </div>
      )}

      {/* 6. PONG GAME OVERLAY (MULTIPLAYER WAITING & GAME) */}
      {pongActive && (
          <div className="fixed inset-0 z-[9000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
              
              {/* WAITING STATE */}
              {pongStatus === 'waiting' && (
                  <div className="flex flex-col items-center text-center space-y-6 animate-pulse">
                      <Gamepad2 size={80} className="text-emerald-500" />
                      <h1 className="text-4xl font-bold text-white tracking-[0.2em]">PONG MULTIPLAYER</h1>
                      <div className="p-6 border border-emerald-500/30 bg-emerald-900/10 rounded-xl max-w-md">
                          <p className="text-emerald-400 font-mono text-lg mb-2">WAITING FOR PLAYER 2...</p>
                          <p className="text-zinc-500 text-xs uppercase tracking-widest">Type "Ping Pong" or "Join" to connect</p>
                      </div>
                      <div className="flex space-x-2 mt-4">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <button onClick={() => {setPongActive(false); setPongStatus('idle')}} className="mt-8 text-xs text-red-500 hover:text-red-400 uppercase tracking-widest hover:underline cursor-pointer">Cancel Request</button>
                  </div>
              )}

              {/* PLAYING STATE */}
              {pongStatus === 'playing' && (
                  <PongGame onClose={() => {setPongActive(false); setPongStatus('idle')}} />
              )}
          </div>
      )}

      {/* --- APP CONTENT WRAPPER --- */}
      <div 
        className={`flex h-full w-full ${glitchMessage || daysCounter !== null || artixActive || muahActive ? 'hidden' : 'relative'}`}
        style={glitchActive 
            ? { filter: 'blur(3px) contrast(2) saturate(4) hue-rotate(10deg)', opacity: 0.2, transition: 'filter 0.3s, opacity 0.3s' } 
            : {}
        }
      >
        
        {/* SIDEBAR */}
        <div ref={sidebarRef} className={`fixed md:relative z-[90] h-full bg-[#030303] border-r border-white/5 flex flex-col transition-all duration-300 ease-out ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'} pt-[env(safe-area-inset-top)]`}>
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

        {/* CHAT AREA */}
        <div ref={chatRef} className="flex-1 flex flex-col min-w-0 bg-black relative transition-transform duration-1000">
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
                <textarea value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder="Enter directive..." className="w-full bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-600 py-4 px-2 focus:ring-0 resize-none h-auto min-h-[56px] max-h-32 custom-scrollbar leading-relaxed" rows={1} disabled={glitchActive || gravityActive} />
                <div className="mr-2 mb-2"><button onClick={handleSend} disabled={loading || (!input.trim() && !attachment && !pongActive && pongStatus !== 'waiting') || glitchActive || gravityActive} className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${input.trim() || attachment ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95' : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}><Send size={18} className={input.trim() ? "ml-0.5" : ""} /></button></div>
              </div>
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div ref={canvasRef} className={`flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] bg-[#080808] border-l border-white/5 ${isCanvasFullscreen ? 'fixed inset-0 z-[200]' : `fixed inset-0 z-[100] md:static md:inset-auto md:z-20 ${canvasOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 md:w-0 md:opacity-0 md:translate-x-20'} ${canvasOpen ? 'w-full md:w-[500px] xl:w-[650px]' : 'w-0'}`} pt-[env(safe-area-inset-top)]`}>
          <div className="h-14 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-5 bg-[#080808]">
            <div className="flex items-center space-x-3 overflow-hidden"><div className="p-1.5 bg-emerald-900/20 rounded border border-emerald-500/20"><FileText size={14} className="text-emerald-400" /></div><div className="flex flex-col"><span className="text-xs font-medium text-zinc-200 truncate max-w-[200px]">{canvasContent.title}</span><span className="text-[9px] text-zinc-600 uppercase font-mono tracking-wider">{canvasContent.language}</span></div></div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setPreviewMode(!previewMode)} className={`p-2 rounded-lg transition-colors cursor-pointer ${previewMode ? 'text-emerald-400 bg-emerald-950/30' : 'text-zinc-500 hover:bg-white/5'}`} title={previewMode ? "View Code" : "Preview App"}>{previewMode ? <Code size={18} /> : <Play size={18} />}</button>
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
    </div>
  );
}
