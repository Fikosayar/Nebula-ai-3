
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import { NCAService } from '../services/ncaService';
import { CloudService } from '../utils/cloudDb';
import { Button, Select, Card } from '../components/UI';
import { 
    Video, Film, Upload, X, Sparkles, Library, Layers, 
    ArrowUp, ArrowDown, Trash2, Download, AlertCircle,
    Type, Music, Settings2, Smile, User, Camera, Repeat, 
    Clock, ArrowRightCircle, Play, Mic
} from 'lucide-react';
import { ToolType, FileItem } from '../types';

export default function VideoTools({ initialTab, incomingAudio }: { initialTab?: 'generate' | 'timeline' | 'captions' | 'audio' | 'utils' | 'lipsync', incomingAudio?: FileItem | null }) {
  const { user, addFile, addLog, t, files, settings } = useApp();
  const [activeTab, setActiveTab] = useState<'generate' | 'timeline' | 'captions' | 'audio' | 'utils' | 'lipsync'>('generate');
  
  // Sync with Sidebar prop
  useEffect(() => {
    if (initialTab) {
        setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle Incoming Audio Handoff from AudioTools
  useEffect(() => {
      if (incomingAudio) {
          setActiveTab('lipsync');
          setLsAudio(incomingAudio);
      }
  }, [incomingAudio]);

  // --- GENERATION STATE ---
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [aspect, setAspect] = useState('16:9');
  const [duration, setDuration] = useState('6');
  const [resolution, setResolution] = useState('720p');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);

  // --- TIMELINE STATE (Video Merge) ---
  const [timeline, setTimeline] = useState<FileItem[]>([]);
  const [masterAudio, setMasterAudio] = useState<FileItem | null>(null);
  
  // --- LIP SYNC STATE ---
  const [lsVideo, setLsVideo] = useState<FileItem | null>(null);
  const [lsAudio, setLsAudio] = useState<FileItem | null>(null);

  // --- SINGLE VIDEO PROC STATE (Captions, Audio, Utils) ---
  const [selectedVideo, setSelectedVideo] = useState<FileItem | null>(null);

  // --- SHARED UI STATE ---
  const [showLibModal, setShowLibModal] = useState(false);
  const [libSelectMode, setLibSelectMode] = useState<'start' | 'end' | 'timeline' | 'single' | 'audio' | 'ls_video' | 'ls_audio'>('start');
  const [videoError, setVideoError] = useState<string | null>(null);

  // --- PLAYER STATE ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loop, setLoop] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const geminiService = new GeminiService(user?.apiKey || '');
  const ncaService = new NCAService(settings.cloudConfig);
  const cloudService = new CloudService(settings.cloudConfig);

  const aspectRatios = [
    { label: t('landscape'), value: '16:9' },
    { label: t('portrait'), value: '9:16' },
  ];

  const resolutions = [
    { label: 'Standard HD (720p)', value: '720p' },
    { label: 'Full HD (1080p)', value: '1080p' },
  ];

  // Effect for playback speed
  useEffect(() => {
    if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // --- HANDLERS ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'start') setStartImage(ev.target?.result as string);
        else setEndImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const filesArr = Array.from(e.target.files);
          filesArr.forEach((file: File) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  if (ev.target?.result) {
                      const newFile: FileItem = {
                          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          name: file.name,
                          type: 'video',
                          url: ev.target.result as string,
                          createdAt: Date.now(),
                          folderId: null,
                          ownerId: user?.email,
                          metadata: { source: 'local_upload' }
                      };
                      setTimeline(prev => [...prev, newFile]);
                  }
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const openLibraryModal = (mode: 'start' | 'end' | 'timeline' | 'single' | 'audio' | 'ls_video' | 'ls_audio') => {
      setLibSelectMode(mode);
      setShowLibModal(true);
  };

  const handleLibrarySelect = (file: FileItem) => {
      if (file.type === 'image' && (libSelectMode === 'start' || libSelectMode === 'end')) {
          if (libSelectMode === 'start') setStartImage(file.url);
          else if (libSelectMode === 'end') setEndImage(file.url);
      } else if (file.type === 'video') {
          if (libSelectMode === 'timeline') setTimeline(prev => [...prev, file]);
          else if (libSelectMode === 'single') setSelectedVideo(file);
          else if (libSelectMode === 'ls_video') setLsVideo(file);
      } else if (file.type === 'audio') {
          if (libSelectMode === 'audio') setMasterAudio(file);
          else if (libSelectMode === 'ls_audio') setLsAudio(file);
      }
      setShowLibModal(false);
  };

  const handleEnhancePrompt = async () => {
      if (!prompt) return;
      setEnhancing(true);
      try {
          const enhanced = await geminiService.enhancePrompt(prompt);
          setPrompt(enhanced);
      } catch(e) {
          console.error(e);
      } finally {
          setEnhancing(false);
      }
  };

  const handleGenerate = async () => {
    if (!prompt && !startImage) {
        alert("Please provide a text prompt or a starting image.");
        return;
    }

    const aiStudio = (window as any).aistudio;
    if (!user?.apiKey && aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await aiStudio.openSelectKey(); } catch (e) {}
        }
    } else if (!user?.apiKey) {
        alert("Video generation requires a valid API Key.");
        return;
    }

    setLoading(true);
    setVideoError(null);
    setStatusMsg(t('rendering'));
    const startTime = Date.now();

    try {
      const uri = await geminiService.generateVideo(
          prompt, 
          parseInt(duration), 
          aspect, 
          resolution,
          startImage || undefined,
          endImage || undefined
      );
      
      setStatusMsg('Downloading video...');
      
      const effectiveKey = user?.apiKey || process.env.API_KEY || '';
      const fetchUrl = `${uri}&key=${effectiveKey}`;

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Failed to download generated video content");
      const blob = await response.blob();
      
      // const videoBlob = new Blob([blob], { type: 'video/mp4' });
      // const objectUrl = URL.createObjectURL(videoBlob);
      // setVideoUrl(objectUrl);
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      
      reader.onloadend = () => {
          const base64data = reader.result as string;
          setVideoUrl(base64data); // Set preview immediately
          addFile({
            id: crypto.randomUUID(),
            name: `veo_gen_${Date.now()}.mp4`,
            type: 'video',
            url: base64data,
            createdAt: Date.now(),
            folderId: null,
            metadata: {
                tool: 'Veo Video Generator',
                prompt: prompt,
                duration: `${duration}s`,
                resolution: resolution,
                aspectRatio: aspect,
                model: endImage ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview'
            }
          });
      };
      
      setLoading(false);
      setStatusMsg('');
      
      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tool: ToolType.VIDEO_GEN,
        status: 'success',
        details: `Generated video: ${prompt.substring(0,30)}...`,
        latencyMs: Date.now() - startTime
      });

    } catch (e: any) {
      setLoading(false);
      setStatusMsg('');
      alert("Video Error: " + e.message);
    }
  };

  const handleContinueScene = () => {
      if (!videoRef.current) return;
      try {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          
          // Draw current frame
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          
          setStartImage(dataUrl);
          setEndImage(null); // Clear end image for next segment
          setPrompt((prev) => `Continuing scene: ${prev}`); 
          setActiveTab('generate');
          
      } catch (e) {
          console.error("Frame capture failed", e);
          alert("Could not capture frame. If the video is hosted externally, this might be a CORS issue.");
      }
  };

  // --- TIMELINE / MERGE LOGIC ---
  const handleRenderMerge = async () => {
      if (timeline.length < 2) {
          alert("Please add at least 2 videos to the merge list.");
          return;
      }

      setLoading(true);
      setVideoError(null);
      setVideoUrl(null);

      try {
          // 1. Check for Local Files and Upload them
          const updatedTimeline = [...timeline];
          let needsUpload = false;

          for (let i = 0; i < updatedTimeline.length; i++) {
              if (updatedTimeline[i].url.startsWith('data:') || updatedTimeline[i].url.startsWith('blob:')) {
                  needsUpload = true;
                  setStatusMsg(`Uploading clip ${i + 1} of ${updatedTimeline.length} to cloud...`);
                  
                  if (!cloudService.isConfigValid()) {
                      throw new Error("Cloud Storage not configured. Cannot process local files.");
                  }

                  const publicUrl = await cloudService.uploadToMinio(updatedTimeline[i]);
                  if (publicUrl) {
                      updatedTimeline[i] = { ...updatedTimeline[i], url: publicUrl };
                      // Optionally save to Library for future use
                      addFile(updatedTimeline[i]); 
                  } else {
                      throw new Error(`Failed to upload clip ${i+1}. Check MinIO config.`);
                  }
              }
          }

          if (needsUpload) {
              setTimeline(updatedTimeline); // Update state with public URLs
          }

          // Upload Master Audio if Local
          let finalAudioUrl = masterAudio?.url;
          if (masterAudio && (masterAudio.url.startsWith('data:') || masterAudio.url.startsWith('blob:'))) {
              setStatusMsg("Uploading master audio to cloud...");
              if (!cloudService.isConfigValid()) throw new Error("Cloud Storage missing for audio.");
              
              const publicAudio = await cloudService.uploadToMinio(masterAudio);
              if (publicAudio) {
                  finalAudioUrl = publicAudio;
              } else {
                  throw new Error("Failed to upload audio.");
              }
          }

          // 2. Proceed with NCA Job
          const videoUrls = updatedTimeline.map(clip => clip.url);
          
          await runNCAJob(
            () => ncaService.concatenateVideos(videoUrls, finalAudioUrl),
            'montage'
          );

      } catch (e: any) {
          setLoading(false);
          setStatusMsg('');
          setVideoError(e.message);
      }
  };

  const handleRunLipSync = async () => {
      if (!lsVideo || !lsAudio) {
          alert("Please select both a video and an audio file.");
          return;
      }

      setLoading(true);
      setStatusMsg("Uploading assets for Lip Sync...");
      setVideoError(null);

      try {
          // 1. Ensure assets are on cloud
          let vUrl = lsVideo.url;
          if (vUrl.startsWith('data:') || vUrl.startsWith('blob:')) {
              if (!cloudService.isConfigValid()) throw new Error("Cloud storage required for Lip Sync.");
              const up = await cloudService.uploadToMinio(lsVideo);
              if (!up) throw new Error("Failed to upload video.");
              vUrl = up;
          }

          let aUrl = lsAudio.url;
          if (aUrl.startsWith('data:') || aUrl.startsWith('blob:')) {
              if (!cloudService.isConfigValid()) throw new Error("Cloud storage required for Lip Sync.");
              const up = await cloudService.uploadToMinio(lsAudio);
              if (!up) throw new Error("Failed to upload audio.");
              aUrl = up;
          }

          // 2. Run Job
          await runNCAJob(
              () => ncaService.runLipSync(vUrl, aUrl),
              'lipsync'
          );

      } catch (e: any) {
          setLoading(false);
          setStatusMsg('');
          setVideoError(e.message);
      }
  };

  // --- GENERIC NCA JOB RUNNER ---
  const runNCAJob = async (jobFn: () => Promise<string>, jobType: string) => {
      setStatusMsg(`${t('processing')} (${jobType})...`);
      const startTime = Date.now();

      try {
          const resultUrl = await jobFn();
          console.log(`${jobType} result URL:`, resultUrl);

          setStatusMsg('Downloading preview...');
          try {
              const response = await fetch(resultUrl);
              if (response.ok) {
                  const blob = await response.blob();
                  const videoBlob = new Blob([blob], { type: 'video/mp4' });
                  const objectUrl = URL.createObjectURL(videoBlob);
                  setVideoUrl(objectUrl);
              } else {
                  setVideoUrl(resultUrl);
              }
          } catch (fetchErr) {
              setVideoUrl(resultUrl);
          }
          
          addFile({
              id: crypto.randomUUID(),
              name: `${jobType}_nca_${Date.now()}.mp4`,
              type: 'video',
              url: resultUrl,
              createdAt: Date.now(),
              folderId: null,
              metadata: {
                  tool: 'NCA Toolkit',
                  jobType: jobType
              }
          });
          
          setLoading(false);
          setStatusMsg('');
          
          addLog({
             id: crypto.randomUUID(),
             timestamp: Date.now(),
             tool: ToolType.NCA_PROCESS,
             status: 'success',
             details: `NCA Job: ${jobType}`,
             latencyMs: Date.now() - startTime
          });

      } catch (e: any) {
          setLoading(false);
          setStatusMsg('');
          setVideoError(e.message);
      }
  };

  const removeFromTimeline = (idx: number) => {
      setTimeline(prev => prev.filter((_, i) => i !== idx));
  };

  const moveClip = (idx: number, direction: 'up' | 'down') => {
      const newTimeline = [...timeline];
      if (direction === 'up' && idx > 0) {
          [newTimeline[idx], newTimeline[idx - 1]] = [newTimeline[idx - 1], newTimeline[idx]];
      } else if (direction === 'down' && idx < newTimeline.length - 1) {
          [newTimeline[idx], newTimeline[idx + 1]] = [newTimeline[idx + 1], newTimeline[idx]];
      }
      setTimeline(newTimeline);
  };

  const renderUpdatingState = (title: string, Icon: React.ElementType) => (
      <div className="flex flex-col items-center justify-center h-[400px] text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4 animate-in zoom-in duration-300">
              <Icon size={48} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
              {title} Updating
          </h3>
          <p className="text-slate-500 max-w-xs">
              This feature is currently being updated. Please check back later.
          </p>
      </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full relative">
      <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 max-h-full">
        
        {/* Navigation is now handled by Layout Sidebar */}
        <div className="lg:hidden mb-4">
           {/* Mobile Tab Switcher */}
           <select 
             className="w-full p-2 rounded border bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
             value={activeTab}
             onChange={(e) => setActiveTab(e.target.value as any)}
           >
               <option value="generate">{t('videoGenTitle')}</option>
               <option value="timeline">{t('timeline')}</option>
               <option value="lipsync">{t('lipSync')}</option>
               <option value="captions">{t('burnSubs')}</option>
               <option value="audio">{t('extractAudio')}</option>
               <option value="utils">{t('utils') || 'Tools'}</option>
           </select>
        </div>

        <Card className="p-6 space-y-6">
           {activeTab === 'generate' && (
               <>
                   <div className="flex items-center gap-2 mb-4 text-primary-600 border-b border-slate-100 dark:border-slate-800 pb-2">
                     <Film size={20} /> <h3 className="font-bold">{t('videoGenTitle')}</h3>
                   </div>
                   
                   <div className="space-y-6">
                     {/* 1. PROMPT SECTION */}
                     <div className="space-y-2 relative">
                         <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                             <Sparkles size={14} className="text-purple-500"/> {t('videoDescLabel')}
                         </label>
                         <div className="relative group">
                            <textarea 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-slate-900 dark:text-white min-h-[100px] text-sm resize-none transition-all"
                                placeholder="Describe your video vision in detail..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <button 
                                onClick={handleEnhancePrompt} 
                                disabled={enhancing || !prompt}
                                className="absolute bottom-3 right-3 p-1.5 bg-white dark:bg-slate-700 text-purple-500 hover:text-purple-600 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 disabled:opacity-50 transition-colors"
                                title={t('enhancePrompt')}
                            >
                                <Sparkles size={16} className={enhancing ? 'animate-spin' : ''}/>
                            </button>
                         </div>
                     </div>

                     {/* 2. IMAGE FLOW SECTION */}
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Image Flow (Optional)</label>
                        <div className="flex items-center gap-4">
                            {/* Start Frame */}
                            <div className="flex-1 space-y-1">
                                <div className="text-xs text-center text-slate-500 mb-1">{t('firstFrame')}</div>
                                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden hover:border-primary-500 transition-colors group cursor-pointer">
                                    {startImage ? (
                                        <>
                                            <img src={startImage} className="w-full h-full object-cover" />
                                            <button onClick={() => setStartImage(null)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center" onClick={() => openLibraryModal('start')}>
                                            <Upload size={18} className="text-slate-400 mb-1"/>
                                            <span className="text-[10px] text-slate-500">{t('clickToUpload')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Flow Arrow */}
                            <div className="text-slate-300 dark:text-slate-700">
                                <ArrowRightCircle size={24} />
                            </div>

                            {/* End Frame */}
                            <div className="flex-1 space-y-1">
                                <div className="text-xs text-center text-slate-500 mb-1">{t('lastFrame')}</div>
                                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden hover:border-primary-500 transition-colors group cursor-pointer">
                                    {endImage ? (
                                        <>
                                            <img src={endImage} className="w-full h-full object-cover" />
                                            <button onClick={() => setEndImage(null)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center" onClick={() => openLibraryModal('end')}>
                                            <Upload size={18} className="text-slate-400 mb-1"/>
                                            <span className="text-[10px] text-slate-500">{t('clickToUpload')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* 3. SETTINGS GRID */}
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Configuration</label>
                        <div className="grid grid-cols-3 gap-3">
                            <Select 
                                label={t('resolution')}
                                options={resolutions}
                                value={resolution}
                                onChange={(e: any) => setResolution(e.target.value)}
                            />
                            <Select 
                                label={t('aspectRatio')}
                                options={aspectRatios} 
                                value={aspect} 
                                onChange={(e: any) => setAspect(e.target.value)}
                            />
                            <Select 
                                label={t('duration')}
                                options={[
                                {label: `4 ${t('seconds')}`, value: '4'},
                                {label: `6 ${t('seconds')}`, value: '6'},
                                {label: `8 ${t('seconds')}`, value: '8'},
                                ]} 
                                value={duration} 
                                onChange={(e: any) => setDuration(e.target.value)}
                            />
                        </div>
                     </div>

                     <div className="pt-2">
                         <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-lg shadow-lg shadow-primary-500/20" icon={Video}>
                            {loading ? t('rendering') : t('genVideoBtn')}
                         </Button>
                     </div>
                   </div>
               </>
           )}

           {activeTab === 'timeline' && (
               <>
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-semibold flex items-center gap-2"><Layers size={18}/> {t('timeline')}</h3>
                       <div className="flex gap-2">
                           <label className="cursor-pointer">
                               <input type="file" className="hidden" accept="video/*" multiple onChange={handleLocalVideoUpload} />
                               <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors">
                                   <Upload size={14}/> PC
                               </div>
                           </label>
                           <Button size="sm" variant="secondary" onClick={() => openLibraryModal('timeline')} icon={Library}>{t('addClip')}</Button>
                       </div>
                   </div>
                   
                   <p className="text-xs text-slate-500 mb-2">
                       {t('timelineDesc')}
                   </p>

                   {/* Master Audio Track Selection */}
                   <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl">
                       <div className="flex justify-between items-center mb-2">
                           <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                               <Music size={12}/> {t('masterAudio')}
                           </h4>
                           <button 
                               onClick={() => openLibraryModal('audio')} 
                               className="text-xs bg-white dark:bg-slate-800 text-purple-600 px-2 py-1 rounded border border-purple-200 dark:border-purple-800 hover:bg-purple-100"
                           >
                               {t('selectMasterAudio')}
                           </button>
                       </div>
                       
                       {masterAudio ? (
                           <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-purple-200 dark:border-purple-800/50">
                               <div className="flex items-center gap-2 overflow-hidden">
                                   <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-600">
                                       <Music size={14}/>
                                   </div>
                                   <span className="text-sm font-medium dark:text-slate-200 truncate">{masterAudio.name}</span>
                               </div>
                               <button onClick={() => setMasterAudio(null)} className="text-slate-400 hover:text-red-500 p-1">
                                   <X size={14}/>
                               </button>
                           </div>
                       ) : (
                           <div className="text-xs text-slate-400 text-center py-2 italic">
                               No audio selected.
                           </div>
                       )}
                   </div>

                   <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                       {timeline.length === 0 && (
                           <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400">
                               <Film size={32} className="mx-auto mb-3 opacity-50"/>
                               <p className="font-medium">{t('noLayers')}</p>
                           </div>
                       )}
                       {timeline.map((clip, idx) => (
                           <div key={clip.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl flex items-center gap-4 border border-slate-200 dark:border-slate-700 shadow-sm group hover:border-primary-200 dark:hover:border-primary-900 transition-colors">
                               <div className="flex flex-col items-center justify-center w-6 text-slate-400 font-mono text-xs">
                                   {idx + 1}
                               </div>
                               <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                                   <video src={clip.url} className="w-full h-full object-cover opacity-80" />
                               </div>
                               <div className="flex-1 min-w-0">
                                   <p className="text-sm font-bold dark:text-slate-200 truncate">{clip.name}</p>
                                   <p className="text-[10px] text-slate-500">{clip.url.startsWith('http') ? 'Cloud Ready' : 'Local File'}</p>
                               </div>
                               <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="flex gap-1">
                                      <button onClick={() => moveClip(idx, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"><ArrowUp size={14}/></button>
                                      <button onClick={() => moveClip(idx, 'down')} disabled={idx === timeline.length - 1} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"><ArrowDown size={14}/></button>
                                   </div>
                                   <button onClick={() => removeFromTimeline(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                               </div>
                           </div>
                       ))}
                   </div>

                   <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <Button onClick={handleRenderMerge} disabled={loading || timeline.length === 0} className="w-full h-12 text-lg" icon={Layers}>
                            {loading ? t('renderingTimeline') : t('renderTimeline')}
                        </Button>
                   </div>
               </>
           )}

           {activeTab === 'lipsync' && (
               <>
                   <div className="flex items-center gap-2 mb-4 text-primary-600 border-b border-slate-100 dark:border-slate-800 pb-2">
                     <Smile size={20} /> <h3 className="font-bold">{t('lipSync')}</h3>
                   </div>
                   <p className="text-sm text-slate-500 mb-6">
                       Animate a static face or existing video using vocal audio tracks. 
                   </p>

                   {/* FACE INPUT */}
                   <div className="space-y-3 mb-6">
                       <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <User size={16}/> Face Video / Image (Source)
                       </label>
                       <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                           {lsVideo ? (
                               <>
                                   <div className="w-16 h-16 bg-black rounded-lg overflow-hidden shrink-0">
                                       {lsVideo.type === 'video' ? <video src={lsVideo.url} className="w-full h-full object-cover" /> : <img src={lsVideo.url} className="w-full h-full object-cover" />}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <p className="text-sm font-semibold truncate dark:text-white">{lsVideo.name}</p>
                                       <p className="text-xs text-slate-500">{lsVideo.type.toUpperCase()}</p>
                                   </div>
                                   <button onClick={() => setLsVideo(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-500"><X size={16}/></button>
                               </>
                           ) : (
                               <Button variant="secondary" className="w-full h-16 border-dashed" onClick={() => openLibraryModal('ls_video')}>
                                   Select Source from Library
                               </Button>
                           )}
                       </div>
                   </div>

                   {/* AUDIO INPUT */}
                   <div className="space-y-3 mb-6">
                       <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                           <Mic size={16}/> Speech Audio (Driver)
                       </label>
                       <div className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                           {lsAudio ? (
                               <>
                                   <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center shrink-0 text-purple-600">
                                       <Music size={24}/>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <p className="text-sm font-semibold truncate dark:text-white">{lsAudio.name}</p>
                                       <p className="text-xs text-slate-500">AUDIO</p>
                                   </div>
                                   <button onClick={() => setLsAudio(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full text-slate-500"><X size={16}/></button>
                               </>
                           ) : (
                               <Button variant="secondary" className="w-full h-16 border-dashed" onClick={() => openLibraryModal('ls_audio')}>
                                   Select Audio from Library
                               </Button>
                           )}
                       </div>
                   </div>

                   <Button onClick={handleRunLipSync} disabled={loading || !lsVideo || !lsAudio} className="w-full h-12 text-lg" icon={Smile}>
                       {loading ? 'Animating...' : 'Run Lip Sync'}
                   </Button>
               </>
           )}

           {activeTab === 'captions' && renderUpdatingState(t('burnSubs'), Type)}
           {activeTab === 'audio' && renderUpdatingState(t('extractAudio'), Music)}
           {activeTab === 'utils' && renderUpdatingState(t('convert'), Settings2)}
           
           {loading && <p className="text-xs text-center text-primary-600 animate-pulse mt-2">{statusMsg}</p>}
           {videoError && (
               <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                   <AlertCircle size={16} />
                   <span>{videoError}</span>
               </div>
           )}
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full min-h-[500px] flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden shadow-2xl relative">
          {videoUrl ? (
            <div className="w-full h-full flex flex-col">
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    <video 
                        ref={videoRef}
                        key={videoUrl} 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop={loop}
                        crossOrigin="anonymous" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                            console.error("Video Playback Error:", e);
                            setVideoError("Could not play video. The file might be private or the format unsupported.");
                        }}
                    />
                </div>
                
                {/* Advanced Player Controls */}
                <div className="bg-slate-900 border-t border-slate-800 p-3 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setLoop(!loop)} 
                            className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${loop ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                            title="Toggle Loop"
                        >
                            <Repeat size={16} /> {loop ? 'Loop On' : 'Loop Off'}
                        </button>
                        
                        <div className="flex items-center gap-2 text-slate-400">
                            <Clock size={16} />
                            <select 
                                value={playbackSpeed}
                                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            >
                                <option value="0.5">0.5x Speed</option>
                                <option value="1">1.0x Speed</option>
                                <option value="1.5">1.5x Speed</option>
                                <option value="2">2.0x Speed</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            size="sm" 
                            variant="primary" 
                            className="bg-indigo-600 hover:bg-indigo-700 border-0"
                            onClick={handleContinueScene}
                            icon={Camera}
                        >
                            Continue Scene
                        </Button>
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            icon={Download} 
                            onClick={() => {
                                const a = document.createElement('a');
                                a.href = videoUrl!;
                                a.download = `nebula_video_${Date.now()}.mp4`;
                                a.click();
                            }}
                        >
                            Download
                        </Button>
                    </div>
                </div>
            </div>
          ) : (
             <div className="text-center text-slate-500">
                <Film className="w-20 h-20 mx-auto mb-4 opacity-20" />
                <p>{t('videoPreview')}</p>
             </div>
          )}
        </Card>
      </div>

      {/* Library Selection Modal */}
      {showLibModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
           <Card className="w-full max-w-2xl h-[600px] flex flex-col p-6 shadow-2xl relative">
              <button 
                onClick={() => setShowLibModal(false)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-bold mb-4 dark:text-white">
                  {t('selectFromLib')} 
                  <span className="text-sm font-normal text-slate-500 ml-2">
                      ({(libSelectMode === 'timeline' || libSelectMode === 'single' || libSelectMode === 'ls_video') ? t('selectCloudVideo') : (libSelectMode === 'audio' || libSelectMode === 'ls_audio') ? t('selectMasterAudio') : t('selectCloudImage')})
                  </span>
              </h3>
              <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                 {files.filter(f => {
                     if (libSelectMode === 'audio' || libSelectMode === 'ls_audio') return f.type === 'audio';
                     if (libSelectMode === 'timeline' || libSelectMode === 'single' || libSelectMode === 'ls_video') return f.type === 'video';
                     return f.type === 'image';
                 }).map(file => (
                   <div 
                     key={file.id} 
                     onClick={() => handleLibrarySelect(file)}
                     className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary-500 relative group"
                   >
                     {file.type === 'image' ? (
                         <img src={file.url} className="w-full h-full object-cover" />
                     ) : file.type === 'video' ? (
                         <div className="w-full h-full flex items-center justify-center bg-slate-900 relative">
                             <Video className="text-slate-500 w-8 h-8" />
                             <span className="absolute bottom-6 right-1 text-[10px] text-white bg-black/50 px-1 rounded">VID</span>
                         </div>
                     ) : (
                         <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                             <Music size={24} />
                             <span className="absolute bottom-2 right-1 text-[10px] text-white bg-black/50 px-1 rounded">MP3</span>
                         </div>
                     )}
                     <div className="absolute bottom-0 w-full bg-black/60 p-1">
                       <p className="text-xs text-white truncate">{file.name}</p>
                     </div>
                   </div>
                 ))}
                 {files.filter(f => {
                     if (libSelectMode === 'audio' || libSelectMode === 'ls_audio') return f.type === 'audio';
                     if (libSelectMode === 'timeline' || libSelectMode === 'single' || libSelectMode === 'ls_video') return f.type === 'video';
                     return f.type === 'image';
                 }).length === 0 && (
                   <div className="col-span-full text-center text-slate-500 py-12">
                     No matching files found.
                   </div>
                 )}
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
