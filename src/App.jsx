import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import Peer from 'peerjs'; // REQUIRES: npm install peerjs
import 'katex/dist/katex.min.css';

import { 
  Cpu, Send, Terminal, Zap, Activity, Shield, Code, MessageSquare, 
  Settings, Maximize2, Minimize2, Plus, FileText, X, Save, Copy, 
  Layout, Clock, Trash2, ChevronRight, Image as ImageIcon, 
  Paperclip, Loader2, Download, Menu, Box, RotateCw, CheckCircle2, AlertCircle,
  Play, Eye, EyeOff, Heart, Sparkles, Camera, Film, Gamepad2, Trophy, Radio, Wifi
} from 'lucide-react';

/**
 * ARTIX-AI v7.9: The Smooth Input Update
 * * FEATURES:
 * - Gravity Easter Egg (11/05/2025)
 * - Hafsa Glitch (Hafsa)
 * - Eiffel Tower Animation (Paris)
 * - Artix Video Loop (Artix)
 * - Photo & Video Album Gallery (Muah)
 * - Real-Time Multiplayer Pong (PeerJS) - High Performance Input
 */

// --- CONFIGURATION ---
const APP_NAME = "ARTIX-AI";
const VERSION = "7.5.0";

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
`;

const SYSTEM_PROMPT_BASE = `You are ARTIX, a high-performance artificial intelligence. 
Your traits: PRECISION, IDENTITY (ARTIX), CAPABILITY (Coding, Vision, Creation, 3D Modeling).
FORMATTING RULES: Use standard Markdown. Use LaTeX for math.
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
  const systemInstruction = isDeepThink ? SYSTEM_PROMPT_BASE + "\n" + SYSTEM_PROMPT_DEEP_THINK : SYSTEM_PROMPT_BASE;
  const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
  const currentParts = [{ text: userInput }];
  if (attachment) currentParts.push({ inlineData: { mimeType: attachment.type, data: attachment.data } });
  contents.push({ role: 'user', parts: currentParts });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemInstruction }] } })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "System Warning: No coherence detected.";
  } catch (error) { return `[SYSTEM ERROR]: ${error.message}`; }
};

const generateImage = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } })
      }
    );
    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64Image) throw new Error("No image data");
    return `data:image/png;base64,${base64Image}`;
  } catch (error) { return null; }
};

// --- 3D ENGINE ---
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
      setStatus('creating'); setProgress(5);
      try {
        const formData = new FormData(); formData.append('prompt', prompt); 
        const response = await fetch(`${PROXY_BASE}/api/v2/rodin`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${HYPER3D_KEY}` }, body: formData
        });
        const data = await response.json();
        const subKey = data.jobs?.subscription_key || data.subscription_key;
        const uuid = data.uuid;
        if (subKey && uuid) { setTaskData({ subKey, uuid }); setStatus('polling'); setProgress(10); } 
        else { throw new Error("API ID missing."); }
      } catch (err) { setError(err.message); setStatus('error'); }
    };
    if (prompt) createTask();
  }, [prompt]);

  useEffect(() => {
    if (status !== 'polling' || !taskData.subKey) return;
    const poll = async () => {
      try {
        const response = await fetch(`${PROXY_BASE}/api/v2/status`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${HYPER3D_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription_key: taskData.subKey })
        });
        const data = await response.json();
        if (typeof data.progress === 'number') setProgress(data.progress);
        if (data.status === 'succeed') { setProgress(100); await fetchDownloadUrl(taskData.uuid); }
      } catch (err) {}
    };
    const fetchDownloadUrl = async (uuid) => {
        try {
            const res = await fetch(`${PROXY_BASE}/api/v2/download`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${HYPER3D_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_uuid: uuid })
            });
            const dlData = await res.json();
            setResult({ model_url: dlData.data?.model_urls?.glb, video_url: dlData.data?.video_url });
            setStatus('success');
        } catch (e) { setError(e.message); setStatus('error'); }
    };
    const interval = setInterval(poll, 5000); return () => clearInterval(interval);
  }, [status, taskData]);

  if (status === 'error') return ( <div className="p-4 bg-red-900/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div> );
  if (status === 'success') return ( <div className="bg-black border border-emerald-500/30 rounded-xl overflow-hidden max-w-md"><video src={result.video_url} autoPlay loop muted className="w-full" /></div> );
  return ( <div className="p-4 bg-blue-900/10 border border-blue-500/30 text-blue-300 font-mono text-xs"><Loader2 className="animate-spin inline mr-2"/> Rendering 3D Asset... {Math.round(progress)}%</div> );
};

// --- TYPEWRITER ---
const Typewriter = ({ text, speed = 5, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    setDisplayedText(''); 
    if (!text || text.length < 5 || text.includes(':::')) { setDisplayedText(text || ''); if(onComplete) onComplete(); return; }
    let i = 0;
    const timer = setInterval(() => {
      if (i <= text.length) { setDisplayedText(text.slice(0, i)); i++; } 
      else { clearInterval(timer); if (onComplete) onComplete(); }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline ? (
      <div className="my-4 rounded-lg bg-black/40 border border-emerald-500/10 font-mono text-xs"><div className="px-4 py-2 bg-white/5 border-b border-white/5 text-emerald-500/50">{match?.[1].toUpperCase()}</div><div className="p-4 overflow-x-auto text-emerald-100/90 custom-scrollbar"><code className={className} {...props}>{children}</code></div></div>
    ) : (<code className="bg-emerald-900/30 text-emerald-300 px-1 rounded text-xs font-mono" {...props}>{children}</code>);
  };
  return ( <div className="markdown-content text-[13px] leading-7 text-zinc-200"><ReactMarkdown children={displayedText} components={{ code: CodeBlock }} /></div> );
};

// --- MULTIPLAYER PONG COMPONENT ---
const MultiplayerPong = ({ onClose }) => {
  const canvasRef = useRef(null);
  
  // Connection State
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [myId, setMyId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [mode, setMode] = useState('menu'); // 'menu', 'hosting', 'joining', 'playing'
  const [role, setRole] = useState(null); // 'host', 'client'
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [statusMsg, setStatusMsg] = useState('');

  // Game Settings
  const INITIAL_SPEED = 1; // Balanced
  const MAX_SPEED = 8;
  const PADDLE_SPEED = 7; // Pixels per frame (at 60fps = 540px/sec) - VERY SMOOTH

  // Game State (Refs for performance)
  const gameState = useRef({
    ball: { x: 400, y: 225, dx: INITIAL_SPEED, dy: INITIAL_SPEED },
    p1: { y: 185 },
    p2: { y: 185 },
    score: { p1: 0, p2: 0 }
  });
  const myPaddle = useRef(185);
  
  // Input State (The magic fix for smoothness)
  const keysPressed = useRef({ up: false, down: false });

  // --- INITIALIZE PEER ---
  useEffect(() => {
    const randomId = 'ARTIX-' + Math.floor(1000 + Math.random() * 9000);
    const newPeer = new Peer(randomId);
    
    newPeer.on('open', (id) => {
      setMyId(id);
      console.log('My ID:', id);
    });

    newPeer.on('connection', (connection) => {
      console.log('Incoming connection...');
      setConn(connection);
      setRole('host');
      setMode('playing');
      setStatusMsg('CONNECTED');
      setupConnectionHandlers(connection, 'host');
    });

    setPeer(newPeer);
    return () => newPeer.destroy();
  }, []);

  const setupConnectionHandlers = (connection, currentRole) => {
    connection.on('data', (data) => {
      if (currentRole === 'host') {
        if (data.type === 'INPUT') {
            gameState.current.p2.y = data.y;
        }
      } else {
        if (data.type === 'UPDATE') {
            gameState.current = data.state;
            setScores(data.state.score);
        }
      }
    });
    
    connection.on('close', () => {
        setStatusMsg("OPPONENT DISCONNECTED");
        setTimeout(onClose, 3000);
    });
  };

  const handleJoin = () => {
    if (!joinId) return;
    const cleanId = joinId.toUpperCase().startsWith('ARTIX-') ? joinId.toUpperCase() : `ARTIX-${joinId}`;
    setStatusMsg(`CONNECTING TO ${cleanId}...`);
    
    const connection = peer.connect(cleanId);
    setConn(connection);
    setRole('client');
    
    connection.on('open', () => {
        setMode('playing');
        setStatusMsg('CONNECTED');
        setupConnectionHandlers(connection, 'client');
    });

    connection.on('error', (err) => setStatusMsg("CONNECTION FAILED"));
  };

  // --- GAME LOOP ---
  useEffect(() => {
    if (mode !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const PADDLE_HEIGHT = 80;
    const CANVAS_HEIGHT = 450;
    const CANVAS_WIDTH = 800;

    // --- SMOOTH INPUT HANDLERS ---
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysPressed.current.up = true;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysPressed.current.down = true;
    };
    
    const handleKeyUp = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysPressed.current.up = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysPressed.current.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- MAIN LOOP ---
    const loop = () => {
        // 1. Process Input (Every Frame)
        let moved = false;
        if (keysPressed.current.up && myPaddle.current > 0) {
            myPaddle.current -= PADDLE_SPEED;
            moved = true;
        }
        if (keysPressed.current.down && myPaddle.current < CANVAS_HEIGHT - PADDLE_HEIGHT) {
            myPaddle.current += PADDLE_SPEED;
            moved = true;
        }

        // 2. Sync Input with Network
        if (moved) {
            if (role === 'host') {
                gameState.current.p1.y = myPaddle.current;
            } else if (conn) {
                // Throttle sending slightly or send every frame? 
                // For local peerJS, sending every frame on change is usually fine for responsiveness.
                conn.send({ type: 'INPUT', y: myPaddle.current });
            }
        }

        // 3. Process Physics (Host Only)
        if (role === 'host') updatePhysics();

        // 4. Draw
        draw(ctx);

        animationId = requestAnimationFrame(loop);
    };

    const updatePhysics = () => {
        const state = gameState.current;
        const { ball } = state;

        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall
        if (ball.y + 6 > CANVAS_HEIGHT || ball.y - 6 < 0) ball.dy *= -1;

        // Paddles
        const p1 = { x: 10, y: state.p1.y, w: 10, h: PADDLE_HEIGHT };
        const p2 = { x: CANVAS_WIDTH - 20, y: state.p2.y, w: 10, h: PADDLE_HEIGHT };

        // Hit P1 (Left)
        if (ball.x - 6 < p1.x + p1.w && ball.y > p1.y && ball.y < p1.y + p1.h) {
            let newSpeed = Math.abs(ball.dx) + 0.5;
            if(newSpeed > MAX_SPEED) newSpeed = MAX_SPEED;
            ball.dx = newSpeed; 
        }
        // Hit P2 (Right)
        if (ball.x + 6 > p2.x && ball.y > p2.y && ball.y < p2.y + p2.h) {
            let newSpeed = Math.abs(ball.dx) + 0.5;
            if(newSpeed > MAX_SPEED) newSpeed = MAX_SPEED;
            ball.dx = -newSpeed;
        }

        // Score
        if (ball.x < 0) { state.score.p2++; resetBall(state); } 
        else if (ball.x > CANVAS_WIDTH) { state.score.p1++; resetBall(state); }

        if (conn) {
            conn.send({ type: 'UPDATE', state: state });
            setScores({...state.score}); 
        }
    };

    const resetBall = (state) => {
        state.ball = { 
            x: 400, 
            y: 225, 
            dx: (Math.random() > 0.5 ? INITIAL_SPEED : -INITIAL_SPEED), 
            dy: (Math.random() > 0.5 ? INITIAL_SPEED : -INITIAL_SPEED) 
        };
    };

    const draw = (ctx) => {
        // Clear
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Net
        ctx.beginPath();
        ctx.setLineDash([5, 15]);
        ctx.moveTo(CANVAS_WIDTH / 2, 0);
        ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
        ctx.strokeStyle = '#10b98120';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ball
        const { ball, p1, p2 } = gameState.current;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';

        // Paddles
        // Host (Left)
        ctx.shadowBlur = role === 'host' ? 15 : 0; 
        ctx.shadowColor = '#10b981';
        ctx.fillStyle = role === 'host' ? '#10b981' : '#10b98150'; 
        ctx.fillRect(10, role === 'host' ? myPaddle.current : p1.y, 10, PADDLE_HEIGHT);
        
        // Client (Right)
        ctx.shadowBlur = role === 'client' ? 15 : 0;
        ctx.shadowColor = '#10b981';
        ctx.fillStyle = role === 'client' ? '#10b981' : '#10b98150';
        ctx.fillRect(CANVAS_WIDTH - 20, role === 'client' ? myPaddle.current : p2.y, 10, PADDLE_HEIGHT);
    };

    // START
    loop();

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        cancelAnimationFrame(animationId);
    };
  }, [mode, role, conn]);

  // --- RENDER UI ---
  return (
    <div className="relative w-full max-w-4xl aspect-video bg-black border-4 border-emerald-900/50 rounded-xl shadow-2xl shadow-emerald-500/20 overflow-hidden flex flex-col items-center justify-center">
        {/* CRT Effect */}
        <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%]"></div>
        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 text-emerald-500/50 hover:text-red-500 cursor-pointer"><X size={20} /></button>

        {mode === 'menu' && (
            <div className="flex flex-col items-center space-y-8 z-30 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center">
                    <Wifi size={48} className="text-emerald-500 mb-4 animate-pulse" />
                    <h2 className="text-3xl font-bold text-white tracking-[0.2em] font-mono">MULTIPLAYER PROTOCOL</h2>
                    <p className="text-emerald-500/50 text-xs font-mono mt-2">SECURE P2P CONNECTION ESTABLISHED</p>
                </div>
                <div className="flex gap-6">
                    <button onClick={() => setMode('hosting')} className="group flex flex-col items-center p-6 border border-emerald-500/30 rounded-xl hover:bg-emerald-900/20 transition-all w-48 cursor-pointer">
                        <Radio size={32} className="text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-emerald-300 font-bold tracking-widest">HOST</span>
                        <span className="text-emerald-500/40 text-[10px] mt-1">CREATE FREQUENCY</span>
                    </button>
                    <button onClick={() => setMode('joining')} className="group flex flex-col items-center p-6 border border-emerald-500/30 rounded-xl hover:bg-emerald-900/20 transition-all w-48 cursor-pointer">
                        <Gamepad2 size={32} className="text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-emerald-300 font-bold tracking-widest">JOIN</span>
                        <span className="text-emerald-500/40 text-[10px] mt-1">CONNECT TO FREQUENCY</span>
                    </button>
                </div>
            </div>
        )}

        {mode === 'hosting' && (
             <div className="flex flex-col items-center space-y-6 z-30 animate-in fade-in duration-300">
                <Loader2 size={48} className="text-emerald-500 animate-spin" />
                <div className="text-center">
                    <p className="text-emerald-500/50 text-xs font-mono mb-2">WAITING FOR PLAYER 2...</p>
                    <div className="bg-emerald-900/20 border border-emerald-500/50 p-4 rounded-lg">
                        <span className="text-4xl font-mono font-bold text-white tracking-widest select-all">{myId.replace('ARTIX-', '')}</span>
                    </div>
                    <p className="text-zinc-500 text-[10px] mt-4 max-w-xs">Share this frequency code with your opponent. The game will start automatically when they join.</p>
                </div>
                <button onClick={() => setMode('menu')} className="text-xs text-red-500 hover:underline cursor-pointer">CANCEL</button>
             </div>
        )}

        {mode === 'joining' && (
             <div className="flex flex-col items-center space-y-6 z-30 animate-in fade-in duration-300">
                <div className="text-center">
                    <p className="text-emerald-500/50 text-xs font-mono mb-4">ENTER HOST FREQUENCY CODE</p>
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-500/50 font-mono text-xl">ARTIX-</span>
                        <input 
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            placeholder="XXXX"
                            maxLength={4}
                            className="bg-transparent border-b-2 border-emerald-500 text-3xl font-mono text-white w-24 text-center focus:outline-none uppercase tracking-widest placeholder-zinc-700"
                        />
                    </div>
                </div>
                <button onClick={handleJoin} disabled={joinId.length < 4} className="px-8 py-2 bg-emerald-600 text-white rounded font-bold tracking-widest hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">CONNECT</button>
                <button onClick={() => setMode('menu')} className="text-xs text-zinc-500 hover:text-white cursor-pointer">BACK</button>
                {statusMsg && <p className="text-red-400 text-xs font-mono">{statusMsg}</p>}
             </div>
        )}

        {mode === 'playing' && (
            <>
                <div className="absolute top-6 left-0 right-0 flex justify-between px-20 z-10 font-mono text-5xl font-bold text-emerald-500/20 select-none pointer-events-none">
                    <span>{scores.p1}</span>
                    <span>{scores.p2}</span>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
                     <span className="text-[10px] text-emerald-500/40 font-mono uppercase tracking-[0.3em]">
                        {role === 'host' ? 'YOU ARE HOST (LEFT)' : 'YOU ARE CLIENT (RIGHT)'} • USE ARROW KEYS TO MOVE
                     </span>
                </div>
                <canvas ref={canvasRef} width={800} height={450} className="w-full h-full block" />
            </>
        )}
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
  
  // --- MULTIPLAYER PONG STATE ---
  const [pongActive, setPongActive] = useState(false);

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

    // --- PONG TRIGGER ---
    if (lowerInput.includes('ping pong') || lowerInput.includes('play pong')) {
        if (!pongActive) {
            setPongActive(true);
            setInput('');
        }
        return; 
    }

    if ((!input.trim() && !attachment) || loading) return;
    
    // Check triggers
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

      {/* --- OVERLAYS --- */}
      {parisActive && <EiffelTowerAnimation />}

      {/* ARTIX VIDEO */}
      {artixActive && (
        <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center animate-in fade-in duration-500">
            <video src="/artix_video.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
            <button onClick={() => setArtixActive(false)} className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-red-500/80 rounded-full text-white/70 hover:text-white transition-all cursor-pointer"><X size={24} /></button>
        </div>
      )}

      {/* MUAH ALBUM */}
      {muahActive && (
        <div className="fixed inset-0 z-[6000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 overflow-hidden">
             <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-50">
                <div className="flex items-center space-x-3"><Heart className="text-red-500 fill-red-500 animate-pulse" /><span className="text-2xl font-light tracking-[0.2em] text-white">MEMORIES</span></div>
                <button onClick={() => setMuahActive(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors cursor-pointer"><X size={24} /></button>
             </div>
             <div className="w-full h-full overflow-y-auto custom-scrollbar pt-24 pb-20 px-4 sm:px-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                    {ALBUM_MEDIA.map((item, index) => (
                        <div key={index} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl hover:scale-[1.02] transition-transform duration-500">
                             {item.type === 'video' ? (
                                <><video src={item.src} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" /><div className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-full backdrop-blur-sm z-20"><Film size={14} className="text-white/80" /></div></>
                             ) : (
                                <img src={item.src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/600x800/18181b/10b981?text=Photo+${index+1}`; }} />
                             )}
                        </div>
                    ))}
                </div>
             </div>
        </div>
      )}

      {/* HAFSA GLITCH */}
      {glitchMessage && ( <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95"><div className="text-7xl sm:text-9xl animate-pulse text-red-500 font-extrabold tracking-widest text-center shadow-2xl">{glitchMessage}</div></div> )}

      {/* GRAVITY / DATE */}
      {daysCounter !== null && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-black transition-opacity duration-1000">
            <div className="animate-pulse mb-8"><Heart size={100} className="text-red-500 fill-red-500 shadow-red-500" /></div>
            <h1 className="text-4xl sm:text-6xl font-thin text-white mb-4 tracking-widest text-center">We have been together for</h1>
            <div className="text-8xl sm:text-9xl font-bold text-emerald-500 font-mono">{daysCounter}</div>
            <h2 className="text-2xl sm:text-3xl font-light text-zinc-400 mt-4 tracking-[0.5em] uppercase">DAYS</h2>
            <p className="mt-12 text-zinc-600 text-sm font-mono opacity-50">Since 11/05/2025</p>
        </div>
      )}

      {/* 6. MULTIPLAYER PONG OVERLAY */}
      {pongActive && (
          <div className="fixed inset-0 z-[9000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
              <MultiplayerPong onClose={() => setPongActive(false)} />
          </div>
      )}

      {/* --- APP LAYOUT --- */}
      <div className={`flex h-full w-full ${glitchMessage || daysCounter !== null || artixActive || muahActive ? 'hidden' : 'relative'}`} style={glitchActive ? { filter: 'blur(3px) contrast(2) saturate(4) hue-rotate(10deg)', opacity: 0.2, transition: 'filter 0.3s, opacity 0.3s' } : {}}>
        
        {/* SIDEBAR */}
        <div ref={sidebarRef} className={`fixed md:relative z-[90] h-full bg-[#030303] border-r border-white/5 flex flex-col transition-all duration-300 ease-out ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden'} pt-[env(safe-area-inset-top)]`}>
          <div className="h-16 flex-shrink-0 flex items-center px-6 border-b border-white/5 bg-gradient-to-r from-[#0a0a0a] to-transparent justify-between">
            <div className="flex items-center space-x-3"><div className="w-8 h-8 bg-emerald-950/30 rounded-lg border border-emerald-500/30 flex items-center justify-center"><Cpu size={16} className="text-emerald-400" /></div><div className="flex flex-col"><span className="text-sm font-bold tracking-wider text-white">ARTIX<span className="text-emerald-500">AI</span></span><span className="text-[9px] text-emerald-500/50 font-mono uppercase tracking-[0.2em]">v6.3</span></div></div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 p-2 cursor-pointer active:text-white"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            <button onClick={createSession} className="w-full mb-6 flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 p-3 rounded-lg transition-all duration-200 group cursor-pointer active:scale-95"><Plus size={14} className="group-hover:scale-110 transition-transform text-emerald-400" /><span className="text-xs font-medium uppercase tracking-wider">New Protocol</span></button>
            <div className="space-y-1">{sessions.map(session => (<div key={session.id} onClick={() => { setActiveSessionId(session.id); if (window.innerWidth < 768) setSidebarOpen(false); }} className={`w-full relative group cursor-pointer p-3 rounded-lg flex items-center justify-between transition-all duration-200 active:bg-white/10 ${activeSessionId === session.id ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-white/5 border border-transparent'}`}>{activeSessionId === session.id && <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-emerald-500 rounded-r-full box-shadow-glow"></div>}<div className="flex items-center space-x-3 overflow-hidden"><MessageSquare size={14} className={activeSessionId === session.id ? "text-emerald-400" : "text-zinc-600"} /><span className={`text-xs truncate w-36 font-medium ${activeSessionId === session.id ? "text-emerald-100" : "text-zinc-500 group-hover:text-zinc-300"}`}>{session.title}</span></div>{sessions.length > 1 && <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded transition-all text-zinc-600"><Trash2 size={12} /></button>}</div>))}</div>
          </div>
        </div>

        {/* CHAT AREA */}
        <div ref={chatRef} className="flex-1 flex flex-col min-w-0 bg-black relative transition-transform duration-1000">
          <header className="absolute top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
            <div className="h-16 flex items-center justify-between px-4 md:px-6">
              <div className="flex items-center space-x-3 md:space-x-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 -ml-3 text-zinc-400 hover:text-white transition-colors md:hidden cursor-pointer"><Menu size={24} /></button><button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:block p-2 hover:bg-white/5 rounded-lg text-zinc-500 cursor-pointer">{sidebarOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><div className="h-4 w-[1px] bg-white/10"></div><span className="text-xs font-medium text-zinc-200 truncate">{activeSession.title}</span></div>
              <button onClick={() => setCanvasOpen(!canvasOpen)} className={`group flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${canvasOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-zinc-400 border border-white/5'}`}><Layout size={14} /><span className="hidden sm:inline">Canvas Engine</span></button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 sm:px-8 md:px-16 space-y-6 pb-4 pt-24">
            {activeSession.messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[95%] md:max-w-3xl flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`hidden sm:flex w-8 h-8 rounded-lg flex-shrink-0 items-center justify-center mt-1 shadow-lg ${msg.role === 'user' ? 'bg-zinc-800 border border-white/5' : 'bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/20'}`}>{msg.role === 'user' ? <div className="w-3 h-3 bg-zinc-400 rounded-sm" /> : <Terminal size={14} className="text-emerald-400" />}</div>
                    <div className="flex flex-col space-y-2 min-w-0">
                      {msg.image && (<div className="relative rounded-xl overflow-hidden border border-white/10 w-full sm:w-64"><img src={msg.image} className="w-full h-auto" /></div>)}
                      {msg.generatedImage && (<div className="relative rounded-xl overflow-hidden border border-emerald-500/30 w-full sm:w-80 group/img"><img src={msg.generatedImage} className="w-full h-auto" /><div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"><a href={msg.generatedImage} download="artix-gen.png" className="p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-emerald-500"><Download size={14} /></a></div></div>)}
                      {msg.threeDPrompt && (<ThreeDGenerator prompt={msg.threeDPrompt} />)}
                      {msg.content && (<div className={`relative rounded-2xl p-4 sm:p-6 shadow-xl transition-all duration-200 ${msg.role === 'user' ? 'bg-zinc-900/80 text-zinc-100 border border-white/5 backdrop-blur-sm' : 'bg-white/[0.02] text-zinc-200 border border-white/5 hover:bg-white/[0.04]'}`}>{msg.role === 'system' ? (<div className="font-mono text-[10px] text-emerald-500/50 flex items-center gap-2 select-none"><Activity size={10} /><span>SYSTEM_LOG: {msg.content}</span></div>) : (<Typewriter text={msg.content} speed={5} />)}</div>)}
                    </div>
                  </div>
                </div>
            ))}
            {loading && (<div className="flex justify-start sm:pl-16 pl-2"><div className="flex items-center space-x-1.5 h-8 px-4 rounded-full bg-white/5 border border-white/5 w-fit"><Loader2 size={14} className="animate-spin text-emerald-500/60" /><span className="ml-2 text-[10px] text-emerald-500/50 font-mono uppercase tracking-widest">Neural Processing</span></div></div>)}
            <div ref={messagesEndRef} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30 pointer-events-none flex justify-center bg-gradient-to-t from-black via-black to-transparent pt-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="w-full max-w-3xl pointer-events-auto relative group">
              {attachment && (<div className="absolute bottom-full mb-3 left-0 bg-[#0c0c0c] border border-emerald-500/20 p-2 rounded-xl flex items-center space-x-3 shadow-2xl w-full sm:w-auto"><div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0"><img src={attachment.preview} className="w-full h-full object-cover" /></div><div className="flex flex-col flex-1 min-w-0"><span className="text-[10px] text-emerald-400 font-mono uppercase">Vision Input</span><span className="text-[9px] text-zinc-600 truncate">{attachment.type}</span></div><button onClick={clearAttachment} className="p-2 hover:bg-white/10 rounded-full text-zinc-500 hover:text-red-400 cursor-pointer"><X size={16} /></button></div>)}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
              <div className="relative flex items-end bg-[#0c0c0c]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" /><button onClick={() => fileInputRef.current?.click()} className="ml-2 mb-2 p-3 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer active:bg-white/10 rounded-full"><Paperclip size={20} /></button>
                <textarea value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder="Enter directive..." className="w-full bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-600 py-4 px-2 focus:ring-0 resize-none h-auto min-h-[56px] max-h-32 custom-scrollbar leading-relaxed" rows={1} disabled={glitchActive || gravityActive} />
                <div className="mr-2 mb-2"><button onClick={handleSend} disabled={loading || (!input.trim() && !attachment && !pongActive) || glitchActive || gravityActive} className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${input.trim() || attachment ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:scale-95' : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}><Send size={18} className={input.trim() ? "ml-0.5" : ""} /></button></div>
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
