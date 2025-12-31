

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, FileItem, Folder, LogEntry, AppSettings, AppTheme, CloudConfig, Actor } from '../types';
import { db } from '../utils/db';
import { CloudService } from '../utils/cloudDb';
import { CLOUD_CONFIG } from '../config';

interface AppContextType {
  user: User | null;
  login: (provider: string, data?: any) => Promise<void>;
  register: (data: User) => Promise<void>;
  logout: () => void;
  files: FileItem[];
  folders: Folder[];
  addFile: (file: FileItem) => void;
  deleteFiles: (ids: string[]) => void;
  addFolder: (name: string, parentId: string | null) => void;
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  moveFiles: (fileIds: string[], targetFolderId: string | null) => void;
  t: (key: string) => string;
  // Community
  communityFiles: FileItem[];
  publishFile: (file: FileItem) => Promise<void>;
  syncCommunity: () => Promise<void>;
  // Actors
  actors: Actor[];
  addActor: (actor: Actor) => void;
  removeActor: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  theme: AppTheme.LIGHT,
  language: 'tr', // Default language Turkish based on preference
  webhookUrl: '',
  webhookEnabled: false,
  quotaLimit: 1000,
  quotaUsed: 0,
  cloudConfig: {
    baserowUrl: CLOUD_CONFIG.baserowUrl,
    baserowToken: CLOUD_CONFIG.baserowToken,
    baserowTableId: CLOUD_CONFIG.baserowTableId,
    minioEndpoint: CLOUD_CONFIG.minioEndpoint,
    minioAccessKey: CLOUD_CONFIG.minioAccessKey,
    minioSecretKey: CLOUD_CONFIG.minioSecretKey,
    minioBucket: CLOUD_CONFIG.minioBucket,
    ncaApiUrl: CLOUD_CONFIG.ncaApiUrl,
    ncaApiKey: CLOUD_CONFIG.ncaApiKey
  }
};

const dictionary: any = {
  en: {
    dashboard: 'Dashboard',
    imageStudio: 'Image Studio',
    videoStudio: 'Video Studio',
    audioStudio: 'Audio Studio',
    library: 'Library',
    aiAssistant: 'AI Assistant',
    settings: 'Settings',
    signOut: 'Sign Out',
    welcome: 'Welcome back',
    explore: 'Explore',
    
    // Auth
    login: 'Login',
    register: 'Register',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    fullNameLabel: 'Full Name',
    phoneLabel: 'Phone Number',
    apiKeyLabel: 'Gemini API Key (Optional)',
    signInBtn: 'Sign In',
    createAccountBtn: 'Create Account',
    orQuickAccess: 'Or Quick Access',
    manualKeyPlaceholder: 'Enter API Key directly...',
    devLoginBtn: 'Dev Login',
    registerSuccess: 'Registration successful! Please login.',
    configError: 'Server configuration missing. Check config.ts file.',
    opFailed: 'Operation failed',

    // Server Config
    serverConfigTitle: 'Server Configuration',
    serverConfigDesc: 'Connect to your Baserow instance to enable user authentication.',
    baserowUrlLabel: 'Baserow URL',
    baserowTokenLabel: 'Baserow Token',
    tableIdLabel: 'Table ID',
    minioConfig: 'MinIO Storage Config',
    endpointLabel: 'Endpoint',
    accessKeyLabel: 'Access Key',
    secretKeyLabel: 'Secret Key',
    bucketLabel: 'Bucket Name',
    ncaConfig: 'NCA Toolkit Configuration',
    ncaUrlLabel: 'NCA API URL',
    ncaKeyLabel: 'API Key (Required)',
    saveConnectBtn: 'Save & Connect',
    cancelBtn: 'Cancel',
    
    // Tools
    generate: 'Generate',
    edit: 'Edit',
    merge: 'Merge',
    imageSettings: 'Image Settings',
    promptLabel: 'Prompt',
    negPromptLabel: 'Negative Prompt',
    qualityLabel: 'Image Quality',
    aspectRatio: 'Aspect Ratio',
    creativityLabel: 'Creativity (Seed)',
    generating: 'Generating...',
    genBtn: 'Generate Image',
    uploadPlaceholder: 'Upload an image or select from library',
    instructionLabel: 'Edit Instruction',
    processing: 'Processing...',
    applyEdit: 'Apply Edit',
    mergePromptLabel: 'Merge Prompt',
    layers: 'Layers',
    noLayers: 'No videos added yet. Add from Library or Computer.',
    opacity: 'Opacity',
    blendMode: 'Blend Mode',
    mergeDown: 'Merge & Save to Library',
    download: 'Download',
    dreaming: 'Dreaming...',
    masterpiece: 'Your masterpiece will appear here',
    selectFromLib: 'Select from Library',
    enhancePrompt: 'Enhance Prompt',
    enhancing: 'Enhancing...',
    
    // Video
    videoGenTitle: 'Veo Video Generator',
    videoSettings: 'Video Settings',
    videoDescLabel: 'Video Prompt',
    duration: 'Duration',
    seconds: 'Seconds',
    resolution: 'Resolution',
    firstFrame: 'First Frame',
    lastFrame: 'Last Frame',
    clickToUpload: 'Click to Upload',
    backgroundMusic: 'Background Music',
    rendering: 'Rendering Video...',
    genVideoBtn: 'Generate Video',
    videoBeta: 'Video editing capabilities are currently in beta.',
    videoPreview: 'Generated video preview',
    masterAudio: 'Master Audio Track (Voiceover)',
    selectMasterAudio: 'Select Voiceover / Audio',
    lipSync: 'Lip Sync Studio',
    lipSyncDesc: 'Animate a character face video with speech audio.',
    faceVideo: 'Face Video (Source)',
    speechAudio: 'Speech Audio (Driver)',
    runLipSync: 'Animate Character',
    
    // Audio
    speechPrompt: 'Text to Speech',
    voice: 'Voice',
    generateSpeech: 'Generate Speech',
    saveAudio: 'Save Audio',
    cast: 'Cast / Actors',
    newActor: 'New Actor',
    actorName: 'Actor Name',
    createActor: 'Create Actor',
    sendToVideo: 'Use in Video Studio',
    
    // NCA & Timeline
    ncaEditor: 'NCA Editor',
    ncaPostProd: 'NCA Post-Production',
    timeline: 'Video Merge',
    montage: 'Montage Editor',
    addClip: 'Add Clip',
    renderTimeline: 'Merge Videos (Server)',
    renderingTimeline: 'Merging clips on server...',
    removeClip: 'Remove Clip',
    moveLeft: 'Move Up',
    moveRight: 'Move Down',
    selectCloudVideo: 'Select Cloud Video',
    selectOperation: 'Select Operation',
    transcribe: 'Transcribe',
    burnSubs: 'Burn Subs',
    trim: 'Trim',
    extractAudio: 'Extract Audio',
    compress: 'Compress',
    convert: 'Convert',
    outputFormat: 'Output Format',
    compressionQuality: 'Compression Quality',
    noParamsRequired: 'No extra parameters required.',
    runTask: 'Run Task',
    ncaResultPlaceholder: 'Result from NCA Toolkit will appear here.',
    
    // Image NCA
    ncaPro: 'NCA Pro',
    ncaServerTools: 'NCA Server Tools',
    removeBg: 'Remove BG',
    upscale: 'Upscale 4x',
    runWorkflow: 'Run NCA Workflow',
    ncaDesc: 'Advanced image processing tasks powered by NCA/n8n workflows.',
    selectCloudImage: 'Select Cloud Image',
    customWorkflow: 'Custom workflow params...',
    timelineDesc: 'Sequentially concatenate videos. Local files will be auto-uploaded before processing.',

    // Library
    myLibrary: 'My Library',
    uploadBtn: 'Upload',
    newFolder: 'New Folder',
    folderNamePlaceholder: 'Folder Name',
    createBtn: 'Create',
    selected: 'Selected',
    emptyFolder: 'This folder is empty',
    back: 'Back',
    imageProperties: 'Image Properties',
    fileName: 'File Name',
    created: 'Created',
    close: 'Close',
    shareCommunity: 'Share to Community',
    searchLib: 'Search files...',
    
    // Chat
    chatTitle: 'Creative Assistant',
    resetBtn: 'Reset Chat',
    chatPlaceholder: 'Ask for help with prompts...',
    
    // Settings
    genSettings: 'General Settings',
    dbSettings: 'Database Settings',
    languageLabel: 'Language',
    accountLabel: 'Account',
    webhookTitle: 'Webhook Settings',
    enabled: 'Enabled',
    disabled: 'Disabled',
    targetUrl: 'Target URL',
    saveConfig: 'Save Configuration',
    sysLogs: 'System Logs',
    noActivity: 'No recent activity',
    dbDesc: 'Configure external services for data persistence.',
    baserowConfig: 'Baserow Database Config',
    minioConfigTitle: 'MinIO Config',
    
    // Values
    square: 'Square (1:1)',
    landscape: 'Landscape (16:9)',
    portrait: 'Portrait (9:16)',
    wide: 'Wide (4:3)',
    tall: 'Tall (3:4)',
    normal: 'Normal',
    multiply: 'Multiply',
    screen: 'Screen',
    overlay: 'Overlay',
    darken: 'Darken',
    lighten: 'Lighten',
    
    // Dashboard
    totalFiles: 'Total Files',
    quotaUsed: 'Quota Used',
    successRate: 'Success Rate',
    usageAnalytics: 'Usage Analytics',
    recentActivity: 'Recent Activity',
    op: 'Operation'
  },
  tr: {
    dashboard: 'Kontrol Paneli',
    imageStudio: 'Görsel Stüdyosu',
    videoStudio: 'Video Stüdyosu',
    audioStudio: 'Ses Stüdyosu',
    library: 'Kütüphane',
    aiAssistant: 'Yapay Zeka Asistanı',
    settings: 'Ayarlar',
    signOut: 'Çıkış Yap',
    welcome: 'Hoşgeldiniz',
    explore: 'Keşfet',
    
    // Auth
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    emailLabel: 'E-posta Adresi',
    passwordLabel: 'Şifre',
    fullNameLabel: 'Ad Soyad',
    phoneLabel: 'Telefon Numarası',
    apiKeyLabel: 'Gemini API Anahtarı (İsteğe Bağlı)',
    signInBtn: 'Giriş Yap',
    createAccountBtn: 'Hesap Oluştur',
    orQuickAccess: 'Veya Hızlı Erişim',
    manualKeyPlaceholder: 'API Anahtarını doğrudan girin...',
    devLoginBtn: 'Geliştirici Girişi',
    registerSuccess: 'Kayıt başarılı! Lütfen giriş yapın.',
    configError: 'Sunucu ayarları eksik. Lütfen config.ts dosyasını kontrol edin.',
    opFailed: 'İşlem başarız',

    // Server Config
    serverConfigTitle: 'Sunucu Yapılandırması',
    serverConfigDesc: 'Kullanıcı kimlik doğrulamasını etkinleştirmek için Baserow örneğinize bağlanın.',
    baserowUrlLabel: 'Baserow URL',
    baserowTokenLabel: 'Baserow Token',
    tableIdLabel: 'Tablo ID',
    minioConfig: 'MinIO Depolama Ayarları',
    endpointLabel: 'Endpoint (Uç Nokta)',
    accessKeyLabel: 'Erişim Anahtarı (Access Key)',
    secretKeyLabel: 'Gizli Anahtar (Secret Key)',
    bucketLabel: 'Bucket Adı',
    ncaConfig: 'NCA Toolkit Yapılandırması',
    ncaUrlLabel: 'NCA API URL',
    ncaKeyLabel: 'API Key (Gerekli)',
    saveConnectBtn: 'Kaydet ve Bağlan',
    cancelBtn: 'İptal',
    
    // Tools
    generate: 'Oluştur',
    edit: 'Düzenle',
    merge: 'Birleştir',
    imageSettings: 'Görsel Ayarları',
    promptLabel: 'İstem (Prompt)',
    negPromptLabel: 'Negatif İstem',
    qualityLabel: 'Görsel Kalitesi',
    aspectRatio: 'En Boy Oranı',
    creativityLabel: 'Yaratıcılık (Seed)',
    generating: 'Oluşturuluyor...',
    genBtn: 'Görsel Oluştur',
    uploadPlaceholder: 'Bir resim yükleyin veya kütüphaneden seçin',
    instructionLabel: 'Düzenleme Talimatı',
    processing: 'İşleniyor...',
    applyEdit: 'Düzenlemeyi Uygula',
    mergePromptLabel: 'Birleştirme İstemi',
    layers: 'Katmanlar',
    noLayers: 'Henüz video eklenmedi. Kütüphaneden veya bilgisayardan ekleyin.',
    opacity: 'Opaklık',
    blendMode: 'Karışım Modu',
    mergeDown: 'Birleştir ve Kaydet',
    download: 'İndir',
    dreaming: 'Hayal ediliyor...',
    masterpiece: 'Eseriniz burada görünecek',
    selectFromLib: 'Kütüphaneden Seç',
    enhancePrompt: 'İstemi Geliştir',
    enhancing: 'Geliştiriliyor...',
    
    // Video
    videoGenTitle: 'Veo Video Oluşturucu',
    videoSettings: 'Video Ayarları',
    videoDescLabel: 'Video İstemi',
    duration: 'Süre',
    seconds: 'Saniye',
    resolution: 'Çözünürlük',
    firstFrame: 'İlk Kare',
    lastFrame: 'Son Kare',
    clickToUpload: 'Yüklemek için tıkla',
    backgroundMusic: 'Arkaplan Müziği',
    rendering: 'Video İşleniyor...',
    genVideoBtn: 'Video Oluştur',
    videoBeta: 'Video düzenleme özellikleri şu anda beta aşamasında.',
    videoPreview: 'Oluşturulan video önizlemesi',
    masterAudio: 'Ana Ses Kanalı (Dublaj/Müzik)',
    selectMasterAudio: 'Dublaj / Ses Seç',
    lipSync: 'Dudak Senkronizasyonu',
    lipSyncDesc: 'Bir karakter videosunu yapay zeka ile seçtiğiniz sese göre konuşturun.',
    faceVideo: 'Karakter Videosu',
    speechAudio: 'Konuşma Sesi',
    runLipSync: 'Karakteri Konuştur',
    
    // Audio
    speechPrompt: 'Metni Sese Çevir',
    voice: 'Ses',
    generateSpeech: 'Ses Oluştur',
    saveAudio: 'Sesi Kaydet',
    cast: 'Oyuncu Kadrosu',
    newActor: 'Yeni Oyuncu',
    actorName: 'Oyuncu Adı',
    createActor: 'Oyuncu Oluştur',
    sendToVideo: 'Video Stüdyosunda Kullan',
    
    // NCA & Timeline
    ncaEditor: 'NCA Editör',
    ncaPostProd: 'NCA Post-Prodüksiyon',
    timeline: 'Video Birleştirme',
    montage: 'Video Montaj',
    addClip: 'Klip Ekle',
    renderTimeline: 'Montajı Oluştur (Sunucu)',
    renderingTimeline: 'Sunucuda birleştiriliyor...',
    removeClip: 'Klibi Sil',
    moveLeft: 'Yukarı Taşı',
    moveRight: 'Aşağı Taşı',
    selectCloudVideo: 'Bulut Videosu Seç',
    selectOperation: 'İşlem Seç',
    transcribe: 'Deşifre Et (Transcribe)',
    burnSubs: 'Altyazı Göm',
    trim: 'Kırp',
    extractAudio: 'Ses Ayıkla',
    compress: 'Sıkıştır',
    convert: 'Dönüştür',
    outputFormat: 'Çıktı Formatı',
    compressionQuality: 'Sıkıştırma Kalitesi',
    noParamsRequired: 'Ek parametre gerekmez.',
    runTask: 'Görevi Çalıştır',
    ncaResultPlaceholder: 'NCA Toolkit sonucu burada görünecek.',

    // Image NCA
    ncaPro: 'NCA Pro',
    ncaServerTools: 'NCA Sunucu Araçları',
    removeBg: 'Arkaplan Sil',
    upscale: 'Yükselt (4x)',
    runWorkflow: 'NCA İş Akışını Çalıştır',
    ncaDesc: 'NCA/n8n iş akışları ile güçlendirilmiş gelişmiş görüntü işleme.',
    selectCloudImage: 'Bulut Resmi Seç',
    customWorkflow: 'Özel iş akışı parametreleri...',
    timelineDesc: 'Videoları sırayla birleştirin. Yerel dosyalar işlem öncesi otomatik buluta yüklenir.',
    
    // Library
    myLibrary: 'Kütüphanem',
    uploadBtn: 'Yükle',
    newFolder: 'Yeni Klasör',
    folderNamePlaceholder: 'Klasör Adı',
    createBtn: 'Oluştur',
    selected: 'Seçildi',
    emptyFolder: 'Bu klasör boş',
    back: 'Geri',
    imageProperties: 'Görsel Özellikleri',
    fileName: 'Dosya Adı',
    created: 'Oluşturulma',
    close: 'Kapat',
    shareCommunity: 'Toplulukta Paylaş',
    searchLib: 'Dosyalarda ara...',
    
    // Chat
    chatTitle: 'Yaratıcı Asistan',
    resetBtn: 'Sohbeti Sıfırla',
    chatPlaceholder: 'İstemler konusunda yardım isteyin...',
    
    // Settings
    genSettings: 'Genel Ayarlar',
    dbSettings: 'Veritabanı Ayarları',
    languageLabel: 'Dil',
    accountLabel: 'Hesap',
    webhookTitle: 'Webhook Ayarları',
    enabled: 'Aktif',
    disabled: 'Pasif',
    targetUrl: 'Hedef URL',
    saveConfig: 'Ayarları Kaydet',
    sysLogs: 'Sistem Kayıtları',
    noActivity: 'Son aktivite yok',
    dbDesc: 'Veri kalıcılığı için harici servisleri yapılandırın.',
    baserowConfig: 'Baserow Veritabanı Ayarları',
    minioConfigTitle: 'MinIO Ayarları',
    
    // Values
    square: 'Kare (1:1)',
    landscape: 'Yatay (16:9)',
    portrait: 'Dikey (9:16)',
    wide: 'Geniş (4:3)',
    tall: 'Uzun (3:4)',
    normal: 'Normal',
    multiply: 'Çoğalt (Multiply)',
    screen: 'Ekran (Screen)',
    overlay: 'Kaplama (Overlay)',
    darken: 'Koyulaştır',
    lighten: 'Aydınlat',
    
    // Dashboard
    totalFiles: 'Toplam Dosya',
    quotaUsed: 'Kota Kullanımı',
    successRate: 'Başarı Oranı',
    usageAnalytics: 'Kullanım Analizi',
    recentActivity: 'Son Aktiviteler',
    op: 'İşlem'
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [communityFiles, setCommunityFiles] = useState<FileItem[]>([]);
  
  // Actors State
  const [actors, setActors] = useState<Actor[]>(() => {
      const saved = localStorage.getItem('nebula_actors');
      return saved ? JSON.parse(saved) : [];
  });

  // Persist Actors
  useEffect(() => {
      localStorage.setItem('nebula_actors', JSON.stringify(actors));
  }, [actors]);

  const addActor = (actor: Actor) => {
      setActors(prev => [...prev, actor]);
  };

  const removeActor = (id: string) => {
      setActors(prev => prev.filter(a => a.id !== id));
  };

  // Initialize DB and load settings
  useEffect(() => {
    const initData = async () => {
      try {
        await db.init();
        
        // 1. Load LocalStorage Settings
        const localSettings = localStorage.getItem('nebula_settings');
        let initialSettings = { ...DEFAULT_SETTINGS }; // Use default config as base

        if (localSettings) {
             try {
                const parsed = JSON.parse(localSettings);
                // Merge Logic: Prioritize saved settings, fallback to config.ts
                // Note: We deliberately use || to prioritize user saved value, even if empty string (to allow clearing), 
                // but for critical configs we check if they are undefined in saved settings.
                initialSettings = { 
                    ...initialSettings, 
                    ...parsed, 
                    cloudConfig: { 
                        ...initialSettings.cloudConfig, 
                        // If user saved specific setting, use it. Otherwise fall back to config.ts
                        baserowUrl: parsed.cloudConfig?.baserowUrl ?? CLOUD_CONFIG.baserowUrl,
                        baserowToken: parsed.cloudConfig?.baserowToken ?? CLOUD_CONFIG.baserowToken,
                        baserowTableId: parsed.cloudConfig?.baserowTableId ?? CLOUD_CONFIG.baserowTableId,
                        
                        minioEndpoint: parsed.cloudConfig?.minioEndpoint ?? CLOUD_CONFIG.minioEndpoint,
                        minioAccessKey: parsed.cloudConfig?.minioAccessKey ?? CLOUD_CONFIG.minioAccessKey,
                        minioSecretKey: parsed.cloudConfig?.minioSecretKey ?? CLOUD_CONFIG.minioSecretKey,
                        minioBucket: parsed.cloudConfig?.minioBucket ?? CLOUD_CONFIG.minioBucket,
                        
                        ncaApiUrl: parsed.cloudConfig?.ncaApiUrl ?? CLOUD_CONFIG.ncaApiUrl,
                        ncaApiKey: parsed.cloudConfig?.ncaApiKey ?? CLOUD_CONFIG.ncaApiKey,
                    }
                };
             } catch(e) {}
        }

        setSettings(initialSettings);

        // Load other data from Local DB (IndexedDB)
        const [loadedFiles, loadedFolders, loadedLogs] = await Promise.all([
          db.getAllFiles(),
          db.getAllFolders(),
          db.getAllLogs()
        ]);
        
        setFolders(loadedFolders);
        setLogs(loadedLogs);
        
        // Initially set files from local DB. Cloud sync will filter/update this later.
        setFiles(loadedFiles);
        setDbReady(true);

      } catch (e) {
        console.error("Failed to initialize DB:", e);
      }
    };

    initData();

    // Check LocalStorage for user session
    const savedUser = localStorage.getItem('nebula_user');
    if (savedUser) {
       try {
         setUser(JSON.parse(savedUser));
       } catch (e) {
         localStorage.removeItem('nebula_user');
       }
    }
  }, []);

  // Sync with Cloud (Baserow) for Files - ONLY AFTER USER LOGIN
  useEffect(() => {
    const syncCloud = async () => {
        if (dbReady && user && user.provider === 'cloud' && settings.cloudConfig.baserowUrl) {
            const cloudService = new CloudService(settings.cloudConfig);
            if (cloudService.isConfigValid()) {
                // IMPORTANT: Pass user email to sync specific user's data
                const remoteFiles = await cloudService.syncFromBaserow(user.email);
                
                setFiles(prevLocalFiles => {
                     const unsyncedLocalFiles = prevLocalFiles.filter(f => !f.metadata?.baserowRowId);
                     // Combine: Remote Files + Unsynced Local Files
                     return [...remoteFiles, ...unsyncedLocalFiles];
                });

                // Also optionally persist remote files to local DB for offline access (cache)
                if (remoteFiles.length > 0) {
                   Promise.all(remoteFiles.map(f => db.addFile(f)))
                     .catch(err => console.error("Error persisting synced files", err));
                }
                
                // Sync Community Files
                syncCommunity();
            }
        }
    };
    syncCloud();
  }, [dbReady, settings.cloudConfig, user]);

  const syncCommunity = async () => {
      if (user && user.provider === 'cloud') {
          const cloudService = new CloudService(settings.cloudConfig);
          const publicFiles = await cloudService.syncCommunityFiles(user.email);
          setCommunityFiles(publicFiles);
      }
  };

  const publishFile = async (file: FileItem) => {
      if (!file.metadata?.baserowRowId || !user) return;
      
      // FIX: Ensure all metadata fields are preserved/added, especially ownerId and basic file info.
      // If we don't send these, Baserow might lose them if the previous sync returned incomplete metadata.
      const metaToSave = {
          ...file.metadata,
          ownerId: file.ownerId || user.email,
          url: file.url,
          type: file.type,
          name: file.name
      };
      
      const cloudService = new CloudService(settings.cloudConfig);
      await cloudService.publishToCommunity(file.id, file.metadata.baserowRowId, metaToSave);
      
      // Update local state to reflect isPublic immediately without reload
      setFiles(prev => prev.map(f => {
          if (f.id === file.id) {
              return { ...f, isPublic: true, metadata: { ...f.metadata, isPublic: true } };
          }
          return f;
      }));

      alert("File published to Community successfully!");
      syncCommunity();
  };

  // Apply theme
  useEffect(() => {
    const html = document.querySelector('html');
    if (html) {
      html.classList.remove('light', 'dark');
      html.classList.add(settings.theme);
    }
  }, [settings.theme]);

  // --- AUTH ACTIONS ---

  const login = async (provider: string, data?: any) => {
    if (provider === 'cloud') {
        const cloudService = new CloudService(settings.cloudConfig);
        const loggedInUser = await cloudService.loginUser(data.email, data.password);
        
        setUser(loggedInUser);
        localStorage.setItem('nebula_user', JSON.stringify(loggedInUser));

        // Apply Cloud Settings if available
        if (loggedInUser.savedSettings && Object.keys(loggedInUser.savedSettings).length > 0) {
             const mergedSettings = { ...settings, ...loggedInUser.savedSettings };
             mergedSettings.cloudConfig = settings.cloudConfig;
             
             setSettings(mergedSettings);
             db.saveSettings(mergedSettings);
             localStorage.setItem('nebula_settings', JSON.stringify(mergedSettings));
        }
    } else {
        const newUser: User = {
            id: 'user-' + Date.now(),
            name: provider === 'developer' ? 'Dev User' : 'Google User',
            email: 'user@nebula.ai',
            avatar: 'https://picsum.photos/100/100',
            provider: provider as any,
            apiKey: data, 
        };
        setUser(newUser);
        localStorage.setItem('nebula_user', JSON.stringify(newUser));
    }
  };

  const register = async (userData: User) => {
     const cloudService = new CloudService(settings.cloudConfig);
     await cloudService.registerUser(userData);
  };

  const logout = () => {
    setUser(null);
    setFiles([]); // Clear files from view on logout
    localStorage.removeItem('nebula_user');
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { 
        ...settings, 
        ...newSettings,
        // Ensure nested objects like cloudConfig are merged, not replaced if partial
        cloudConfig: {
            ...settings.cloudConfig,
            ...(newSettings.cloudConfig || {})
        }
    };
    
    setSettings(updated);
    
    // 1. Save Local
    localStorage.setItem('nebula_settings', JSON.stringify(updated));
    if (dbReady) await db.saveSettings(updated);

    // 2. Sync to User Profile (if logged in via Cloud)
    if (user && user.provider === 'cloud' && user.rowId) {
        const cloudService = new CloudService(updated.cloudConfig); 
        cloudService.updateUserProfile(user, updated).catch(e => console.error("Profile sync failed", e));
    }
  };

  // --- FILE ACTIONS ---

  const addFile = async (file: FileItem) => {
    // Add owner information
    let finalFile = { ...file, ownerId: user?.email };
    
    setFiles(prev => [finalFile, ...prev]);

    if (settings.cloudConfig.minioEndpoint) {
        const cloudService = new CloudService(settings.cloudConfig);
        if (cloudService.isConfigValid()) {
            const publicUrl = await cloudService.uploadToMinio(finalFile);
            if (publicUrl) {
                finalFile.url = publicUrl; 
                // Create Baserow Record with Ownership
                const baserowId = await cloudService.createBaserowRecord(finalFile, publicUrl);
                if (baserowId) {
                    finalFile.metadata = { ...finalFile.metadata, baserowRowId: baserowId };
                }
            }
        }
    }
    if (dbReady) await db.addFile(finalFile);
    // Update state if URL or Metadata changed during upload
    if (finalFile.url !== file.url || finalFile.metadata !== file.metadata) {
        setFiles(prev => prev.map(f => f.id === file.id ? finalFile : f));
    }
  };

  const deleteFiles = async (ids: string[]) => {
    const filesToDelete = files.filter(f => ids.includes(f.id));
    setFiles(prev => prev.filter(f => !ids.includes(f.id)));
    if (dbReady) await db.deleteFiles(ids);

    if (settings.cloudConfig.minioEndpoint) {
        const cloudService = new CloudService(settings.cloudConfig);
        if (cloudService.isConfigValid()) {
             for (const file of filesToDelete) {
                 if (file.metadata?.baserowRowId) {
                     await cloudService.deleteBaserowRecord(file.metadata.baserowRowId);
                 }
                 if (file.url.startsWith('http')) {
                     await cloudService.deleteFromMinio(file.url);
                 }
             }
        }
    }
  };

  const addFolder = async (name: string, parentId: string | null) => {
    const newFolder: Folder = { id: crypto.randomUUID(), name, parentId };
    setFolders(prev => [...prev, newFolder]);
    if (dbReady) await db.addFolder(newFolder);
  };

  const addLog = async (log: LogEntry) => {
    setLogs(prev => [log, ...prev]);
    if (dbReady) await db.addLog(log);
  };

  const moveFiles = async (fileIds: string[], targetFolderId: string | null) => {
    setFiles(prev => {
        const next = prev.map(f => {
            if (fileIds.includes(f.id)) {
                const updatedFile = { ...f, folderId: targetFolderId };
                if(dbReady) db.updateFile(updatedFile);
                return updatedFile;
            }
            return f;
        });
        return next;
    });
  };

  const t = (key: string) => {
    const lang = settings.language as 'en' | 'tr';
    const dict = dictionary as any; // Quick cast
    return dict[lang]?.[key] || key;
  };

  return (
    <AppContext.Provider value={{
      user, login, register, logout,
      files, folders, addFile, deleteFiles,
      addFolder, currentFolderId, setCurrentFolderId, moveFiles,
      logs, addLog,
      settings, updateSettings, t,
      communityFiles, publishFile, syncCommunity,
      actors, addActor, removeActor
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};