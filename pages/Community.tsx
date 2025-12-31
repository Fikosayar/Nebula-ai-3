
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button } from '../components/UI';
import { Download, User as UserIcon, RefreshCw, X, Maximize2, ImageOff, Play, Film, Image as ImageIcon } from 'lucide-react';

interface CommunityItemProps {
    file: any;
    onClick: () => void;
}

// Sub-component for individual grid items to handle error state independently
const CommunityItem: React.FC<CommunityItemProps> = ({ file, onClick }) => {
    const [isError, setIsError] = useState(false);

    // Safety check for owner name to prevent JS crash if undefined
    const ownerName = file.ownerId ? (file.ownerId.includes('@') ? file.ownerId.split('@')[0] : file.ownerId) : 'Anonymous';

    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800">
            <div 
                className={`aspect-square relative overflow-hidden cursor-pointer ${isError ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}
                onClick={isError ? undefined : onClick}
            >
                {isError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <ImageOff size={24} className="mb-2 opacity-50 text-red-400"/>
                        <span className="text-xs text-red-500 font-medium">Media unavailable</span>
                        <p className="text-[10px] text-slate-400 mt-1 px-2 line-clamp-2">The file is missing or inaccessible.</p>
                    </div>
                ) : file.type === 'image' ? (
                    <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        onError={(e) => {
                            console.warn("Failed to load community image:", file.url);
                            setIsError(true);
                        }}
                    />
                ) : (
                    <div className="relative w-full h-full bg-black">
                        <video 
                            src={file.url} 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                            muted 
                            loop 
                            autoPlay 
                            playsInline 
                            onError={() => setIsError(true)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[1px]">
                            <Play size={48} className="text-white drop-shadow-xl fill-white/20" />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md border border-white/10">
                            <Film size={10} /> Video
                        </div>
                    </div>
                )}
                
                {!isError && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-4 transition-opacity opacity-0 group-hover:opacity-100">
                        <div className="flex justify-between items-end gap-2">
                        <div className="overflow-hidden">
                            <p className="text-white font-medium truncate drop-shadow-md text-sm">{file.name}</p>
                            <p className="text-xs text-slate-300 flex items-center gap-1 drop-shadow-md mt-0.5">
                                <UserIcon size={10} /> {ownerName}
                            </p>
                        </div>
                        <button className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm shrink-0 border border-white/20">
                            <Maximize2 size={14} />
                        </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function Community() {
  const { communityFiles, syncCommunity, t } = useApp();
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [modalError, setModalError] = useState(false);

  const handleOpenPreview = (file: any) => {
      setModalError(false); // Reset error state
      setPreviewFile(file);
  };

  const getOwnerBadge = (ownerId: string) => {
      const name = ownerId ? (ownerId.includes('@') ? ownerId.split('@')[0] : ownerId) : 'A';
      return name[0].toUpperCase();
  };

  const videoFiles = communityFiles.filter(f => f.type === 'video');
  const imageFiles = communityFiles.filter(f => f.type === 'image');

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">{t('explore')}</h2>
            <p className="text-slate-500 text-sm">Discover creations from the Nebula AI community.</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={syncCommunity}>Refresh</Button>
      </div>

      {communityFiles.length === 0 && (
          <div className="py-20 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <RefreshCw size={32} className="mx-auto mb-4 opacity-20"/>
              <p>No community posts found.</p>
              <p className="text-sm mt-2">Try clicking Refresh or share a file from your Library!</p>
          </div>
      )}

      {/* Videos Section */}
      {videoFiles.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Film className="text-primary-500" size={20} />
                  <h3 className="text-lg font-semibold dark:text-white">Community Videos</h3>
                  <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded-full">{videoFiles.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {videoFiles.map((file) => (
                    <CommunityItem key={file.id} file={file} onClick={() => handleOpenPreview(file)} />
                ))}
              </div>
          </div>
      )}

      {/* Images Section */}
      {imageFiles.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <ImageIcon className="text-purple-500" size={20} />
                  <h3 className="text-lg font-semibold dark:text-white">Community Images</h3>
                  <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full">{imageFiles.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {imageFiles.map((file) => (
                    <CommunityItem key={file.id} file={file} onClick={() => handleOpenPreview(file)} />
                ))}
              </div>
          </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in backdrop-blur-sm">
           <button onClick={() => setPreviewFile(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full z-50">
             <X size={24} />
           </button>
           <div className="max-w-5xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl">
              <div className="flex-1 bg-black/95 flex items-center justify-center overflow-hidden relative">
                 {modalError ? (
                     <div className="text-center text-slate-400 p-8">
                         <ImageOff size={48} className="mx-auto mb-4 opacity-50 text-red-400"/>
                         <p className="text-red-400">Could not load media preview.</p>
                         <p className="text-xs mt-2 text-slate-500">Possible Mixed Content (HTTP/HTTPS) block.</p>
                     </div>
                 ) : (
                     <>
                        {previewFile.type === 'image' ? (
                            <img 
                                src={previewFile.url} 
                                className="max-w-full max-h-[85vh] object-contain" 
                                onError={() => setModalError(true)}
                            />
                        ) : (
                            <video 
                                src={previewFile.url} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-[85vh] w-full" 
                                onError={() => setModalError(true)}
                            />
                        )}
                     </>
                 )}
              </div>
              <div className="w-full md:w-80 p-6 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                 <h3 className="font-bold text-lg dark:text-white mb-2 break-all">{previewFile.name}</h3>
                 <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {getOwnerBadge(previewFile.ownerId)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold dark:text-slate-200 truncate">{previewFile.ownerId || 'Anonymous'}</p>
                        <p className="text-xs text-slate-500">{new Date(previewFile.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>
                 
                 <div className="mt-auto space-y-3">
                    <Button className="w-full" icon={Download} onClick={() => {
                        const a = document.createElement('a');
                        a.href = previewFile.url;
                        a.download = previewFile.name;
                        a.click();
                    }}>Download Original</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
