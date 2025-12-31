
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NCAService } from '../services/ncaService';
import { Button, Card, Input, Badge } from '../components/UI';
import { Save, Download, Database, Settings as SettingsIcon, Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, logs, user, t } = useApp();
  const [activeTab, setActiveTab] = useState<'general' | 'database'>('general');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{success: boolean, message: string} | null>(null);

  const handleExportLogs = (format: 'csv' | 'json') => {
    let content = '';
    let type = '';
    
    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
      type = 'application/json';
    } else {
      content = "ID,Timestamp,Tool,Status,Latency\n" + logs.map(l => `${l.id},${new Date(l.timestamp).toISOString()},${l.tool},${l.status},${l.latencyMs}`).join('\n');
      type = 'text/csv';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs.${format}`;
    a.click();
  };

  const handleCloudConfigChange = (key: string, value: string) => {
    updateSettings({
        cloudConfig: {
            ...settings.cloudConfig,
            [key]: value
        }
    });
    // Reset status on change
    if (key.includes('nca')) setConnectionStatus(null);
  };

  const testNcaConnection = async () => {
      setTestingConnection(true);
      setConnectionStatus(null);
      const service = new NCAService(settings.cloudConfig);
      const result = await service.testConnection();
      setConnectionStatus(result);
      setTestingConnection(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
         <button 
           onClick={() => setActiveTab('general')}
           className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'general' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           <SettingsIcon size={18} /> {t('genSettings')}
         </button>
         <button 
           onClick={() => setActiveTab('database')}
           className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'database' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
         >
           <Database size={18} /> {t('dbSettings')}
         </button>
      </div>

      {activeTab === 'general' && (
        <>
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('genSettings')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-sm font-medium text-slate-500 mb-1 block">{t('languageLabel')}</label>
                    <select 
                    value={settings.language} 
                    onChange={(e:any) => updateSettings({language: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-500 mb-1 block">{t('accountLabel')}</label>
                    <Input value={user?.email} disabled className="opacity-60" />
                </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold dark:text-white">{t('webhookTitle')}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{settings.webhookEnabled ? t('enabled') : t('disabled')}</span>
                    <button 
                    onClick={() => updateSettings({webhookEnabled: !settings.webhookEnabled})}
                    className={`w-10 h-6 rounded-full p-1 transition-colors ${settings.webhookEnabled ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.webhookEnabled ? 'translate-x-4' : ''}`}></div>
                    </button>
                </div>
                </div>
                <div className="space-y-4">
                <Input 
                    label={t('targetUrl')}
                    placeholder="https://hooks.zapier.com/..." 
                    value={settings.webhookUrl} 
                    onChange={(e: any) => updateSettings({webhookUrl: e.target.value})}
                />
                <p className="text-xs text-slate-500">Events triggered: FILE_CREATED, GENERATION_COMPLETE</p>
                <Button icon={Save} onClick={() => alert("Settings Saved")}>{t('saveConfig')}</Button>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold dark:text-white">{t('sysLogs')}</h3>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleExportLogs('csv')}>CSV</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExportLogs('json')}>JSON</Button>
                </div>
                </div>
                
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left dark:text-slate-300">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                    <tr>
                        <th className="px-4 py-2">Time</th>
                        <th className="px-4 py-2">Tool</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Latency</th>
                    </tr>
                    </thead>
                    <tbody>
                    {logs.slice(0, 10).map(log => (
                        <tr key={log.id} className="border-b dark:border-slate-800">
                        <td className="px-4 py-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-2">{log.tool}</td>
                        <td className="px-4 py-2"><Badge type={log.status}>{log.status}</Badge></td>
                        <td className="px-4 py-2">{log.latencyMs}ms</td>
                        </tr>
                    ))}
                    {logs.length === 0 && (
                        <tr>
                        <td colSpan={4} className="text-center py-4 text-slate-500">{t('noActivity')}</td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>
            </Card>
        </>
      )}

      {activeTab === 'database' && (
         <div className="space-y-6 animate-in fade-in">
             <Card className="p-6 border-l-4 border-primary-500">
                <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('dbSettings')}</h3>
                <p className="text-sm text-slate-500 mb-6">{t('dbDesc')}</p>
                
                <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm mb-6 border border-blue-200">
                    You can override the default server configuration here. These changes are saved to your browser and synchronized to your account.
                </div>

                <div className="space-y-8">
                   {/* NCA Toolkit Section */}
                   <div className="space-y-4">
                      <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('ncaConfig')}</h4>
                          <Button size="sm" variant="secondary" onClick={testNcaConnection} disabled={testingConnection || !settings.cloudConfig.ncaApiUrl} icon={testingConnection ? Loader2 : Wifi}>
                              Test Connection
                          </Button>
                      </div>
                      
                      {connectionStatus && (
                          <div className={`p-3 rounded text-sm flex items-center gap-2 ${connectionStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {connectionStatus.success ? <Wifi size={16}/> : <WifiOff size={16}/>}
                              {connectionStatus.message}
                          </div>
                      )}

                      <Input 
                        label={t('ncaUrlLabel')}
                        placeholder="https://nca.sapanca360.com"
                        value={settings.cloudConfig.ncaApiUrl} 
                        onChange={(e: any) => handleCloudConfigChange('ncaApiUrl', e.target.value)}
                      />
                      <Input 
                        label={t('ncaKeyLabel')}
                        type="password"
                        placeholder="API Key (Required for external access)"
                        value={settings.cloudConfig.ncaApiKey} 
                        onChange={(e: any) => handleCloudConfigChange('ncaApiKey', e.target.value)}
                      />
                   </div>

                   {/* Baserow Section */}
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">{t('baserowConfig')}</h4>
                      <Input 
                        label={t('baserowUrlLabel')}
                        value={settings.cloudConfig.baserowUrl} 
                        onChange={(e: any) => handleCloudConfigChange('baserowUrl', e.target.value)}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Input 
                           label={t('baserowTokenLabel')}
                           type="password" 
                           value={settings.cloudConfig.baserowToken} 
                           onChange={(e: any) => handleCloudConfigChange('baserowToken', e.target.value)}
                         />
                         <Input 
                           label={t('tableIdLabel')}
                           value={settings.cloudConfig.baserowTableId} 
                           onChange={(e: any) => handleCloudConfigChange('baserowTableId', e.target.value)}
                         />
                      </div>
                   </div>

                   {/* MinIO Section */}
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">{t('minioConfig')}</h4>
                      <Input 
                        label={t('endpointLabel')}
                        value={settings.cloudConfig.minioEndpoint} 
                        onChange={(e: any) => handleCloudConfigChange('minioEndpoint', e.target.value)}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Input 
                           label={t('accessKeyLabel')}
                           value={settings.cloudConfig.minioAccessKey} 
                           onChange={(e: any) => handleCloudConfigChange('minioAccessKey', e.target.value)}
                         />
                         <Input 
                           label={t('secretKeyLabel')}
                           type="password" 
                           value={settings.cloudConfig.minioSecretKey} 
                           onChange={(e: any) => handleCloudConfigChange('minioSecretKey', e.target.value)}
                         />
                      </div>
                      <Input 
                        label={t('bucketLabel')}
                        value={settings.cloudConfig.minioBucket} 
                        onChange={(e: any) => handleCloudConfigChange('minioBucket', e.target.value)}
                      />
                   </div>
                </div>
                
                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button icon={Save} onClick={() => alert(t('saveConfig'))}>{t('saveConfig')}</Button>
                </div>
             </Card>
         </div>
      )}
    </div>
  );
}
