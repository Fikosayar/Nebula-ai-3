

export enum AppTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum ToolType {
  IMAGE_GEN = 'IMAGE_GEN',
  IMAGE_EDIT = 'IMAGE_EDIT',
  VIDEO_GEN = 'VIDEO_GEN',
  VIDEO_EDIT = 'VIDEO_EDIT',
  CHAT = 'CHAT',
  NCA_PROCESS = 'NCA_PROCESS'
}

export enum NCATask {
  TRANSCRIBE = 'transcribe',
  CAPTION = 'caption', // Burn subtitles
  CONVERT = 'convert',
  CONVERT_MP3 = 'convert_mp3',
  TRIM = 'trim',
  CONCAT = 'concat',
  IMAGE_TO_VIDEO = 'image_to_video',
  THUMBNAIL = 'thumbnail',
  LIP_SYNC = 'lip_sync'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  apiKey?: string;
  provider: 'google' | 'apple' | 'github' | 'developer' | 'cloud';
  password?: string; // Only used during registration/login payload
  rowId?: number; // Baserow Row ID for updates
  savedSettings?: Partial<AppSettings>;
}

export interface Actor {
  id: string;
  name: string;
  voiceId: string; // 'Kore', 'Fenrir' etc.
  avatar?: string; // Optional visual representation
  description?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Base64 or Blob URL
  createdAt: number;
  folderId: string | null; // null = root
  metadata?: any;
  ownerId?: string; // Email of the user who owns this file
  isPublic?: boolean; // Shared to community
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  tool: ToolType;
  status: 'success' | 'error' | 'pending';
  details: string;
  latencyMs?: number;
}

export interface CloudConfig {
  baserowUrl: string;
  baserowToken: string;
  baserowTableId: string;
  minioEndpoint: string;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
  ncaApiUrl?: string; // New: Nebula Core Admin API URL
  ncaApiKey?: string; // New: Optional API Key for NCA
}

export interface AppSettings {
  theme: AppTheme;
  language: 'en' | 'tr';
  webhookUrl: string;
  webhookEnabled: boolean;
  quotaLimit: number; // Simulated limit
  quotaUsed: number;
  cloudConfig: CloudConfig;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video';
}

export interface Layer {
  id: string;
  src: string;
  name: string;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  x: number;
  y: number;
  scale: number;
}

// Add global window type extension for AI Studio
declare global {
  interface AIStudio {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}