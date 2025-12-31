
import { FileItem, Folder, LogEntry, AppSettings, User } from '../types';

const DB_NAME = 'NebulaAI_DB';
const DB_VERSION = 2;

export class LocalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("Database error: ", event);
        reject("Error opening database");
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Files Store
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('folderId', 'folderId', { unique: false });
        }

        // Folders Store
        if (!db.objectStoreNames.contains('folders')) {
          const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
          foldersStore.createIndex('parentId', 'parentId', { unique: false });
        }

        // Logs Store
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id' });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
    });
  }

  // Generic Helpers
  private getTransaction(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // --- FILES ---
  async getAllFiles(): Promise<FileItem[]> {
    return new Promise((resolve) => {
      const request = this.getTransaction('files').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addFile(file: FileItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getTransaction('files', 'readwrite').put(file);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFiles(ids: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['files'], 'readwrite');
      const store = tx.objectStore('files');
      
      ids.forEach(id => store.delete(id));
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async updateFile(file: FileItem): Promise<void> {
    return this.addFile(file); // Put acts as update if key exists
  }

  // --- FOLDERS ---
  async getAllFolders(): Promise<Folder[]> {
    return new Promise((resolve) => {
      const request = this.getTransaction('folders').getAll();
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async addFolder(folder: Folder): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getTransaction('folders', 'readwrite').put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- LOGS ---
  async getAllLogs(): Promise<LogEntry[]> {
    return new Promise((resolve) => {
      const request = this.getTransaction('logs').getAll();
      request.onsuccess = () => {
          // Sort logs by timestamp desc in memory (IndexedDB sorting is complex)
          const logs = request.result || [];
          logs.sort((a: LogEntry, b: LogEntry) => b.timestamp - a.timestamp);
          resolve(logs);
      };
    });
  }

  async addLog(log: LogEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.getTransaction('logs', 'readwrite').add(log);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AppSettings | null> {
    return new Promise((resolve) => {
      const request = this.getTransaction('settings').get('app-settings');
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      // We explicitly store settings with a fixed ID 'app-settings'
      // Use 'put' (update/insert) but the object needs the key.
      const settingsObj = { id: 'app-settings', ...settings };
      const request = this.getTransaction('settings', 'readwrite').put(settingsObj);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new LocalDB();
