

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, Image, Video, FolderOpen, MessageSquare, Settings, 
  Menu, Moon, Sun, LogOut, ChevronLeft, Compass, ChevronDown, ChevronRight,
  Wand2, Eraser, Layers, Film, Type, Music, Settings2, Mic, Smile
} from 'lucide-react';
import { AppTheme } from '../types';

export default function Layout({ children, currentPage, setCurrentPage, currentTab, setCurrentTab }: any) {
  const { user, logout, settings, updateSettings, t } = useApp();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // State to track which menu groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['image-tools', 'video-tools']));

  const toggleGroup = (groupId: string) => {
      setExpandedGroups(prev => {
          const next = new Set(prev);
          if (next.has(groupId)) next.delete(groupId);
          else next.add(groupId);
          return next;
      });
      
      // If expanding a group and sidebar is closed, open sidebar
      if (!isSidebarOpen) setSidebarOpen(true);
  };

  const navStructure = [
    { 
        id: 'dashboard', 
        label: t('dashboard'), 
        icon: LayoutDashboard,
        type: 'link'
    },
    { 
        id: 'image-tools', 
        label: t('imageStudio'), 
        icon: Image,
        type: 'group',
        children: [
            { id: 'generate', label: t('generate'), icon: Wand2 },
            { id: 'edit', label: t('edit'), icon: Eraser },
            { id: 'merge', label: t('merge'), icon: Layers },
        ]
    },
    { 
        id: 'video-tools', 
        label: t('videoStudio'), 
        icon: Video,
        type: 'group',
        children: [
            { id: 'generate', label: t('videoGenTitle').split(' ')[0] + ' Generator', icon: Film }, // Shortened for menu
            { id: 'timeline', label: t('timeline'), icon: Layers },
            { id: 'lipsync', label: t('lipSync'), icon: Smile },
            { id: 'captions', label: t('burnSubs'), icon: Type },
            { id: 'audio', label: t('extractAudio'), icon: Music },
            { id: 'utils', label: t('convert'), icon: Settings2 },
        ]
    },
    {
        id: 'audio-tools',
        label: t('audioStudio'),
        icon: Mic,
        type: 'link'
    },
    { 
        id: 'library', 
        label: t('library'), 
        icon: FolderOpen,
        type: 'link'
    },
    { 
        id: 'community', 
        label: t('explore'), 
        icon: Compass,
        type: 'link'
    },
    { 
        id: 'chat', 
        label: t('aiAssistant'), 
        icon: MessageSquare,
        type: 'link'
    },
    { 
        id: 'settings', 
        label: t('settings'), 
        icon: Settings,
        type: 'link'
    },
  ];

  const handleNavClick = (item: any, subItem?: any) => {
      if (item.type === 'group') {
          if (subItem) {
              setCurrentPage(item.id);
              setCurrentTab(subItem.id);
          } else {
              // Clicking the parent header just toggles collapse
              toggleGroup(item.id);
          }
      } else {
          setCurrentPage(item.id);
      }
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === AppTheme.LIGHT ? AppTheme.DARK : AppTheme.LIGHT });
  };

  // Find active label for header
  const activeItem = navStructure.find(i => i.id === currentPage);
  const activeSubItem = activeItem?.children?.find((c: any) => c.id === currentTab);
  const headerTitle = activeSubItem ? `${activeItem?.label} / ${activeSubItem.label}` : activeItem?.label;

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-20`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 h-16">
          {isSidebarOpen && <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Nebula AI</h1>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {navStructure.map((item) => (
            <div key={item.id} className="mb-1">
                {/* Main Menu Item */}
                <button
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center w-full p-2.5 rounded-lg transition-colors group relative ${
                    currentPage === item.id && item.type !== 'group'
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon size={20} className="shrink-0" />
                  
                  {isSidebarOpen && (
                      <>
                        <span className="ml-3 font-medium flex-1 text-left truncate">{item.label}</span>
                        {item.type === 'group' && (
                            <span className="text-slate-400">
                                {expandedGroups.has(item.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                            </span>
                        )}
                      </>
                  )}
                  
                  {/* Tooltip for collapsed mode */}
                  {!isSidebarOpen && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                          {item.label}
                      </div>
                  )}
                </button>

                {/* Sub Menu Items (Dropdown) */}
                {item.type === 'group' && isSidebarOpen && expandedGroups.has(item.id) && (
                    <div className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 mt-1 space-y-1 animate-in slide-in-from-left-2 duration-200">
                        {item.children.map((sub: any) => (
                            <button
                                key={sub.id}
                                onClick={() => handleNavClick(item, sub)}
                                className={`flex items-center w-full p-2 rounded-md text-sm transition-colors ${
                                    currentPage === item.id && currentTab === sub.id
                                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/10 dark:text-primary-400 font-medium' 
                                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <sub.icon size={16} className="mr-2 opacity-70"/>
                                <span className="truncate">{sub.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
           {isSidebarOpen && (
             <div className="flex items-center gap-3 mb-4">
               <img src={user?.avatar} alt="User" className="w-8 h-8 rounded-full" />
               <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-medium truncate dark:text-white">{user?.name}</p>
                 <p className="text-xs text-slate-500 truncate">{user?.email}</p>
               </div>
             </div>
           )}
           <button onClick={logout} className="flex items-center w-full text-slate-500 hover:text-red-500 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
             <LogOut size={20} />
             {isSidebarOpen && <span className="ml-3 text-sm">{t('signOut')}</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white capitalize flex items-center gap-2">
            {headerTitle}
          </h2>
          <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
               {settings.theme === AppTheme.LIGHT ? <Moon size={20} /> : <Sun size={20} />}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {children}
        </div>
      </main>
    </div>
  );
}