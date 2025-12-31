
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Card, Input } from '../components/UI';
import { Folder, FileImage, FileVideo, Trash2, Download, Grid, List, FolderPlus, ArrowLeft, X, Info, Upload, ImageOff, Share2, Play, Sparkles, Ruler, Disc, HardDrive, Hash, Type, Music, Search } from 'lucide-react';
import { FileItem } from '../types';

export default function Library() {
  const { files, folders, addFolder, currentFolderId, setCurrentFolderId, deleteFiles, moveFiles, addFile, publishFile, t } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items for current view
  // If search is active, ignore folders and show all matching files flat
  const isSearching = searchQuery.length > 0;
  
  const currentFiles = isSearching 
      ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : files.filter(f => f.folderId === currentFolderId);

  const currentFolders = isSearching
      ? [] 
      : folders.filter(f => f.parentId === currentFolderId);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleCreateFolder = () => {
    if (newFolderName) {
      addFolder(newFolderName, currentFolderId);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteSelected = () => {
    deleteFiles(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const downloadFile = (file: FileItem) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    const fileId = e.dataTransfer.getData("fileId");
    if(fileId) {
        moveFiles([fileId], targetFolderId);
    }
  };

  const handleFileClick = (file: FileItem) => {
    setPreviewFile(file);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          let type: 'image' | 'video' | 'audio' = 'image';
          if (file.type.startsWith('video')) type = 'video';
          else if (file.type.startsWith('audio')) type = 'audio';
          
          addFile({
              id: crypto.randomUUID(),
              name: file.name,
              type,
              url,
              createdAt: Date.now(),
              folderId: currentFolderId,
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Helper to estimate size from Base64
  const getFileSize = (url: string) => {
      if (url.startsWith('data:')) {
          const base64Length = url.length - (url.indexOf(',') + 1);
          const padding = ((url.charAt(url.length - 1) === '=') ? 1 : 0) + ((url.charAt(url.length - 2) === '=') ? 1 : 0);
          const fileSizeInBytes = (base64Length * 3 / 4) - padding;
          return (fileSizeInBytes / 1024).toFixed(1) + ' KB';
      }
      return 'Remote File';
  };

  return (
    <div className="h-full flex flex-col gap-6 relative">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4 flex-1">
           <div className="flex items-center gap-2">
               {currentFolderId && !isSearching && (
                   <Button variant="ghost" onClick={() => setCurrentFolderId(null)} icon={ArrowLeft}>{t('back')}</Button>
               )}
               <h2 className="text-lg font-semibold dark:text-white whitespace-nowrap">
                   {isSearching ? 'Search Results' : (currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : t('myLibrary'))}
               </h2>
           </div>
           
           {/* Search Bar */}
           <div className="relative max-w-md w-full ml-4 hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder={t('searchLib')} 
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14}/>
                    </button>
                )}
           </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-lg mr-4 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm text-primary-700 dark:text-primary-300 mr-3">{selectedIds.size} {t('selected')}</span>
              <button onClick={handleDeleteSelected} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={18}/></button>
            </div>
          )}

          <label className="cursor-pointer">
              <input type="file" className="hidden" accept="image/*,video/*,audio/*" multiple onChange={handleManualUpload} />
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium text-sm shadow-md hover:shadow-lg">
                  <Upload size={16} />
                  {t('uploadBtn')}
              </div>
          </label>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
          
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
             <Grid size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
             <List size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          {!isSearching && (
              <Button onClick={() => setIsCreatingFolder(true)} icon={FolderPlus} variant="secondary">{t('newFolder')}</Button>
          )}
        </div>
      </div>

      {isCreatingFolder && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-2 max-w-md">
            <Input placeholder={t('folderNamePlaceholder')} value={newFolderName} onChange={(e:any) => setNewFolderName(e.target.value)} />
            <Button onClick={handleCreateFolder}>{t('createBtn')}</Button>
            <Button variant="ghost" onClick={() => setIsCreatingFolder(false)}>{t('cancelBtn')}</Button>
        </div>
      )}

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto">
        {currentFiles.length === 0 && currentFolders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                {isSearching ? <Search className="w-16 h-16 mb-2 opacity-20"/> : <FolderOpenIcon className="w-16 h-16 mb-2 opacity-20"/>}
                <p>{isSearching ? 'No results found.' : t('emptyFolder')}</p>
            </div>
        ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" : "flex flex-col gap-2"}>
                
                {/* Folders */}
                {currentFolders.map(folder => (
                    <div 
                        key={folder.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, folder.id)}
                        onClick={() => setCurrentFolderId(folder.id)}
                        className={`
                            group cursor-pointer p-4 rounded-xl border transition-all
                            ${viewMode === 'grid' 
                                ? 'flex flex-col items-center justify-center aspect-square gap-2 bg-blue-50/50 hover:bg-blue-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-blue-100 dark:border-slate-700' 
                                : 'flex items-center gap-4 bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }
                        `}
                    >
                        <Folder size={viewMode === 'grid' ? 48 : 24} className="text-blue-500 fill-blue-500/20" />
                        <span className="text-sm font-medium dark:text-slate-300 truncate w-full text-center">{folder.name}</span>
                    </div>
                ))}

                {/* Files */}
                {currentFiles.map(file => (
                    <div 
                        key={file.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("fileId", file.id)}
                        onClick={() => handleFileClick(file)}
                        className={`
                            group relative rounded-xl border overflow-hidden transition-all cursor-pointer
                            ${selectedIds.has(file.id) ? 'ring-2 ring-primary-500 border-primary-500' : 'border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600'}
                            ${viewMode === 'grid' ? 'aspect-square bg-slate-100 dark:bg-slate-900' : 'flex items-center p-3 gap-4 bg-white dark:bg-slate-900 h-16'}
                        `}
                    >
                        {viewMode === 'grid' ? (
                            <>
                                {file.type === 'image' ? (
                                    <img 
                                        src={file.url} 
                                        className="w-full h-full object-cover" 
                                        alt={file.name} 
                                        onError={(e: any) => {
                                            e.target.onerror = null; 
                                            e.target.src = "https://placehold.co/400x400/1e293b/475569?text=Image+Error";
                                        }}
                                    />
                                ) : file.type === 'video' ? (
                                    <div className="relative w-full h-full bg-slate-950 group-hover:bg-black transition-colors">
                                        <video 
                                            src={`${file.url}#t=0.1`} 
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                            preload="metadata"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <Play size={24} className="text-white/70 fill-white/20 drop-shadow-md" />
                                        </div>
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white backdrop-blur-sm border border-white/10">
                                            VID
                                        </div>
                                    </div>
                                ) : (
                                    // Audio Preview
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-2">
                                            <Music size={24} className="text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-purple-600 rounded text-[10px] text-white backdrop-blur-sm">
                                            MP3
                                        </div>
                                    </div>
                                )}
                                <div className={`absolute top-2 right-2 p-1 rounded-full z-10 ${selectedIds.has(file.id) ? 'bg-primary-500 text-white' : 'bg-black/20 text-white hover:bg-black/40'} transition-colors`}
                                     onClick={(e) => toggleSelect(file.id, e)}>
                                   <div className={`w-4 h-4 rounded-full border-2 ${selectedIds.has(file.id) ? 'border-white bg-white' : 'border-white'}`}></div>
                                </div>
                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 pointer-events-none">
                                     <p className="text-xs text-white truncate font-medium">{file.name}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-10 h-10 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                                    {file.type === 'image' ? (
                                        <img 
                                            src={file.url} 
                                            className="w-full h-full object-cover"
                                            onError={(e: any) => {
                                                e.target.onerror = null; 
                                                e.target.src = "https://placehold.co/100x100/1e293b/475569?text=Error";
                                            }}
                                        />
                                    ) : file.type === 'video' ? (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                                            <FileVideo size={20}/>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                                            <Music size={20}/>
                                        </div>
                                    )}
                                </div>
                                <span className="flex-1 text-sm dark:text-slate-200 truncate">{file.name}</span>
                                <span className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</span>
                                <Button variant="ghost" onClick={(e:any) => {e.stopPropagation(); downloadFile(file)}}><Download size={16}/></Button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Full Screen Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <button 
             onClick={() => setPreviewFile(null)} 
             className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
           >
             <X size={24} />
           </button>

           <div className="w-full max-w-6xl h-full flex flex-col md:flex-row gap-6 overflow-hidden rounded-2xl">
              {/* Media Container */}
              <div className="flex-1 flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden relative">
                 {previewFile.type === 'image' ? (
                   <img src={previewFile.url} className="max-w-full max-h-full object-contain" />
                 ) : previewFile.type === 'video' ? (
                   <video src={previewFile.url} controls autoPlay className="max-w-full max-h-full" />
                 ) : (
                    // Audio Player UI
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 w-full max-w-md">
                        <div className="w-32 h-32 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 animate-pulse">
                            <Music size={48} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold dark:text-white mb-1">{previewFile.name}</h3>
                            <p className="text-slate-500 text-sm">Audio File</p>
                        </div>
                        <audio src={previewFile.url} controls className="w-full" autoPlay />
                    </div>
                 )}
              </div>

              {/* Sidebar Info */}
              <div className="w-full md:w-80 bg-white dark:bg-slate-900 p-6 flex flex-col rounded-2xl shadow-xl overflow-y-auto">
                 <h3 className="text-xl font-bold dark:text-white mb-6 flex items-center gap-2">
                   <Info size={20} className="text-primary-500"/> {t('imageProperties')}
                 </h3>
                 
                 <div className="space-y-6 flex-1">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('fileName')}</label>
                        <p className="text-sm dark:text-slate-300 break-all font-medium">{previewFile.name}</p>
                        </div>
                        <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">{t('created')}</label>
                        <p className="text-sm dark:text-slate-300">{new Date(previewFile.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Size</label>
                                <p className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded dark:text-slate-300 inline-flex items-center gap-1">
                                    <HardDrive size={10} /> {getFileSize(previewFile.url)}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">ID</label>
                                <code className="text-xs text-slate-400" title={previewFile.id}>#{previewFile.id.substring(0,6)}</code>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Section (if available) */}
                    {previewFile.metadata && (Object.keys(previewFile.metadata).length > 1 || previewFile.metadata.tool) && (
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                            <h4 className="text-sm font-bold dark:text-white flex items-center gap-2">
                                <Disc size={14} className="text-purple-500" /> Generation Details
                            </h4>
                            
                            {/* Tool & Model */}
                            {(previewFile.metadata.tool || previewFile.metadata.model) && (
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                    {previewFile.metadata.tool && (
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{previewFile.metadata.tool}</div>
                                    )}
                                    {previewFile.metadata.model && (
                                        <div className="text-[10px] font-mono text-slate-500 uppercase">{previewFile.metadata.model}</div>
                                    )}
                                </div>
                            )}

                            {/* Prompt */}
                            {previewFile.metadata.prompt && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                        <Sparkles size={12} /> Prompt
                                    </label>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                                        "{previewFile.metadata.prompt}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                 </div>

                 <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6 space-y-2">
                    <Button onClick={() => publishFile(previewFile)} className="w-full" variant="secondary" icon={Share2}>
                      {t('shareCommunity')}
                    </Button>
                    <Button onClick={() => downloadFile(previewFile)} className="w-full" icon={Download}>
                      {t('download')}
                    </Button>
                    <Button variant="ghost" onClick={() => setPreviewFile(null)} className="w-full">
                      {t('close')}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const FolderOpenIcon = ({className}:any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
)
