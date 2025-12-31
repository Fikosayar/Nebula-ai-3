

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import { Button, Card, Input } from '../components/UI';
import { Mic, Play, Download, Save, Sparkles, Volume2, Users, Plus, Trash2, StopCircle, Loader2, Music, User as UserIcon, Video } from 'lucide-react';
import { ToolType, Actor, FileItem } from '../types';

export default function AudioTools({ onSendToVideo }: { onSendToVideo?: (file: FileItem) => void }) {
  const { user, addFile, addLog, t, actors, addActor, removeActor } = useApp();
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Actor Creation State
  const [isCreatingActor, setIsCreatingActor] = useState(false);
  const [newActorName, setNewActorName] = useState('');
  const [newActorVoice, setNewActorVoice] = useState('Kore');

  // Preview State
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  
  // Audio Player Ref
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const service = new GeminiService(user?.apiKey || '');

  const voices = [
      { id: 'Kore', label: 'Balanced', desc: 'Neutral, versatile tone' },
      { id: 'Fenrir', label: 'Deep', desc: 'Authoritative, strong' },
      { id: 'Puck', label: 'Playful', desc: 'Energetic, expressive' },
      { id: 'Zephyr', label: 'Soft', desc: 'Calm, gentle, soothing' },
      { id: 'Charon', label: 'Formal', desc: 'Deep, serious, news-like' }
  ];

  const handleCreateActor = () => {
      if (newActorName) {
          addActor({
              id: crypto.randomUUID(),
              name: newActorName,
              voiceId: newActorVoice
          });
          setNewActorName('');
          setIsCreatingActor(false);
      }
  };

  const selectActor = (actor: Actor) => {
      setVoice(actor.voiceId);
      // Optional: Visual feedback or toast
  };

  const handleGenerate = async () => {
      if (!text) return;
      
      const aiStudio = (window as any).aistudio;
      if (!user?.apiKey && aiStudio) {
          const hasKey = await aiStudio.hasSelectedApiKey();
          if (!hasKey) {
              try { await aiStudio.openSelectKey(); } catch (e) {}
          }
      }

      setLoading(true);
      try {
          const resultUrl = await service.generateSpeech(text, voice);
          setAudioUrl(resultUrl);

          addLog({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              tool: ToolType.CHAT, 
              status: 'success',
              details: `Generated Speech: ${text.substring(0,20)}...`,
              latencyMs: 100 
          });

      } catch (e: any) {
          alert(`Error: ${e.message}`);
      } finally {
          setLoading(false);
      }
  };

  const createAudioFileItem = (): FileItem | null => {
      if (!audioUrl) return null;
      return {
          id: crypto.randomUUID(),
          name: `speech_${voice}_${Date.now()}.wav`,
          type: 'audio',
          url: audioUrl,
          createdAt: Date.now(),
          folderId: null,
          metadata: {
              tool: 'Gemini TTS',
              prompt: text,
              voice: voice,
              model: 'gemini-2.5-flash-preview-tts'
          }
      };
  };

  const handleSave = () => {
      const file = createAudioFileItem();
      if (file) {
          addFile(file);
          alert('Audio saved to Library!');
      }
  };

  const handleSendToVideo = () => {
      const file = createAudioFileItem();
      if (file && onSendToVideo) {
          // Auto-save first
          addFile(file);
          // Handoff
          onSendToVideo(file);
      }
  };

  // --- PERSISTENT CACHE LOGIC ---
  const getCachedVoice = (voiceId: string): string | null => {
      try {
          const storage = localStorage.getItem('nebula_voice_previews');
          if (storage) {
              const parsed = JSON.parse(storage);
              return parsed[voiceId] || null;
          }
      } catch (e) { console.error("Cache read error", e); }
      return null;
  };

  const setCachedVoice = (voiceId: string, dataUrl: string) => {
      try {
          const storage = localStorage.getItem('nebula_voice_previews');
          const parsed = storage ? JSON.parse(storage) : {};
          parsed[voiceId] = dataUrl;
          localStorage.setItem('nebula_voice_previews', JSON.stringify(parsed));
      } catch (e) { console.error("Cache write error", e); }
  };

  const handlePreviewVoice = async (voiceId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (previewPlaying === voiceId) {
          if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
              audioPlayerRef.current.currentTime = 0;
          }
          setPreviewPlaying(null);
          return;
      }

      if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          setPreviewPlaying(null);
      }

      const cachedUrl = getCachedVoice(voiceId);
      if (cachedUrl) {
          playAudio(cachedUrl, voiceId);
          return;
      }

      setPreviewLoading(voiceId);

      try {
          const aiStudio = (window as any).aistudio;
          if (!user?.apiKey && aiStudio) {
            const hasKey = await aiStudio.hasSelectedApiKey();
            if (!hasKey) {
                 try { await aiStudio.openSelectKey(); } catch (e) {}
            }
          }

          const sampleText = `Hello, I am ${voiceId}. Nice to meet you.`;
          const url = await service.generateSpeech(sampleText, voiceId);
          
          setCachedVoice(voiceId, url);
          playAudio(url, voiceId);

      } catch (e) {
          console.error("Preview failed", e);
      } finally {
          setPreviewLoading(null);
      }
  };

  const playAudio = (url: string, id: string) => {
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      setPreviewPlaying(id);
      audio.onended = () => setPreviewPlaying(null);
      audio.play().catch(e => console.error("Playback error", e));
  };

  const renderVoiceSelector = (selectedVoice: string, onSelect: (v: string) => void) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {voices.map((v) => (
              <div 
                  key={v.id}
                  onClick={() => onSelect(v.id)}
                  className={`relative p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md flex items-center justify-between group
                      ${selectedVoice === v.id 
                          ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 dark:bg-primary-900/20 dark:border-primary-500' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
                      }`}
              >
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${selectedVoice === v.id ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                          {previewPlaying === v.id ? (
                               <div className="flex gap-0.5 items-end h-3">
                                   <span className="w-1 bg-current animate-[bounce_1s_infinite] h-2"></span>
                                   <span className="w-1 bg-current animate-[bounce_1.2s_infinite] h-3"></span>
                                   <span className="w-1 bg-current animate-[bounce_0.8s_infinite] h-2"></span>
                               </div>
                          ) : (
                               <Music size={18} />
                          )}
                      </div>
                      <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate ${selectedVoice === v.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>
                              {v.id}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{v.label}</p>
                      </div>
                  </div>

                  <button 
                      onClick={(e) => handlePreviewVoice(v.id, e)}
                      disabled={previewLoading === v.id}
                      className={`p-2 rounded-full transition-all shrink-0
                          ${selectedVoice === v.id 
                              ? 'bg-white text-primary-600 hover:bg-primary-50 shadow-sm' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900'
                          }`}
                      title="Preview Voice"
                  >
                      {previewLoading === v.id ? (
                          <Loader2 size={16} className="animate-spin" />
                      ) : previewPlaying === v.id ? (
                          <StopCircle size={16} className="fill-current" />
                      ) : (
                          <Play size={16} className="fill-current ml-0.5" />
                      )}
                  </button>
              </div>
          ))}
      </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
        {/* Left Sidebar: Actor Management */}
        <div className="w-full md:w-80 flex flex-col gap-4 h-full overflow-hidden">
            <Card className="p-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2 dark:text-white"><Users size={18}/> {t('cast')}</h3>
                    <Button size="sm" variant="ghost" onClick={() => setIsCreatingActor(!isCreatingActor)} icon={Plus} />
                </div>
                
                {isCreatingActor && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 space-y-3 animate-in slide-in-from-top-2 border border-slate-200 dark:border-slate-700 shadow-lg relative z-10">
                        <Input placeholder={t('actorName')} value={newActorName} onChange={(e:any) => setNewActorName(e.target.value)} />
                        
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Voice</label>
                            <div className="max-h-40 overflow-y-auto pr-1">
                                {renderVoiceSelector(newActorVoice, setNewActorVoice)}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button size="sm" className="flex-1" onClick={handleCreateActor}>{t('createBtn')}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsCreatingActor(false)}>{t('cancelBtn')}</Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {actors.length === 0 && !isCreatingActor && (
                        <div className="text-center py-8 text-slate-400">
                            <Users size={32} className="mx-auto mb-2 opacity-20"/>
                            <p className="text-sm">No actors created.</p>
                            <p className="text-xs">Create specific characters to keep consistent voices.</p>
                        </div>
                    )}
                    {actors.map(actor => (
                        <div 
                            key={actor.id} 
                            onClick={() => selectActor(actor)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${voice === actor.voiceId ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 dark:bg-primary-900/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                    {actor.name[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-sm dark:text-white">{actor.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Volume2 size={10}/> {actor.voiceId}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeActor(actor.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-opacity"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* Main Content: Script & Generation */}
        <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-2 shrink-0">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                    <Mic size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">{t('audioStudio')}</h2>
                    <p className="text-sm text-slate-500">Professional Text-to-Speech Generation</p>
                </div>
            </div>

            <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pr-2 pb-6">
                <Card className="p-6 flex flex-col space-y-6">
                    <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-500"/> {t('speechPrompt')}
                        </label>
                        <textarea 
                            className="w-full flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-slate-900 dark:text-white resize-none text-base transition-all leading-relaxed"
                            placeholder="Enter script/dialogue here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="flex justify-end">
                            <span className="text-xs text-slate-400">{text.length} chars</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <UserIcon size={16} className="text-blue-500"/> Voice Selection
                        </label>
                        {renderVoiceSelector(voice, setVoice)}
                    </div>

                    <Button onClick={handleGenerate} disabled={loading || !text} className="h-12 text-lg shadow-lg shadow-primary-500/20" icon={Mic}>
                        {loading ? t('processing') : t('generateSpeech')}
                    </Button>
                </Card>

                {audioUrl && (
                    <Card className="p-6 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
                        
                        <div className="w-full max-w-lg flex flex-col items-center gap-6 relative z-10">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xl relative">
                                    <Volume2 size={32} />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 text-xs font-bold px-2 py-1 rounded-full shadow border border-slate-100 dark:border-slate-700">
                                    {voice}
                                </div>
                            </div>
                            
                            <div className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700">
                                 <audio src={audioUrl} controls className="w-full h-10" autoPlay />
                            </div>

                            <div className="flex gap-3 w-full">
                                <Button className="flex-1" variant="secondary" icon={Download} onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = audioUrl;
                                    a.download = `speech_${voice}_${Date.now()}.mp3`;
                                    a.click();
                                }}>{t('download')}</Button>
                                
                                {onSendToVideo && (
                                    <Button className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0" icon={Video} onClick={handleSendToVideo}>
                                        {t('sendToVideo')}
                                    </Button>
                                )}

                                <Button className="flex-1" icon={Save} onClick={handleSave}>
                                    {t('saveAudio')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
}