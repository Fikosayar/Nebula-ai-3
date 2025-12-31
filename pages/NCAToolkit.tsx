
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import { Card, Button, Input, Select, Badge } from '../components/UI';
import { Terminal, Activity, Zap, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function NCAToolkit() {
  const { user, settings } = useApp();
  const [activeTab, setActiveTab] = useState<'prompt-lab' | 'diagnostics'>('prompt-lab');
  const service = new GeminiService(user?.apiKey || '');

  // Prompt Lab State
  const [model, setModel] = useState('gemini-2.5-flash');
  const [systemInst, setSystemInst] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);

  // Diagnostics State
  const [diagStatus, setDiagStatus] = useState<Record<string, 'pending'|'ok'|'error'>>({
      api: 'pending',
      baserow: 'pending',
      minio: 'pending'
  });

  const models = [
      { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
      { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
  ];

  const handleRunPrompt = async () => {
      if (!prompt) return;
      setLoading(true);
      setResponse('');
      setExecTime(null);
      const start = performance.now();
      
      try {
          // Check for API Key requirement for Pro models if needed
          if (model.includes('pro') && !user?.apiKey && (window as any).aistudio) {
               const hasKey = await (window as any).aistudio.hasSelectedApiKey();
               if (!hasKey) {
                   try { await (window as any).aistudio.openSelectKey(); } catch(e) {}
               }
          }

          const res = await service.generateRawContent(model, systemInst, prompt);
          setResponse(res);
      } catch (e: any) {
          setResponse(`Error: ${e.message}`);
      } finally {
          setExecTime(Math.round(performance.now() - start));
          setLoading(false);
      }
  };

  const runDiagnostics = async () => {
      setDiagStatus({ api: 'pending', baserow: 'pending', minio: 'pending' });

      // 1. API Check
      try {
          await service.generateRawContent('gemini-2.5-flash', '', 'Hi');
          setDiagStatus(prev => ({ ...prev, api: 'ok' }));
      } catch (e) {
          setDiagStatus(prev => ({ ...prev, api: 'error' }));
      }

      // 2. Baserow Check
      if (settings.cloudConfig.baserowUrl) {
          try {
              const res = await fetch(`${settings.cloudConfig.baserowUrl}/api/database/rows/table/${settings.cloudConfig.baserowTableId}/?size=1`, {
                  headers: { "Authorization": `Token ${settings.cloudConfig.baserowToken}` }
              });
              setDiagStatus(prev => ({ ...prev, baserow: res.ok ? 'ok' : 'error' }));
          } catch(e) {
              setDiagStatus(prev => ({ ...prev, baserow: 'error' }));
          }
      } else {
          setDiagStatus(prev => ({ ...prev, baserow: 'error' }));
      }

      // 3. MinIO Check
      // Simple fetch to endpoint root (often returns XML or 403, but confirms connectivity)
      if (settings.cloudConfig.minioEndpoint) {
           try {
               // Just checking if we can reach the server
               const endpoint = settings.cloudConfig.minioEndpoint.startsWith('http') 
                    ? settings.cloudConfig.minioEndpoint 
                    : `https://${settings.cloudConfig.minioEndpoint}`;
               
               await fetch(endpoint, { method: 'HEAD', mode: 'no-cors' }); 
               // no-cors returns opaque response, but if it doesn't throw network error, we are likely good on connectivity
               setDiagStatus(prev => ({ ...prev, minio: 'ok' }));
           } catch(e) {
               setDiagStatus(prev => ({ ...prev, minio: 'error' }));
           }
      } else {
          setDiagStatus(prev => ({ ...prev, minio: 'error' }));
      }
  };

  return (
    <div className="h-full flex flex-col gap-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 text-white rounded-lg">
                  <Terminal size={24} />
              </div>
              <div>
                  <h2 className="text-2xl font-bold dark:text-white">NCA Toolkit</h2>
                  <p className="text-slate-500 text-sm">Nebula Core Admin & Developer Console</p>
              </div>
          </div>
          <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setActiveTab('prompt-lab')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'prompt-lab' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                  Prompt Lab
              </button>
              <button 
                onClick={() => setActiveTab('diagnostics')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'diagnostics' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                  System Diagnostics
              </button>
          </div>
       </div>

       {activeTab === 'prompt-lab' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
               <div className="lg:col-span-1 space-y-4 flex flex-col h-full overflow-y-auto">
                   <Card className="p-6 space-y-4">
                       <h3 className="font-semibold dark:text-white flex items-center gap-2">
                           <Zap size={18} className="text-yellow-500" /> Configuration
                       </h3>
                       <Select 
                           label="Model" 
                           value={model} 
                           onChange={(e:any) => setModel(e.target.value)} 
                           options={models} 
                       />
                       <div className="space-y-1">
                           <label className="text-sm font-medium text-slate-600 dark:text-slate-400">System Instructions</label>
                           <textarea 
                               className="w-full h-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-mono resize-none dark:text-slate-200"
                               placeholder="You are a helpful assistant..."
                               value={systemInst}
                               onChange={(e) => setSystemInst(e.target.value)}
                           />
                       </div>
                   </Card>
                   
                   <Card className="p-6 flex-1 flex flex-col">
                       <h3 className="font-semibold dark:text-white mb-2">Input</h3>
                       <textarea 
                           className="w-full flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono resize-none dark:text-slate-200"
                           placeholder="Enter your prompt here..."
                           value={prompt}
                           onChange={(e) => setPrompt(e.target.value)}
                       />
                       <div className="mt-4 flex justify-between items-center">
                           <span className="text-xs text-slate-400">{prompt.length} chars</span>
                           <Button onClick={handleRunPrompt} disabled={loading} icon={Play}>Run</Button>
                       </div>
                   </Card>
               </div>

               <div className="lg:col-span-2 h-full">
                   <Card className="h-full flex flex-col p-0 overflow-hidden bg-slate-900 border-slate-800">
                       <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                           <span className="text-xs font-mono text-slate-400">OUTPUT_CONSOLE</span>
                           {execTime && <Badge type="success">{execTime}ms</Badge>}
                       </div>
                       <div className="flex-1 overflow-auto p-4">
                           {loading ? (
                               <div className="flex items-center gap-2 text-primary-400 font-mono">
                                   <Loader2 className="animate-spin" size={16} />
                                   Processing request...
                               </div>
                           ) : (
                               <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">{response || "// Ready for execution..."}</pre>
                           )}
                       </div>
                   </Card>
               </div>
           </div>
       )}

       {activeTab === 'diagnostics' && (
           <Card className="p-8 max-w-3xl mx-auto w-full">
               <div className="flex justify-between items-center mb-8">
                   <div>
                       <h3 className="text-xl font-bold dark:text-white">System Health Check</h3>
                       <p className="text-slate-500">Verify connectivity to external services.</p>
                   </div>
                   <Button onClick={runDiagnostics} icon={Activity}>Run Diagnostics</Button>
               </div>

               <div className="space-y-4">
                   {/* Gemini API */}
                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                       <div className="flex items-center gap-4">
                           <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600">
                               <Zap size={20} />
                           </div>
                           <div>
                               <p className="font-semibold dark:text-white">Gemini API</p>
                               <p className="text-xs text-slate-500">Google Generative AI Connection</p>
                           </div>
                       </div>
                       <StatusBadge status={diagStatus.api} />
                   </div>

                   {/* Baserow */}
                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                       <div className="flex items-center gap-4">
                           <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-green-600">
                               <Activity size={20} />
                           </div>
                           <div>
                               <p className="font-semibold dark:text-white">Baserow Database</p>
                               <p className="text-xs text-slate-500">{settings.cloudConfig.baserowUrl || 'Not Configured'}</p>
                           </div>
                       </div>
                       <StatusBadge status={diagStatus.baserow} />
                   </div>

                   {/* MinIO */}
                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                       <div className="flex items-center gap-4">
                           <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded text-red-600">
                               <Terminal size={20} />
                           </div>
                           <div>
                               <p className="font-semibold dark:text-white">MinIO Storage</p>
                               <p className="text-xs text-slate-500">{settings.cloudConfig.minioEndpoint || 'Not Configured'}</p>
                           </div>
                       </div>
                       <StatusBadge status={diagStatus.minio} />
                   </div>
               </div>
           </Card>
       )}
    </div>
  );
}

const StatusBadge = ({ status }: { status: 'pending'|'ok'|'error' }) => {
    if (status === 'pending') return <span className="text-xs text-slate-400 font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">PENDING</span>;
    if (status === 'ok') return <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle size={14} /> ONLINE</div>;
    return <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full text-xs font-bold"><XCircle size={14} /> ERROR</div>;
};
