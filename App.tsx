

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ImageTools from './pages/ImageTools';
import VideoTools from './pages/VideoTools';
import AudioTools from './pages/AudioTools';
import Library from './pages/Library';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Community from './pages/Community';
import NCAToolkit from './pages/NCAToolkit';
import { FileItem } from './types';

const AppContent = () => {
  const { user } = useApp();
  
  // Initialize state from localStorage if available, otherwise default to 'dashboard'
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('nebula_last_page') || 'dashboard';
  });

  // State to control specific tabs within pages (e.g. Image Tools -> Edit)
  const [currentTab, setCurrentTab] = useState<string>('generate');

  // State for workflow handoff (Audio -> Video)
  const [incomingAudio, setIncomingAudio] = useState<FileItem | null>(null);

  // Save currentPage to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('nebula_last_page', currentPage);
    }
  }, [currentPage, user]);

  if (!user) {
    return <AuthPage />;
  }

  const handleAudioHandoff = (audioFile: FileItem) => {
      setIncomingAudio(audioFile);
      setCurrentPage('video-tools');
      setCurrentTab('captions'); // Will be redirected to lipsync inside VideoTools based on prop
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'image-tools': return <ImageTools initialTab={currentTab as 'generate' | 'edit' | 'merge'} />;
      case 'video-tools': return <VideoTools initialTab={currentTab as any} incomingAudio={incomingAudio} />;
      case 'audio-tools': return <AudioTools onSendToVideo={handleAudioHandoff} />;
      case 'library': return <Library />;
      case 'chat': return <Chat />;
      case 'settings': return <Settings />;
      case 'community': return <Community />;
      // case 'nca-toolkit': return <NCAToolkit />; // Optional developer route
      default: return <Dashboard />;
    }
  };

  return (
    <Layout 
      currentPage={currentPage} 
      setCurrentPage={setCurrentPage}
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
    >
      {renderPage()}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider children={<AppContent />} />
  );
}