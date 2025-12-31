
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import { Button, Input, Card } from '../components/UI';
import { Send, Bot, User as UserIcon, RotateCcw, Download, Maximize2, X } from 'lucide-react';
import { ChatMessage, ToolType } from '../types';

export default function Chat() {
  const { user, addLog, addFile, t } = useApp();
  // Initialize from localStorage if exists
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
      const saved = localStorage.getItem('nebula_chat_history');
      if (saved) {
          try { return JSON.parse(saved); } catch(e) {}
      }
      return [{ id: '1', role: 'model', text: 'Hello! I am your creative assistant. I can help you refine prompts or generate images directly here.', timestamp: Date.now() }];
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const service = new GeminiService(user?.apiKey || '');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Save to localStorage on change
    localStorage.setItem('nebula_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleReset = () => {
      const initial: ChatMessage[] = [{ id: '1', role: 'model', text: 'Hello! I am your creative assistant. I can help you refine prompts or generate images directly here.', timestamp: Date.now() }];
      setMessages(initial);
      localStorage.removeItem('nebula_chat_history');
  };

  const handleSaveToLibrary = (url: string) => {
      addFile({
          id: crypto.randomUUID(),
          name: `chat_gen_${Date.now()}.png`,
          type: 'image',
          url: url,
          createdAt: Date.now(),
          folderId: null
      });
      alert("Saved to Library!");
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    try {
      // Cast history to any to satisfy Gemini SDK Content[] type requirement
      const response = await service.chat(history as any, input);
      
      const botMsg: ChatMessage = { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: response.text, 
        timestamp: Date.now(),
        attachmentUrl: response.attachmentUrl,
        attachmentType: response.attachmentType
      };
      setMessages(prev => [...prev, botMsg]);
      
      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tool: ToolType.CHAT,
        status: 'success',
        details: response.attachmentUrl ? 'Chat generated image' : 'Chat interaction',
        latencyMs: 100 // Mock
      });

    } catch (e: any) {
       setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: `Error: ${e.message}`, timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col p-0 overflow-hidden relative">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2 dark:text-white"><Bot className="text-primary-500"/> {t('chatTitle')}</h3>
        <Button variant="ghost" icon={RotateCcw} onClick={handleReset} className="text-xs">{t('resetBtn')}</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white dark:bg-slate-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-green-100 text-green-600'}`}>
              {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 dark:bg-slate-900 dark:text-slate-200 rounded-tl-none'
                }`}>
                {msg.text}
                </div>
                
                {msg.attachmentUrl && msg.attachmentType === 'image' && (
                    <div className="relative group mt-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-sm">
                        <img src={msg.attachmentUrl} alt="Generated" className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => setPreviewImage(msg.attachmentUrl!)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm">
                                <Maximize2 size={18} />
                            </button>
                            <button onClick={() => handleSaveToLibrary(msg.attachmentUrl!)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm">
                                <Download size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><Bot size={16} className="text-green-600"/></div>
             <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg rounded-tl-none flex gap-1 items-center">
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
             </div>
           </div>
        )}
        <div ref={bottomRef}></div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-2">
          <Input 
             className="flex-1" 
             placeholder="Type a message or 'Generate a cat'..."
             value={input} 
             onChange={(e: any) => setInput(e.target.value)}
             onKeyPress={(e: any) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={loading} icon={Send} className="px-6"></Button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
              <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
              </button>
              <img src={previewImage} className="max-w-full max-h-full rounded shadow-2xl" />
          </div>
      )}
    </Card>
  );
}
