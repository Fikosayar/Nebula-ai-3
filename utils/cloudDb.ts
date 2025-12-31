
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { CloudConfig, FileItem, User, AppSettings } from "../types";

export class CloudService {
  private s3Client: S3Client | null = null;
  private config: CloudConfig;

  constructor(config: CloudConfig) {
    this.config = config;
    if (this.isConfigValid()) {
      this.initS3();
    }
  }

  isConfigValid(): boolean {
    const { baserowUrl, baserowToken, baserowTableId } = this.config;
    return !!(baserowUrl && baserowToken && baserowTableId);
  }

  private initS3() {
    try {
        if (!this.config.minioEndpoint) return;
        
        // Handle protocol in endpoint
        let endpoint = this.config.minioEndpoint;
        if (!endpoint.startsWith('http')) {
            endpoint = 'https://' + endpoint;
        }

        this.s3Client = new S3Client({
          region: "us-east-1", // MinIO default region
          endpoint: endpoint,
          credentials: {
            accessKeyId: this.config.minioAccessKey,
            secretAccessKey: this.config.minioSecretKey,
          },
          forcePathStyle: true, // Required for MinIO
        });
    } catch (e) {
        console.error("Failed to init S3 Client", e);
    }
  }

  // --- HELPER: Fix Internal URLs & Mixed Content ---
  private fixPublicUrl(url: string): string {
      if (!url) return '';
      
      const { minioEndpoint, minioBucket } = this.config;
      // If no public endpoint configured, we can't fix anything
      if (!minioEndpoint) return url;

      // 1. Determine Public Base URL
      let publicBase = minioEndpoint;
      if (!publicBase.startsWith('http')) {
          publicBase = 'https://' + publicBase; // Default to https
      }
      
      // Force HTTPS if the app is running on HTTPS (prevents Mixed Content)
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && publicBase.startsWith('http:')) {
          publicBase = publicBase.replace('http:', 'https:');
      }
      
      publicBase = publicBase.replace(/\/$/, ""); 

      // 2. Handle Relative URLs (e.g. /site-demo/nebula-assets/...)
      if (url.startsWith('/')) {
          return `${publicBase}${url}`;
      }

      // 3. Handle Absolute URLs
      if (url.startsWith('http')) {
          try {
              const urlObj = new URL(url);
              
              // STRATEGY A: Bucket Path Match (Most Aggressive & Accurate)
              // If the URL contains our bucket name, we trust the path but NOT the origin.
              // We replace the entire origin (http://internal-ip:9000) with our publicBase.
              if (minioBucket && urlObj.pathname.includes(`/${minioBucket}`)) {
                  // We use the pathname directly from the URL object which includes the bucket
                  return `${publicBase}${urlObj.pathname}${urlObj.search}`;
              }

              // STRATEGY B: Internal Hostname Match
              // If URL has known internal/docker IPs/hostnames, replace origin.
              const internalHosts = ['minio', 'localhost', '127.0.0.1', 'nca-toolkit', '172.', '10.', '192.168.'];
              const isInternal = internalHosts.some(h => urlObj.hostname.includes(h));

              if (isInternal) {
                   return `${publicBase}${urlObj.pathname}${urlObj.search}`;
              }

              // STRATEGY C: Protocol Upgrade (HTTP -> HTTPS)
              // If domain matches public base but protocol is HTTP, upgrade it.
              if (publicBase.startsWith('https:') && urlObj.protocol === 'http:') {
                   const publicObj = new URL(publicBase);
                   if (urlObj.hostname === publicObj.hostname) {
                       return url.replace('http:', 'https:');
                   }
              }

          } catch (e) {
              console.warn("URL Parse Error:", e);
          }
      }

      return url;
  }

  // --- AUTHENTICATION METHODS ---

  async registerUser(user: User): Promise<User> {
    if (!this.isConfigValid()) throw new Error("Sistem yapılandırma hatası: Sunucu bilgileri eksik (config.ts).");

    // 1. Check if user already exists
    const existing = await this.findUserByEmail(user.email);
    if (existing) {
        throw new Error("Bu e-posta adresi ile zaten bir kayıt mevcut. Lütfen giriş yapın.");
    }

    // 2. Create User Record
    const userData = {
        type: 'USER_PROFILE',
        email: user.email,
        password: user.password,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        apiKey: user.apiKey,
        settings: user.savedSettings || {}
    };

    const payload = {
        "Name": user.email, // Use email as the Name identifier
        "Notes": JSON.stringify(userData)
    };

    try {
        const response = await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/?user_field_names=true`, {
            method: "POST",
            headers: {
                "Authorization": `Token ${this.config.baserowToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Baserow Register Error:", errText);
            throw new Error(`Kayıt işlemi başarısız: Sunucu hatası (${response.status}).`);
        }

        const data = await response.json();
        return { ...user, rowId: data.id, password: '' };
    } catch (e: any) {
        throw new Error(e.message || "Kayıt sırasında bir ağ hatası oluştu.");
    }
  }

  async loginUser(email: string, password: string): Promise<User> {
      if (!this.isConfigValid()) throw new Error("Sistem yapılandırma hatası: Sunucu bilgileri eksik.");

      const userRecord = await this.findUserByEmail(email);
      
      if (!userRecord || !userRecord.metadata) {
          throw new Error("Bu e-posta adresi sistemde kayıtlı değil.");
      }

      if (userRecord.metadata.password !== password) {
          throw new Error("Girdiğiniz şifre yanlış.");
      }

      // Construct User object
      return {
          id: `user-${userRecord.id}`,
          rowId: userRecord.id,
          name: userRecord.metadata.name || 'User',
          email: userRecord.metadata.email,
          phone: userRecord.metadata.phone,
          avatar: userRecord.metadata.avatar || 'https://picsum.photos/100/100',
          apiKey: userRecord.metadata.apiKey,
          provider: 'cloud',
          savedSettings: userRecord.metadata.settings || {}
      };
  }

  async updateUserProfile(user: User, settings: AppSettings): Promise<void> {
      if (!this.isConfigValid() || !user.rowId) return;

      const existing = await this.findUserByEmail(user.email);
      if (!existing) return;

      const newMetadata = {
          ...existing.metadata,
          name: user.name,
          phone: user.phone,
          apiKey: user.apiKey,
          settings: settings
      };

      const payload = {
          "Notes": JSON.stringify(newMetadata)
      };

      await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/${user.rowId}/?user_field_names=true`, {
          method: "PATCH",
          headers: {
              "Authorization": `Token ${this.config.baserowToken}`,
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
      });
  }

  private async findUserByEmail(email: string): Promise<any | null> {
      try {
        const url = `${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/?user_field_names=true&search=${encodeURIComponent(email)}`;
        const response = await fetch(url, {
            headers: { "Authorization": `Token ${this.config.baserowToken}` }
        });

        if (response.status === 401 || response.status === 403) {
             throw new Error("Sunucu Yetkilendirme Hatası: Token geçersiz.");
        }
        if (response.status === 404) {
             throw new Error("Sunucu Hatası: Tablo bulunamadı (ID kontrol edin).");
        }
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        // Exact match check
        const row = data.results.find((r: any) => r.Name === email);
        if (!row) return null;

        // Parse Metadata
        if (row.Notes) {
            try {
                const meta = JSON.parse(row.Notes);
                if (meta.type === 'USER_PROFILE') {
                    return { id: row.id, metadata: meta };
                }
            } catch (e) { return null; }
        }
        return null;

      } catch (e: any) {
          console.error("Find User Error:", e);
          if (e.message.includes("Sunucu")) throw e; // Propagate config errors
          return null; // Return null for not found to behave as "user not exist"
      }
  }


  // --- FILE METHODS ---

  async uploadToMinio(file: FileItem): Promise<string | null> {
    if (!this.s3Client || !this.config.minioBucket) return null;

    // FIX: If file is already a remote URL (http/https), skip upload and return it as is.
    if (file.url.startsWith('http')) {
        return file.url;
    }

    try {
      // Modern way to convert DataURI to Blob (handles large files much better than atob)
      const res = await fetch(file.url);
      const blob = await res.blob();
      
      const key = `nebula-assets/${file.type}s/${file.id}_${file.name}`;
      
      const command = new PutObjectCommand({
        Bucket: this.config.minioBucket,
        Key: key,
        Body: blob,
        ContentType: blob.type,
        // Removed ACL: 'public-read' to avoid 403 errors on strict MinIO setups
      });

      await this.s3Client.send(command);

      // Construct Public URL
      let endpoint = this.config.minioEndpoint;
      if (!endpoint.startsWith('http')) endpoint = 'https://' + endpoint;
      endpoint = endpoint.replace(/\/$/, "");
      
      return `${endpoint}/${this.config.minioBucket}/${key}`;
    } catch (error) {
      console.warn("MinIO Upload Skipped (Local fallback):", error);
      // Return null so the app continues using the local (Base64) URL
      return null;
    }
  }

  async deleteFromMinio(publicUrl: string): Promise<void> {
      if (!this.s3Client || !this.config.minioBucket) return;
      try {
          const urlObj = new URL(publicUrl);
          const path = urlObj.pathname; 
          const bucketSegment = `/${this.config.minioBucket}/`;
          let key = path;
          
          if (path.startsWith(bucketSegment)) {
              key = path.substring(bucketSegment.length);
          } else if (path.startsWith('/')) {
              key = path.substring(1); 
          }

          if (!key || key === '/') return;

          const command = new DeleteObjectCommand({
              Bucket: this.config.minioBucket,
              Key: key
          });
          await this.s3Client.send(command);
      } catch (e) {
          console.error("MinIO Delete Error:", e);
      }
  }

  async createBaserowRecord(file: FileItem, publicUrl: string): Promise<number | null> {
    if (!this.isConfigValid()) return null;

    try {
      const metadata = {
          type: file.type, // 'image' or 'video'
          url: publicUrl,
          created: file.createdAt,
          fileId: file.id,
          ownerId: file.ownerId,
          isPublic: file.isPublic || false,
          name: file.name
      };

      const payload = {
        "Name": file.name,
        "Notes": JSON.stringify(metadata)
      };

      const response = await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/?user_field_names=true`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.config.baserowToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Baserow API Error: ${response.statusText}`);

      const data = await response.json();
      return data.id; 
    } catch (error) {
      console.error("Baserow Create Error:", error);
      return null;
    }
  }

  async deleteBaserowRecord(rowId: number): Promise<void> {
      if (!this.isConfigValid()) return;
      try {
          await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/${rowId}/`, {
            method: "DELETE",
            headers: { "Authorization": `Token ${this.config.baserowToken}` }
          });
      } catch (e) {
          console.error("Baserow Delete Error:", e);
      }
  }

  async syncFromBaserow(userEmail: string): Promise<FileItem[]> {
    if (!this.isConfigValid()) return [];

    try {
      const response = await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/?user_field_names=true&size=200`, {
         headers: { "Authorization": `Token ${this.config.baserowToken}` }
      });

      if (!response.ok) return [];

      const data = await response.json();
      const rows = data.results || [];

      return rows.map((row: any) => {
        let meta: any = {};
        if (row.Notes) {
            try {
                meta = JSON.parse(row.Notes);
            } catch (e) { return null; }
        }

        if (!meta || meta.type === 'USER_PROFILE') return null;

        // DATA ISOLATION LOGIC:
        // 1. If file has NO owner (legacy), EVERYONE can see it.
        if (!meta.ownerId) {
            // Allow legacy files
        } 
        // 2. If file HAS owner, check if it matches current user
        else if (meta.ownerId !== userEmail) {
            return null; // Hide other people's files
        }

        // Apply Fix Public URL logic here as well
        const rawUrl = meta.url || row.Url;
        const url = this.fixPublicUrl(rawUrl);
        
        if (!url) return null;

        return {
            id: meta.fileId || `bs_${row.id}`,
            name: row.Name || "Untitled",
            type: meta.type || 'image',
            url: url,
            createdAt: meta.created || Date.now(),
            folderId: null,
            // CRITICAL FIX: Preserve ALL metadata (including ownerId, type, etc.)
            // Previously we were only saving { baserowRowId: row.id } which caused data loss on update.
            metadata: { ...meta, baserowRowId: row.id }, 
            ownerId: meta.ownerId,
            isPublic: meta.isPublic || false
        };
      }).filter((item: FileItem | null) => item !== null) as FileItem[];

    } catch (error) {
      console.error("Baserow Sync Error:", error);
      return [];
    }
  }

  // --- COMMUNITY FEATURES ---

  async publishToCommunity(fileId: string, baserowRowId: number, currentMetadata: any): Promise<void> {
      if (!this.isConfigValid()) return;

      const newMetadata = { ...currentMetadata, isPublic: true };
      const payload = { "Notes": JSON.stringify(newMetadata) };

      await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/${baserowRowId}/?user_field_names=true`, {
          method: "PATCH",
          headers: {
              "Authorization": `Token ${this.config.baserowToken}`,
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
      });
  }

  async syncCommunityFiles(currentUserEmail: string): Promise<FileItem[]> {
      if (!this.isConfigValid()) return [];
      try {
          const response = await fetch(`${this.config.baserowUrl}/api/database/rows/table/${this.config.baserowTableId}/?user_field_names=true&size=200`, {
             headers: { "Authorization": `Token ${this.config.baserowToken}` }
          });
          if (!response.ok) return [];
          const data = await response.json();
          
          return data.results.map((row: any) => {
              let meta: any = null;
              try { 
                  if (row.Notes) {
                      meta = JSON.parse(row.Notes); 
                  }
              } catch(e) { return null; }
              
              if (!meta || meta.type === 'USER_PROFILE') return null;
              
              // Filter: Must be Public
              // FIX: Handle both boolean true and string "true"
              const isPublic = meta.isPublic === true || meta.isPublic === 'true';
              
              if (isPublic) {
                  // Apply URL Fix
                  const rawUrl = meta.url || row.Url;
                  const url = this.fixPublicUrl(rawUrl);

                  if (!url) return null;

                  return {
                      id: meta.fileId || `bs_${row.id}`,
                      name: row.Name || 'Untitled', // Handle missing name
                      type: meta.type || 'image',
                      url: url,
                      createdAt: meta.created || Date.now(),
                      folderId: null,
                      ownerId: meta.ownerId || 'Anonymous', // Handle missing owner
                      metadata: { ...meta, baserowRowId: row.id }, // Preserve metadata here too
                      isPublic: true
                  };
              }
              return null;
          }).filter((i:any) => i !== null) as FileItem[];
      } catch (e) {
          console.error("Community Sync Error:", e);
          return [];
      }
  }
}
