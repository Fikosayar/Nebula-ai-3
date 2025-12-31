
import { GoogleGenAI, Type, Content, Modality } from "@google/genai";

export class GeminiService {
  private client: GoogleGenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Prioritize the explicitly passed apiKey (Developer Login / Manual Entry)
    // Fallback to process.env.API_KEY for managed environments (AI Studio / Auto-Detected Project)
    // Note: When using window.aistudio.openSelectKey(), the selected key is often injected into process.env.API_KEY
    // dynamically or handled by the internal proxy if running in IDX.
    const keyToUse = apiKey || process.env.API_KEY;
    
    if (!keyToUse) {
      console.warn("GeminiService: No API Key provided. Waiting for Key Selection or Manual Entry.");
    } else {
      console.log("GeminiService: Initialized with API Key");
    }

    this.client = new GoogleGenAI({ apiKey: keyToUse });
  }

  private ensureApiKey() {
    if (!this.apiKey && !process.env.API_KEY) {
      // One last check: if we are in an AI Studio environment, key might be pending injection
      throw new Error("API Key is missing. Please log in with a Developer Key or use the Google Sign-In option.");
    }
  }

  // Helper to handle both Data URIs (Base64) and Remote URLs (from Library)
  private async processImageInput(input: string): Promise<{ mimeType: string; data: string }> {
    if (!input) throw new Error("Input image is empty");

    // Case 1: Already Base64 Data URI
    if (input.startsWith('data:')) {
      const parts = input.split(',');
      // Extract mime type (e.g. "image/png")
      const mimePart = parts[0].split(':')[1].split(';')[0];
      const data = parts[1];
      return { mimeType: mimePart, data };
    } 
    
    // Case 2: Remote URL (MinIO/S3 or other)
    try {
        // Handle protocol-relative URLs (common in some storage setups)
        let fetchUrl = input;
        if (input.startsWith('//')) {
            fetchUrl = 'https:' + input;
        }

        console.log("Fetching image from URL for processing:", fetchUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
        const blob = await response.blob();
        
        // Infer MimeType if generic or missing
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
             if (input.endsWith('.png')) mimeType = 'image/png';
             else if (input.endsWith('.jpg') || input.endsWith('.jpeg')) mimeType = 'image/jpeg';
             else if (input.endsWith('.webp')) mimeType = 'image/webp';
             else mimeType = 'image/png'; // Default
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                // Safety check for read errors
                if (!base64data || !base64data.includes(',')) {
                    reject(new Error("Failed to read blob as Data URL"));
                    return;
                }
                const parts = base64data.split(',');
                const data = parts[1];
                resolve({ mimeType, data });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e: any) {
        throw new Error(`Failed to process image input: ${e.message}`);
    }
  }

  async generateImage(prompt: string, imageSize: string = '1K', aspectRatio: string = '1:1'): Promise<string> {
    this.ensureApiKey();
    // Re-instantiate to catch any dynamic key updates from the environment
    const effectiveKey = this.apiKey || process.env.API_KEY;
    const client = new GoogleGenAI({ apiKey: effectiveKey });

    try {
        console.log("Attempting generation with gemini-3-pro-image-preview...");
        // 1. Try High Quality Model (Nano Banana Pro)
        const response = await client.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: [{ text: prompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any 
            }
          }
        });

        return this.extractImageFromResponse(response);

    } catch (error: any) {
        console.warn("Gemini 3 Pro failed. Falling back to Flash...", error.message);

        // 2. Fallback to Flash Image (Standard)
        // Note: Flash does not support 'imageSize' in config, but supports aspectRatio.
        try {
            const fallbackResponse = await client.models.generateContent({
                model: 'gemini-2.5-flash-image', // Nano Banana
                contents: {
                   parts: [{ text: prompt }]
                },
                config: {
                   imageConfig: {
                       aspectRatio: aspectRatio as any
                   }
                }
            });
            return this.extractImageFromResponse(fallbackResponse);
        } catch (fallbackError: any) {
             throw new Error(`Generation failed: ${fallbackError.message}`);
        }
    }
  }

  async editImage(imageInput: string, prompt: string, imageSize: string = '1K', aspectRatio: string = '1:1'): Promise<string> {
    this.ensureApiKey();
    const effectiveKey = this.apiKey || process.env.API_KEY;
    const client = new GoogleGenAI({ apiKey: effectiveKey });

    // Process input (convert URL to Base64 if needed)
    const { mimeType, data } = await this.processImageInput(imageInput);

    try {
        console.log("Attempting edit with gemini-3-pro-image-preview...");
        const response = await client.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: {
            parts: [
              { inlineData: { mimeType, data } },
              { text: prompt }
            ]
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any
            }
          }
        });

        return this.extractImageFromResponse(response);

    } catch (error: any) {
        console.warn("Gemini 3 Pro Edit failed. Falling back to Flash...", error.message);

        try {
            const fallbackResponse = await client.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data } },
                        { text: prompt }
                    ]
                },
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio as any
                    }
                }
            });
            return this.extractImageFromResponse(fallbackResponse);
        } catch (fallbackError: any) {
            throw new Error(`Edit failed: ${fallbackError.message}`);
        }
    }
  }

  async mixImages(imageInputs: string[], prompt: string, imageSize: string = '1K', aspectRatio: string = '1:1'): Promise<string> {
      this.ensureApiKey();
      const effectiveKey = this.apiKey || process.env.API_KEY;
      const client = new GoogleGenAI({ apiKey: effectiveKey });

      try {
          // Prepare parts: [Image1, Image2, ..., TextPrompt]
          const parts: any[] = [];
          
          for (const img of imageInputs) {
              const { mimeType, data } = await this.processImageInput(img);
              parts.push({ inlineData: { mimeType, data } });
          }
          
          parts.push({ text: `Analyze the provided images and generate a new image that combines their visual elements. ${prompt}` });

          console.log(`Mixing ${imageInputs.length} images with Gemini...`);

          // Note: While gemini-3-pro-image-preview is powerful, simpler mixing sometimes works better on flash-image if complex instruction following isn't needed.
          // However, we stick to the best model first.
          try {
              const response = await client.models.generateContent({
                  model: 'gemini-3-pro-image-preview',
                  contents: { parts },
                  config: {
                      imageConfig: {
                          aspectRatio: aspectRatio as any,
                          imageSize: imageSize as any
                      }
                  }
              });
              return this.extractImageFromResponse(response);
          } catch (e: any) {
              console.warn("Gemini 3 Pro Mix failed, trying Flash...", e.message);
               const response = await client.models.generateContent({
                  model: 'gemini-2.5-flash-image',
                  contents: { parts },
                  config: {
                      imageConfig: {
                          aspectRatio: aspectRatio as any
                      }
                  }
              });
              return this.extractImageFromResponse(response);
          }

      } catch (error: any) {
           throw new Error(`Image blending failed: ${error.message}`);
      }
  }

  private extractImageFromResponse(response: any): string {
    const candidates = response.candidates;
    if (candidates && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data returned from API.");
  }

  async generateVideo(
    prompt: string, 
    duration: number, 
    aspectRatio: string, 
    resolution: string = '720p',
    firstFrame?: string,
    lastFrame?: string
  ): Promise<string> {
    const effectiveKey = this.apiKey || process.env.API_KEY;
    
    if (!effectiveKey) {
       throw new Error("Video generation requires a valid API Key.");
    }

    const client = new GoogleGenAI({ apiKey: effectiveKey });
    
    // --- ADVANCED PROMPT ENGINEERING FOR VEO ---
    let finalPrompt = "";

    if (firstFrame && lastFrame) {
        // SCENARIO 1: Interpolation (Start -> End)
        // Focus on strict time convergence and linear interpolation.
        // We emphasize that the motion must CEASE at the target frame.
        finalPrompt = `
        VIDEO GENERATION TASK:
        Start Image: Provided input A.
        End Image: Provided input B.
        
        Objective: Create a smooth, morphing transition that starts at A and ends EXACTLY at B.
        
        CRITICAL INSTRUCTIONS:
        1. The video MUST reach the End Image state by the final second.
        2. Do NOT continue motion past the End Image.
        3. The last frame of the video should match the provided End Image pixel-for-pixel if possible.
        4. Motion must decay to zero at the end.
        
        Context: ${prompt || "Seamless transition"}.
        `;
    } else if (firstFrame) {
        // SCENARIO 2: Image-to-Video (Start -> AI Dream)
        finalPrompt = `
        Animate this starting image based on the following description: "${prompt}".
        
        Duration: ${duration} seconds.
        Style: Cinematic, realistic motion, high resolution.
        Keep the visual style consistent with the first frame.
        `;
    } else {
        // SCENARIO 3: Text-to-Video
        finalPrompt = `${prompt}. Cinematic, high quality, 8k resolution. Length: ${duration} seconds.`;
    }

    const requestConfig: any = {
        numberOfVideos: 1,
        resolution: resolution as any,
        aspectRatio: aspectRatio as any || '16:9',
    };

    if (lastFrame) {
      const { mimeType, data } = await this.processImageInput(lastFrame);
      requestConfig.lastFrame = {
        imageBytes: data, // Use imageBytes for SDK compatibility
        mimeType: mimeType
      };
    }

    // Switch model based on features used
    // Use 'veo-3.1-generate-preview' (Standard) if lastFrame is present for better control
    // Otherwise use 'veo-3.1-fast-generate-preview' for speed
    const modelName = lastFrame ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';

    const payload: any = {
      model: modelName,
      prompt: finalPrompt,
      config: requestConfig
    };

    if (firstFrame) {
      const { mimeType, data } = await this.processImageInput(firstFrame);
      payload.image = {
        imageBytes: data, // Use imageBytes for SDK compatibility
        mimeType: mimeType
      };
    }

    console.log(`Generating video with model: ${modelName}`);
    let operation = await client.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await client.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
        throw new Error(String(operation.error.message));
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed to provide a URI");
    
    return videoUri; 
  }

  // --- AUDIO GENERATION (TTS) ---

  // Helper: Decode Base64 to Uint8Array
  private base64ToUint8Array(base64: string): Uint8Array {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
  }

  // Helper: Create WAV Header
  private createWavHeader(dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Uint8Array {
      const header = new ArrayBuffer(44);
      const view = new DataView(header);

      // RIFF chunk descriptor
      this.writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      this.writeString(view, 8, 'WAVE');

      // fmt sub-chunk
      this.writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
      view.setUint16(22, numChannels, true); // NumChannels
      view.setUint32(24, sampleRate, true); // SampleRate
      view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // ByteRate
      view.setUint16(32, numChannels * bitsPerSample / 8, true); // BlockAlign
      view.setUint16(34, bitsPerSample, true); // BitsPerSample

      // data sub-chunk
      this.writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true);

      return new Uint8Array(header);
  }

  private writeString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  }

  async generateSpeech(text: string, voiceName: string = 'Kore'): Promise<string> {
    this.ensureApiKey();
    const effectiveKey = this.apiKey || process.env.API_KEY;
    const client = new GoogleGenAI({ apiKey: effectiveKey });

    try {
        console.log(`Generating speech with voice: ${voiceName}`);
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName as any },
                    },
                },
            },
        });

        // Extract base64 audio (RAW PCM)
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }

        // Convert PCM to WAV
        // Gemini TTS output is 24kHz, 1 channel, 16-bit PCM
        const pcmData = this.base64ToUint8Array(base64Audio);
        const wavHeader = this.createWavHeader(pcmData.length);
        const wavData = new Uint8Array(wavHeader.length + pcmData.length);
        wavData.set(wavHeader);
        wavData.set(pcmData, wavHeader.length);

        // Convert Uint8Array back to Base64 String efficiently
        let binary = '';
        const len = wavData.byteLength;
        // Simple loop is sufficient for TTS clips (usually short)
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(wavData[i]);
        }
        const wavBase64 = window.btoa(binary);

        // Return Data URI with correct WAV mime type
        return `data:audio/wav;base64,${wavBase64}`;

    } catch (error: any) {
        console.error("TTS Generation Error:", error);
        throw new Error(`Speech generation failed: ${error.message}`);
    }
  }

  async chat(history: Content[], message: string): Promise<{ text: string, attachmentUrl?: string, attachmentType?: 'image' | 'video' }> {
    this.ensureApiKey();
    const effectiveKey = this.apiKey || process.env.API_KEY;
    const client = new GoogleGenAI({ apiKey: effectiveKey });
    
    const chatSession = client.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        systemInstruction: `You are Nebula AI Assistant. 
        If the user asks to generate an image (e.g., "draw a cat", "generate image of..."), 
        you MUST output a special command at the end of your response: [GENERATE: <prompt>].
        Example: "Sure, here is a cat." [GENERATE: A fluffy cat]`
      }
    });

    const result = await chatSession.sendMessage({ message });
    let text = result.text || "";
    let attachmentUrl: string | undefined;
    let attachmentType: 'image' | 'video' | undefined;

    // Intent Detection for Image Generation
    const genMatch = text.match(/\[GENERATE:\s*(.*?)\]/i);
    if (genMatch) {
        const prompt = genMatch[1];
        // Clean the command from the visible text
        text = text.replace(genMatch[0], '').trim();
        if (!text) text = `Creating image for: "${prompt}"...`;

        try {
            console.log(`Intent detected: Generating image for "${prompt}"`);
            attachmentUrl = await this.generateImage(prompt);
            attachmentType = 'image';
        } catch (e: any) {
            text += `\n\n(I tried to generate an image, but encountered an error: ${e.message})`;
        }
    }

    return { text, attachmentUrl, attachmentType };
  }

  // --- SMART PROMPT ENHANCER ---
  async enhancePrompt(shortPrompt: string): Promise<string> {
    this.ensureApiKey();
    const effectiveKey = this.apiKey || process.env.API_KEY;
    const client = new GoogleGenAI({ apiKey: effectiveKey });

    const systemInstruction = `You are a professional prompt engineer for advanced AI image and video generation models. 
    Your task is to take a short, simple user description and rewrite it into a highly detailed, professional prompt.
    Include details about lighting, camera angle, texture, artistic style, resolution (8k, 4k), and atmosphere.
    Keep the output strictly to the prompt itself. Do not add conversational text.`;

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: `Rewrite this prompt: "${shortPrompt}"` }] },
        config: { systemInstruction }
    });

    return response.text?.trim() || shortPrompt;
  }

  // --- NCA TOOLKIT METHODS ---
  async generateRawContent(model: string, systemInstruction: string, prompt: string): Promise<string> {
      this.ensureApiKey();
      const effectiveKey = this.apiKey || process.env.API_KEY;
      const client = new GoogleGenAI({ apiKey: effectiveKey });

      try {
          const config: any = {};
          if (systemInstruction) config.systemInstruction = systemInstruction;

          const response = await client.models.generateContent({
              model: model,
              contents: { parts: [{ text: prompt }] },
              config: config
          });

          return response.text || "";
      } catch (error: any) {
          throw new Error(error.message);
      }
  }
}
