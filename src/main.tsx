import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './index.css';

// --- SVG Icons ---
const Icons = {
  Home: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#BDFF50" : "#525252"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
  ),
  Check: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#BDFF50" : "#525252"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300"><path d="M12 22c5.523 0 10-10 10-10S17.523 2 12 2 2 12 2 22c0 5.523 4.477 10 10 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
  ),
  Bot: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#BDFF50" : "#525252"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M9 12v-1"></path><path d="M15 12v-1"></path></svg>
  ),
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  Camera: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Magic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 21h18M13 6.5l1.7 2.5 2.8.4-2 2 .5 2.8-2.5-1.3L11 14.2l.5-2.8-2-2 2.8-.4 1.7-2.5zM20 3l-2 2 2 2 2-2-2-2zM5 3l-2 2 2 2 2-2-2-2z"></path></svg>
};

// --- Confetti ---
const fireConfetti = () => {
  const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles: any[] = [];
  const colors = ['#BDFF50', '#ffffff', '#2ECC71', '#D4FF33'];
  for (let i = 0; i < 100; i++) particles.push({ x: window.innerWidth / 2, y: window.innerHeight / 1.5, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 1) * 20 - 5, size: Math.random() * 8 + 4, color: colors[Math.floor(Math.random() * colors.length)], life: 100 });
  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life--; p.size *= 0.96;
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    for(let i = particles.length - 1; i >= 0; i--) if(particles[i].life <= 0) particles.splice(i, 1);
    if (particles.length > 0) requestAnimationFrame(animate); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
};

// --- Components ---
interface Task { id: string; text: string; completed: boolean; isDeliverable?: boolean; }
interface CheckInLog { id: string; date: string; note: string; image?: string; }
interface ChatMessage { role: 'user' | 'model'; text: string; }

const PlanView = ({ tasks, setTasks }: { tasks: Task[], setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) => {
  const [newTask, setNewTask] = useState('');
  const [showAIPlanModal, setShowAIPlanModal] = useState(false);
  const [courseContext, setCourseContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([{ id: Math.random().toString(36).substr(2, 9), text: newTask, completed: false }, ...tasks]);
    setNewTask('');
  };

  const generateAIPlan = async () => {
    if (!courseContext.trim()) return;
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
      const result = await model.generateContent(`Generate a daily study plan for a Junior Accounting student based on: "${courseContext}". Return JSON with "tasks" (array of strings) and "weeklyDeliverable" (string).`);
      const data = JSON.parse(result.response.text());
      const newTasks: Task[] = [];
      if (data.weeklyDeliverable) newTasks.push({ id: Math.random().toString(36).substr(2, 9), text: `[周交付] ${data.weeklyDeliverable}`, completed: false, isDeliverable: true });
      if (data.tasks) data.tasks.forEach((t: string) => newTasks.push({ id: Math.random().toString(36).substr(2, 9), text: t, completed: false }));
      setTasks(prev => [...newTasks, ...prev]);
      setShowAIPlanModal(false); setCourseContext('');
    } catch (error) { alert("生成失败，请检查API Key"); } finally { setIsGenerating(false); }
  };

  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);

  return (
    <div className="flex flex-col h-full p-6 animate-slide-up relative">
      <div className="flex justify-between items-end mb-8">
        <div><h2 className="text-[#BDFF50] font-bold uppercase tracking-widest text-xs mb-2">Daily Goals</h2><h1 className="text-4xl font-bold text-white">每日计划</h1></div>
        <div className="relative w-14 h-14 flex items-center justify-center"><svg className="w-full h-full -rotate-90" viewBox="0 0 36 36"><path className="text-[#1C1C1E]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" /><path className="text-[#BDFF50] transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg><span className="absolute text-xs font-bold text-white">{progress}%</span></div>
      </div>
      <div className="relative mb-6 group shrink-0">
        <input type="text" placeholder="New Task..." className="w-full bg-[#1C1C1E] text-white h-14 pl-5 pr-12 rounded-2xl border border-white/5 focus:border-[#BDFF50]/50 transition-all" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
        <button onClick={addTask} className="absolute right-2 top-2 bottom-2 w-10 bg-[#BDFF50] rounded-xl flex items-center justify-center text-black"><Icons.Plus /></button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-32">
        {tasks.map((task) => (
          <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${task.isDeliverable ? 'bg-[#1C1C1E] border-[#BDFF50]/30' : 'bg-[#1C1C1E] border-white/5'} group`}>
            <button onClick={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-[#BDFF50] border-[#BDFF50]' : 'border-gray-600'}`}>{task.completed && <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 5 4.5 8.5 11 1"></polyline></svg>}</button>
            <div className="flex-1"><span className={task.completed ? 'text-gray-600 line-through' : 'text-gray-200'}>{task.text}</span></div>
            <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"><Icons.Trash /></button>
          </div>
        ))}
      </div>
      {showAIPlanModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center animate-pop">
           <div className="bg-[#1C1C1E] w-full md:w-[90%] md:rounded-3xl rounded-t-3xl p-6 shadow-2xl border border-white/10">
               <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">AI 智能定计划</h3><button onClick={() => setShowAIPlanModal(false)} className="p-2 text-white"><Icons.X /></button></div>
               <textarea className="w-full bg-[#121212] rounded-xl p-4 text-white min-h-[100px] border border-white/5 mb-4" placeholder="输入课程链接或书名..." value={courseContext} onChange={e => setCourseContext(e.target.value)}/>
               <button onClick={generateAIPlan} disabled={isGenerating || !courseContext.trim()} className="w-full py-4 bg-[#BDFF50] rounded-xl font-bold text-black">{isGenerating ? '生成中...' : '生成计划'}</button>
           </div>
        </div>
      )}
    </div>
  );
};

const CheckInView = ({ logs, setLogs }: { logs: CheckInLog[], setLogs: React.Dispatch<React.SetStateAction<CheckInLog[]>> }) => {
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setImage(reader.result as string); reader.readAsDataURL(file); } };
  const submitCheckIn = () => { if (!note.trim()) return; setLogs([{ id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), note, image: image || undefined }, ...logs]); setShowModal(false); setNote(''); setImage(null); fireConfetti(); };
  const hasCheckedInToday = logs.some(l => new Date(l.date).toLocaleDateString() === new Date().toLocaleDateString());

  return (
    <div className="flex flex-col h-full p-6 relative">
      <div className="flex justify-between items-center mb-4 animate-slide-up">
         <div><h2 className="text-[#BDFF50] font-bold uppercase tracking-widest text-xs mb-2">Streak</h2><h1 className="text-4xl font-bold text-white">打卡</h1></div>
         <div className="flex flex-col items-end"><span className="text-3xl font-bold text-white">{logs.length}</span><span className="text-xs text-gray-500 font-medium">DAYS TOTAL</span></div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative py-8">
        {!hasCheckedInToday ? (
           <button onClick={() => setShowModal(true)} className="relative group cursor-pointer">
             <div className="absolute inset-0 bg-[#BDFF50] rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse-slow"></div>
             <div className="w-48 h-48 bg-[#1C1C1E] rounded-full border border-[#333] flex flex-col items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-300 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5"></div><Icons.Check active={true} /><span className="mt-3 font-bold text-lg text-white tracking-wide group-hover:text-[#BDFF50] transition-colors">Check In</span>
             </div>
           </button>
        ) : (
          <div className="w-48 h-48 bg-[#BDFF50] rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(189,255,80,0.3)] animate-pop"><Icons.Check active={false} /><span className="mt-2 font-bold text-black text-lg">已完成</span></div>
        )}
      </div>
      <div className="h-1/3 overflow-y-auto no-scrollbar pb-24 space-y-4">
        {logs.slice(0, 10).map(log => (
           <div key={log.id} className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 flex gap-4 items-start">
              {log.image ? (<div className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${log.image})` }}></div>) : (<div className="w-16 h-16 rounded-lg bg-[#2C2C2E] flex items-center justify-center text-gray-500 text-xs shrink-0">No Img</div>)}
              <div><div className="text-xs text-[#BDFF50] mb-1">{new Date(log.date).toLocaleDateString()}</div><p className="text-gray-200 text-sm line-clamp-2">{log.note}</p></div>
           </div>
        ))}
      </div>
      {showModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center animate-pop">
          <div className="bg-[#1C1C1E] w-full md:w-[90%] md:rounded-3xl rounded-t-3xl p-6 shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white">今日交付</h3><button onClick={() => setShowModal(false)} className="p-2 text-white"><Icons.X /></button></div>
            <textarea className="w-full bg-[#121212] rounded-xl p-4 text-white min-h-[120px] border border-white/5 mb-4" placeholder="今天学习了什么..." value={note} onChange={e => setNote(e.target.value)}/>
            <div className="flex gap-3 mb-6">
              <div onClick={() => fileInputRef.current?.click()} className="flex-1 h-24 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2 cursor-pointer bg-[#121212]">{image ? (<img src={image} className="h-full w-full object-cover rounded-xl" />) : (<><Icons.Camera /><span className="text-xs">上传照片</span></>)}</div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
            <button onClick={submitCheckIn} disabled={!note.trim()} className="w-full py-4 bg-[#BDFF50] rounded-xl font-bold text-black">确认打卡</button>
          </div>
        </div>
      )}
    </div>
  );
};

const AIView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '你好！我是你的专属会计助教。' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input; setInput(''); setMessages(prev => [...prev, { role: 'user', text: userMsg }]); setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(userMsg);
      setMessages(prev => [...prev, { role: 'model', text: result.response.text() }]);
    } catch (e) { setMessages(prev => [...prev, { role: 'model', text: "网络开小差了，请重试。" }]); } finally { setIsLoading(false); }
  };
  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
      <div className="p-4 border-b border-white/5 bg-[#1C1C1E]/50 backdrop-blur text-center absolute top-0 left-0 right-0 z-20"><h1 className="font-bold text-white">AI Assistant</h1></div>
      <div className="flex-1 overflow-y-auto pt-20 pb-44 px-4 space-y-6">
        {messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[#BDFF50] text-black' : 'bg-[#1C1C1E] text-gray-200 border border-white/5'}`}>{m.text}</div></div>))}
        <div ref={endRef}></div>
      </div>
      <div className="absolute bottom-24 left-0 right-0 px-4 z-30">
        <div className="bg-[#1C1C1E]/90 backdrop-blur-md p-2 rounded-[2rem] border border-white/10 flex gap-2">
          <input className="flex-1 bg-transparent px-4 py-3 text-white focus:outline-none" placeholder="Ask me anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}/>
          <button onClick={send} disabled={!input.trim()} className="w-12 h-12 bg-[#BDFF50] rounded-full flex items-center justify-center text-black"><Icons.Send /></button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [tab, setTab] = useState('checkin'); 
  const [tasks, setTasks] = useState<Task[]>(() => { try { return JSON.parse(localStorage.getItem('tasks') || '[]'); } catch { return []; } });
  const [logs, setLogs] = useState<CheckInLog[]>(() => { try { return JSON.parse(localStorage.getItem('logs') || '[]'); } catch { return []; } });
  useEffect(() => localStorage.setItem('tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('logs', JSON.stringify(logs)), [logs]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#121212] text-white">
      {/* 关键修改：去掉 hidden，改用 Flex */}
      <div className="w-full h-screen md:h-[850px] md:w-[440px] bg-[#050505] md:rounded-[40px] md:border-[8px] md:border-[#1C1C1E] flex flex-col relative shadow-2xl">
        <main className="flex-1 overflow-hidden relative">
          {tab === 'plan' && <PlanView tasks={tasks} setTasks={setTasks} />}
          {tab === 'checkin' && <CheckInView logs={logs} setLogs={setLogs} />}
          {tab === 'ai' && <AIView />}
        </main>
        
        {/* 关键修改：导航栏使用 absolute 定位，并提高 Z-Index */}
        <nav className="absolute bottom-6 left-6 right-6 h-20 bg-[#1C1C1E]/95 backdrop-blur-xl rounded-3xl border border-white/10 flex justify-around items-center z-50 shadow-2xl">
          <button onClick={() => setTab('plan')} className="flex flex-col items-center gap-1 w-16"><Icons.Home active={tab === 'plan'} /><span className={`text-[10px] font-bold uppercase tracking-wider ${tab === 'plan' ? 'text-[#BDFF50]' : 'text-gray-500'}`}>Plan</span></button>
          <div className="relative -top-6"><button onClick={() => setTab('checkin')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${tab === 'checkin' ? 'bg-[#BDFF50] text-black scale-110 ring-4 ring-[#050505]' : 'bg-[#2C2C2E] text-gray-400 border border-white/10'}`}><Icons.Check active={tab === 'checkin'} /></button></div>
          <button onClick={() => setTab('ai')} className="flex flex-col items-center gap-1 w-16"><Icons.Bot active={tab === 'ai'} /><span className={`text-[10px] font-bold uppercase tracking-wider ${tab === 'ai' ? 'text-[#BDFF50]' : 'text-gray-500'}`}>AI Tutor</span></button>
        </nav>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);