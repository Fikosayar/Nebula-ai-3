
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import { Button, Input, Select, Card } from '../components/UI';
import { Wand2, Layers, Eraser, Download, Image as LucideImage, Plus, Trash2, Library, X, Sparkles, Ban, Upload } from 'lucide-react';
import { ToolType, FileItem } from '../types';

export default function ImageTools({ initialTab }: { initialTab?: 'generate' | 'edit' | 'merge' }) {
  const { user, addFile, addLog, t, files } = useApp();
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'merge'>('generate');
  
  // Sync with Sidebar prop
  useEffect(() => {
      if (initialTab) {
          setActiveTab(initialTab);
      }
  }, [initialTab]);

  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  
  // Shared State
  const [imageSize, setImageSize] = useState('1K');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  
  // Generation State
  const [genPrompt, setGenPrompt] = useState('');
  const [negPrompt, setNegPrompt] = useState(''); // Negative Prompt
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Edit State
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  // AI Blend/Mix State (Replaces Manual Layers)
  const [mixImages, setMixImages] = useState<string[]>([]);
  const [mixPrompt, setMixPrompt] = useState('');
  const MAX_MIX_IMAGES = 10;
  
  // Library Modal State
  const [showLibModal, setShowLibModal] = useState(false);
  const [libSelectMode, setLibSelectMode] = useState<'edit' | 'mix'>('mix');

  const service = new GeminiService(user?.apiKey || '');

  const imageSizes = [
    { label: '1K', value: '1K' },
    { label: '2K', value: '2K' },
    { label: '4K', value: '4K' },
  ];

  const aspectRatios = [
    { label: t('square'), value: '1:1' },
    { label: t('landscape'), value: '16:9' },
    { label: t('portrait'), value: '9:16' },
    { label: t('wide'), value: '4:3' },
    { label: t('tall'), value: '3:4' },
  ];

  const handleEnhancePrompt = async (target: 'gen' | 'mix') => {
      const currentPrompt = target === 'gen' ? genPrompt : mixPrompt;
      if (!currentPrompt) return;
      setEnhancing(true);
      try {
          const enhanced = await service.enhancePrompt(currentPrompt);
          if (target === 'gen') setGenPrompt(enhanced);
          else setMixPrompt(enhanced);
      } catch(e) {
          console.error(e);
      } finally {
          setEnhancing(false);
      }
  };

  const checkAndSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (!user?.apiKey && aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await aiStudio.openSelectKey(); } catch (e) {
                console.warn("Key selection dialog closed or failed", e);
            }
        }
    }
  };

  // --- GENERATE ---
  const handleGenerate = async () => {
    if (!genPrompt) return;
    await checkAndSelectKey();

    setLoading(true);
    const startTime = Date.now();
    try {
      // Construct final prompt with Negative Prompt
      let finalPrompt = genPrompt;
      if (negPrompt.trim()) {
          finalPrompt += `\nNegative prompt: ${negPrompt.trim()}`;
      }

      const result = await service.generateImage(finalPrompt, imageSize, aspectRatio);
      setGeneratedImage(result);
      
      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tool: ToolType.IMAGE_GEN,
        status: 'success',
        details: `Generated: ${genPrompt.substring(0, 30)}...`,
        latencyMs: Date.now() - startTime
      });
      
      addFile({
        id: crypto.randomUUID(),
        name: `gen_${Date.now()}.png`,
        type: 'image',
        url: result,
        createdAt: Date.now(),
        folderId: null,
        metadata: {
            tool: 'Gemini Image Generator',
            prompt: finalPrompt,
            aspectRatio: aspectRatio,
            quality: imageSize,
            model: imageSize === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview'
        }
      });

    } catch (error: any) {
      if (error.message && (error.message.includes("Requested entity was not found") || error.message.includes("404"))) {
          const aiStudio = (window as any).aistudio;
          if (aiStudio && !user?.apiKey) {
               try { await aiStudio.openSelectKey(); } catch (keyErr) {}
               alert("Please select a valid paid API Key to proceed.");
               setLoading(false);
               return; 
          }
      }
      alert("Generation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- EDIT ---
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setEditPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!editPreview || !editPrompt) return;
    await checkAndSelectKey();

    setLoading(true);
    try {
      const result = await service.editImage(editPreview, editPrompt, imageSize, aspectRatio);
      setGeneratedImage(result);
       addFile({
        id: crypto.randomUUID(),
        name: `edit_${Date.now()}.png`,
        type: 'image',
        url: result,
        createdAt: Date.now(),
        folderId: null,
        metadata: {
            tool: 'Gemini Image Editor',
            prompt: editPrompt,
            aspectRatio: aspectRatio,
            quality: imageSize
        }
      });
    } catch (e: any) {
      if (e.message && (e.message.includes("Requested entity was not found") || e.message.includes("404"))) {
          const aiStudio = (window as any).aistudio;
          if (aiStudio && !user?.apiKey) {
               try { await aiStudio.openSelectKey(); } catch (keyErr) {}
               return; 
          }
      }
      alert("Edit failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MIX / BLEND (Replaces Manual Merge) ---
  
  const handleMixUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Limit to MAX_MIX_IMAGES
      if (mixImages.length >= MAX_MIX_IMAGES) {
          alert(`Maximum ${MAX_MIX_IMAGES} images allowed for blending.`);
          return;
      }
      const filesArr = Array.from(e.target.files);
      filesArr.forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setMixImages(prev => [...prev, ev.target!.result as string].slice(0, MAX_MIX_IMAGES));
              }
          };
          reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveMixImage = (index: number) => {
      setMixImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMix = async () => {
      if (mixImages.length < 2) {
          alert("Please add at least 2 images to blend.");
          return;
      }
      if (!mixPrompt) {
          alert("Please describe how you want to blend these images.");
          return;
      }
      
      await checkAndSelectKey();
      setLoading(true);
      const startTime = Date.now();

      try {
          const result = await service.mixImages(mixImages, mixPrompt, imageSize, aspectRatio);
          setGeneratedImage(result);

          addFile({
            id: crypto.randomUUID(),
            name: `blend_${Date.now()}.png`,
            type: 'image',
            url: result,
            createdAt: Date.now(),
            folderId: null,
            metadata: {
                tool: 'AI Image Blender',
                prompt: mixPrompt,
                sourceImageCount: mixImages.length,
                aspectRatio: aspectRatio,
                quality: imageSize
            }
          });
          
          addLog({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            tool: ToolType.IMAGE_GEN,
            status: 'success',
            details: `Blended ${mixImages.length} images`,
            latencyMs: Date.now() - startTime
          });

      } catch (e: any) {
          alert("Blending failed: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleLibrarySelect = (file: FileItem) => {
    if (file.type === 'image') {
       if (libSelectMode === 'mix') {
         if (mixImages.length < MAX_MIX_IMAGES) {
             setMixImages(prev => [...prev, file.url]);
         } else {
             alert(`Maximum ${MAX_MIX_IMAGES} images.`);
         }
       } else {
         setEditPreview(file.url);
       }
       setShowLibModal(false);
    }
  };

  const openLibraryModal = (mode: 'mix' | 'edit') => {
      setLibSelectMode(mode);
      setShowLibModal(true);
  };

  const renderSettings = () => (
    <div className="grid grid-cols-2 gap-4">
        <Select 
            label={t('qualityLabel')}
            options={imageSizes} 
            value={imageSize} 
            onChange={(e: any) => setImageSize(e.target.value)} 
        />
        <Select 
            label={t('aspectRatio')}
            options={aspectRatios}
            value={aspectRatio} 
            onChange={(e: any) => setAspectRatio(e.target.value)} 
        />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full relative">
      <div className="lg:col-span-4 space-y-6 flex flex-col h-full overflow-y-auto pr-2">
        {/* Mobile Tabs */}
        <div className="lg:hidden">
            <Card className="p-1 flex-shrink-0">
            <div className="flex">
                {[
                { id: 'generate', icon: Wand2, label: t('generate') },
                { id: 'edit', icon: Eraser, label: t('edit') },
                { id: 'merge', icon: Layers, label: 'AI Blend' }
                ].map((tab: any) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 rounded-lg transition-colors ${
                    activeTab === tab.id 
                    ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <tab.icon size={16} /> <span>{tab.label}</span>
                </button>
                ))}
            </div>
            </Card>
        </div>

        <Card className="p-6 space-y-6 flex-1 overflow-y-auto">
          {activeTab === 'generate' && (
            <>
              <h3 className="font-semibold dark:text-white flex items-center gap-2">
                  <Wand2 className="text-primary-500" size={18}/> {t('imageSettings')}
              </h3>
              
              <div className="space-y-1 relative">
                 <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('promptLabel')}</label>
                 <div className="relative">
                    <textarea 
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white min-h-[100px] text-sm resize-none"
                        placeholder="A futuristic city on mars..."
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                    />
                    <button 
                        onClick={() => handleEnhancePrompt('gen')} 
                        disabled={enhancing || !genPrompt}
                        className="absolute bottom-2 right-2 p-1.5 bg-white dark:bg-slate-700 text-purple-500 hover:text-purple-600 rounded shadow-sm border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                    >
                        <Sparkles size={14} className={enhancing ? 'animate-spin' : ''}/>
                    </button>
                 </div>
              </div>
              
              <Input 
                label={t('negPromptLabel')}
                placeholder="blurry, bad quality, distorted..."
                value={negPrompt} 
                onChange={(e: any) => setNegPrompt(e.target.value)}
              />

              {renderSettings()}

              <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-lg shadow-lg shadow-primary-500/20" icon={Wand2}>
                {loading ? t('generating') : t('genBtn')}
              </Button>
            </>
          )}

          {activeTab === 'edit' && (
            <>
              <h3 className="font-semibold dark:text-white flex items-center gap-2">
                  <Eraser className="text-blue-500" size={18}/> {t('edit')}
              </h3>
              
              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Input Image</label>
                 <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-primary-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                    {editPreview ? (
                        <div className="relative group">
                            <img src={editPreview} className="max-h-40 mx-auto rounded-lg shadow-sm" />
                            <button onClick={() => {setEditPreview(null); setEditImageFile(null)}} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full"><X size={14}/></button>
                        </div>
                    ) : (
                        <div className="py-4">
                            <div className="flex justify-center gap-3 mb-3">
                                <label className="cursor-pointer bg-white dark:bg-slate-800 text-primary-600 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-900/50 text-xs font-medium hover:bg-primary-50 transition-colors flex items-center gap-1">
                                    <Upload size={14}/> Upload
                                    <input type="file" className="hidden" accept="image/*" onChange={handleEditFileUpload} />
                                </label>
                                <button onClick={() => openLibraryModal('edit')} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1">
                                    <Library size={14}/> Library
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">Upload an image to transform</p>
                        </div>
                    )}
                 </div>
              </div>

              <Input 
                label={t('instructionLabel')}
                placeholder="Make the sky purple, remove the car..."
                value={editPrompt} 
                onChange={(e: any) => setEditPrompt(e.target.value)}
              />

              {renderSettings()}

              <Button onClick={handleEdit} disabled={loading || !editPreview} className="w-full" icon={Eraser}>
                {loading ? t('processing') : t('applyEdit')}
              </Button>
            </>
          )}

          {activeTab === 'merge' && (
            <>
               <h3 className="font-semibold dark:text-white flex items-center gap-2">
                  <Layers className="text-pink-500" size={18}/> AI Image Blender
               </h3>
               <p className="text-sm text-slate-500">Blend up to 10 images using AI.</p>
               
               <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {mixImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group">
                          <img src={img} className="w-full h-full object-cover" />
                          <button onClick={() => handleRemoveMixImage(idx)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                      </div>
                  ))}
                  {mixImages.length < MAX_MIX_IMAGES && (
                      <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <input type="file" className="hidden" accept="image/*" multiple onChange={handleMixUpload} />
                          <Plus size={24} className="text-slate-400 mb-1"/>
                          <span className="text-[10px] text-slate-500">Add Image</span>
                      </label>
                  )}
               </div>
               
               <div className="space-y-1">
                   <div className="flex justify-between">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('mergePromptLabel')}</label>
                        <Button variant="ghost" size="sm" onClick={() => openLibraryModal('mix')} icon={Library}>{t('selectFromLib')}</Button>
                   </div>
                   <div className="relative">
                        <textarea 
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white min-h-[80px] text-sm resize-none"
                            placeholder="Describe how to blend these images (e.g. 'Cyberpunk style collage', 'Double exposure')..."
                            value={mixPrompt}
                            onChange={(e) => setMixPrompt(e.target.value)}
                        />
                        <button 
                            onClick={() => handleEnhancePrompt('mix')} 
                            disabled={enhancing || !mixPrompt}
                            className="absolute bottom-2 right-2 p-1.5 bg-white dark:bg-slate-700 text-purple-500 hover:text-purple-600 rounded shadow-sm border border-slate-200 dark:border-slate-600 disabled:opacity-50"
                        >
                            <Sparkles size={14} className={enhancing ? 'animate-spin' : ''}/>
                        </button>
                   </div>
               </div>

               {renderSettings()}

               <Button onClick={handleMix} disabled={loading || mixImages.length < 2} className="w-full" icon={Layers}>
                   {loading ? t('dreaming') : 'Blend Images'}
               </Button>
            </>
          )}
        </Card>
      </div>

      <div className="lg:col-span-8 h-full">
         <Card className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 relative overflow-hidden p-6">
            {generatedImage ? (
                <div className="relative w-full h-full flex items-center justify-center group">
                    <img src={generatedImage} className="max-w-full max-h-full shadow-2xl rounded-lg object-contain" />
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <a href={generatedImage} download={`nebula_gen_${Date.now()}.png`} className="p-2 bg-white text-slate-900 rounded-full shadow-lg hover:bg-slate-100">
                             <Download size={20} />
                         </a>
                    </div>
                </div>
            ) : (
                <div className="text-center text-slate-400">
                    <LucideImage className="w-24 h-24 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">{t('masterpiece')}</h3>
                    <p className="text-sm opacity-60">Generated content will appear here.</p>
                </div>
            )}
            
            {loading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <div className="relative w-20 h-20 mb-4">
                        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
                        <Wand2 className="absolute inset-0 m-auto text-primary-500 animate-pulse" size={24}/>
                    </div>
                    <p className="text-lg font-medium bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent animate-pulse">{t('dreaming')}</p>
                    <p className="text-sm text-slate-500 mt-2">Connecting to Google Gemini...</p>
                </div>
            )}
         </Card>
      </div>

      {showLibModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
           <Card className="w-full max-w-2xl h-[600px] flex flex-col p-6 shadow-2xl relative">
              <button 
                onClick={() => setShowLibModal(false)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-bold mb-4 dark:text-white">{t('selectFromLib')}</h3>
              <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-4 p-2">
                 {files.filter(f => f.type === 'image').map(file => (
                   <div 
                     key={file.id} 
                     onClick={() => handleLibrarySelect(file)}
                     className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary-500 relative group"
                   >
                     <img src={file.url} className="w-full h-full object-cover" />
                     <div className="absolute bottom-0 w-full bg-black/60 p-1">
                       <p className="text-xs text-white truncate">{file.name}</p>
                     </div>
                   </div>
                 ))}
                 {files.filter(f => f.type === 'image').length === 0 && (
                   <div className="col-span-full text-center text-slate-500 py-12">
                     No images found in library.
                   </div>
                 )}
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}
