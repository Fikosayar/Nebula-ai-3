

import { CloudConfig } from "../types";

export class NCAService {
  private apiUrl: string;
  private apiKey?: string;
  private minioEndpoint?: string;

  constructor(config: CloudConfig) {
    this.apiUrl = this.sanitizeUrl(config.ncaApiUrl || '');
    this.apiKey = config.ncaApiKey;
    this.minioEndpoint = config.minioEndpoint;
  }

  // Helper to remove trailing slashes, avoid /v1/v1 duplication, and ensure protocol
  private sanitizeUrl(url: string): string {
      let clean = url.trim();
      
      // Auto-add https if missing
      if (clean && !clean.startsWith('http')) {
          clean = 'https://' + clean;
      }

      clean = clean.replace(/\/+$/, ""); // Remove trailing slashes
      
      // Remove /v1 if user added it, we add it manually in methods
      if (clean.endsWith('/v1')) {
          clean = clean.substring(0, clean.length - 3); 
      }
      return clean;
  }

  /**
   * Fixes internal Docker URLs to Public URLs
   * Example: http://minio:9000/bucket/file.mp4 -> https://s3.sapanca360.com/bucket/file.mp4
   */
  private fixPublicUrl(internalUrl: string): string {
      if (!internalUrl || !internalUrl.startsWith('http')) return internalUrl;
      if (!this.minioEndpoint) return internalUrl;

      // Check if URL contains common internal docker hostnames
      const internalHosts = ['minio:9000', 'localhost:9000', '127.0.0.1:9000', 'nca-toolkit:8080'];
      
      try {
          const urlObj = new URL(internalUrl);
          
          if (internalHosts.some(host => urlObj.host.includes(host.split(':')[0]))) {
              // Construct new URL using the Public Endpoint
              let publicBase = this.minioEndpoint;
              if (!publicBase.startsWith('http')) publicBase = 'https://' + publicBase;
              publicBase = publicBase.replace(/\/$/, ""); // Remove trailing slash
              
              const fixed = `${publicBase}${urlObj.pathname}${urlObj.search}`;
              console.log(`Fixing URL: ${internalUrl} -> ${fixed}`);
              return fixed;
          }
      } catch (e) {
          console.error("URL parsing failed", e);
      }

      return internalUrl;
  }

  isConfigured(): boolean {
      return !!this.apiUrl;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) return { success: false, message: "URL Not Configured" };
    if (!this.apiKey) return { success: false, message: "API Key Missing" };

    const testUrl = `${this.apiUrl}/v1/toolkit/test`;

    try {
        console.log(`Testing connection to: ${testUrl} (GET)`);
        
        // Exact match to user's working curl command
        const response = await fetch(testUrl, {
            method: 'GET',
            mode: 'cors', // Now expected to work with Nginx Proxy
            headers: { 
                'x-api-key': this.apiKey, // Lowercase per curl example
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            return { 
                success: true, 
                message: `Connected Successfully! (Build: ${data.build_number || 'Unknown'})` 
            };
        } else {
            const text = await response.text().catch(() => "");
            return { success: false, message: `Server Error (${response.status}): ${text || response.statusText}` };
        }
    } catch (e: any) {
        console.error("Connection Test Error Log:", e);
        
        if (e.message.includes("Failed to fetch")) {
             return { 
                 success: false, 
                 message: "Connection Failed. Ensure 'nca-cors-proxy' container is running on your server." 
             };
        }
        return { success: false, message: e.message };
    }
  }

  /**
   * Helper to send HTTP requests to the NCA Toolkit server
   */
  private async sendRequest(endpoint: string, payload: any): Promise<string> {
      if (!this.isConfigured()) {
        throw new Error("NCA Toolkit API URL is not configured. Please go to Settings > Database.");
      }

      if (!this.apiKey) {
          throw new Error("NCA API Key is missing.");
      }

      const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      const fullUrl = `${this.apiUrl}${path}`;

      try {
        console.log(`NCA Toolkit Request: POST ${fullUrl}`, JSON.stringify(payload, null, 2));
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': this.apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`NCA API Error (${response.status}): ${errText}`);
        }

        const contentType = response.headers.get('content-type');
        
        // Handle JSON Response
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log("NCA Raw Response:", data);
            
            let resultUrl = "";

            // Normalize return values based on Official Docs
            if (data.response) resultUrl = data.response;
            else if (data.url) resultUrl = data.url;
            else if (data.file_url) resultUrl = data.file_url;
            else if (data.result) resultUrl = JSON.stringify(data.result);
            else resultUrl = JSON.stringify(data);

            // FIX: Replace internal Docker URL with Public URL
            return this.fixPublicUrl(resultUrl);

        } else {
            // Handle Binary Response (Direct file download)
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
      } catch (error: any) {
          console.error("NCA Request Failed:", error);
          if (error.message.includes("Failed to fetch")) {
             throw new Error(`Connection failed to ${fullUrl}. Check server reachability.`);
          }
          throw error;
      }
  }

  // --- VIDEO OPERATIONS ---

  /**
   * Concatenate Videos
   * Endpoint: /v1/video/concatenate
   * Payload: { "video_urls": [ {"video_url": "..."} ], "audio_url": "...", "id": "..." }
   */
  async concatenateVideos(videoUrls: string[], masterAudioUrl?: string): Promise<string> {
      const validUrls = videoUrls.filter(url => url.startsWith('http'));
      if (validUrls.length < 2) throw new Error("Need at least 2 valid cloud URLs (http/https).");
      
      const payload: any = {
          video_urls: validUrls.map(u => ({ video_url: u })),
          id: `concat_${Date.now()}`
      };

      if (masterAudioUrl && masterAudioUrl.startsWith('http')) {
          payload.audio_url = masterAudioUrl;
      }
      
      return this.sendRequest('/v1/video/concatenate', payload);
  }

  /**
   * Lip Sync (Character Animation)
   * Endpoint: /v1/video/lip-sync
   */
  async runLipSync(videoUrl: string, audioUrl: string): Promise<string> {
      if (!videoUrl.startsWith('http') || !audioUrl.startsWith('http')) {
          throw new Error("Both video and audio must be uploaded to cloud storage first.");
      }

      const payload = {
          video_url: videoUrl,
          audio_url: audioUrl,
          id: `lipsync_${Date.now()}`
      };

      return this.sendRequest('/v1/video/lip-sync', payload);
  }
}