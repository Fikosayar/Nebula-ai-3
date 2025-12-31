
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Input, Card } from '../components/UI';
import { Loader2, UserPlus, LogIn } from 'lucide-react';

export default function AuthPage() {
  const { login, register, t } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState(''); 

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
        if (mode === 'login') {
            await login('cloud', { email, password });
        } else {
            // Register
            await register({
                id: '', 
                name,
                email,
                phone,
                avatar: `https://ui-avatars.com/api/?name=${name}`,
                provider: 'cloud',
                password, 
                apiKey: apiKey 
            });
            setSuccess(t('registerSuccess'));
            setMode('login');
            setPassword('');
        }
    } catch (err: any) {
        console.error(err);
        setError(err.message || t('opFailed'));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative">
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-2">
            Nebula AI
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Next-Gen Creative Studio</p>
        </div>

        <Card className="p-8 shadow-xl border-t-4 border-primary-500">
           
           {/* Tabs */}
           <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
               <button 
                 onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                 className={`flex-1 pb-3 text-sm font-medium transition-colors ${mode === 'login' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-400'}`}
               >
                   {t('login')}
               </button>
               <button 
                 onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
                 className={`flex-1 pb-3 text-sm font-medium transition-colors ${mode === 'register' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-400'}`}
               >
                   {t('register')}
               </button>
           </div>

           {error && (
             <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-in slide-in-from-top-2">
                 {error}
             </div>
           )}
           
           {success && (
             <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 animate-in slide-in-from-top-2">
                 {success}
             </div>
           )}

           <div className="space-y-4 animate-in fade-in">
              {mode === 'register' && (
                  <>
                    <Input 
                        label={t('fullNameLabel')} 
                        placeholder="Ad Soyad" 
                        value={name} 
                        onChange={(e:any) => setName(e.target.value)} 
                    />
                    <Input 
                        label={t('phoneLabel')}
                        placeholder="05XX..." 
                        value={phone} 
                        onChange={(e:any) => setPhone(e.target.value)} 
                    />
                  </>
              )}

              <Input 
                label={t('emailLabel')} 
                type="email"
                placeholder="user@example.com" 
                value={email} 
                onChange={(e:any) => setEmail(e.target.value)} 
              />
              
              <Input 
                label={t('passwordLabel')} 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={(e:any) => setPassword(e.target.value)} 
              />

              {mode === 'register' && (
                  <Input 
                    label={t('apiKeyLabel')}
                    type="password"
                    placeholder="AIza... (Opsiyonel)" 
                    value={apiKey} 
                    onChange={(e:any) => setApiKey(e.target.value)} 
                  />
              )}

              <Button 
                onClick={handleSubmit} 
                className="w-full h-11 mt-4" 
                disabled={loading}
                icon={mode === 'login' ? LogIn : UserPlus}
              >
                 {loading ? <Loader2 className="animate-spin"/> : (mode === 'login' ? t('signInBtn') : t('createAccountBtn'))}
              </Button>
           </div>
           
           <div className="mt-6 text-center text-xs text-slate-400">
                &copy; 2024 Nebula AI Studio. All rights reserved.
           </div>

        </Card>
      </div>
    </div>
  );
}
