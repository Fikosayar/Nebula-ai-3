import React from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ToolType } from '../types';

export default function Dashboard() {
  const { logs, files, settings, t } = useApp();

  // Aggregate stats
  const stats = [
    { label: t('totalFiles'), value: files.length, color: 'text-blue-500' },
    { label: t('quotaUsed'), value: `${settings.quotaUsed}/${settings.quotaLimit}`, color: 'text-purple-500' },
    { label: t('successRate'), value: '98%', color: 'text-green-500' },
  ];

  const chartData = [
    { name: 'Image', count: logs.filter(l => l.tool === ToolType.IMAGE_GEN).length },
    { name: 'Video', count: logs.filter(l => l.tool === ToolType.VIDEO_GEN).length },
    { name: 'Chat', count: logs.filter(l => l.tool === ToolType.CHAT).length },
    { name: 'Edits', count: logs.filter(l => l.tool === ToolType.IMAGE_EDIT).length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6">
            <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
            <h2 className={`text-3xl font-bold ${stat.color}`}>{stat.value}</h2>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6 dark:text-white">{t('usageAnalytics')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                   <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </Card>

         <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('recentActivity')}</h3>
            <div className="space-y-4">
              {logs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                   <div>
                     <p className="font-medium text-sm dark:text-slate-200">{log.tool} {t('op')}</p>
                     <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                   </div>
                   <span className={`text-xs px-2 py-1 rounded ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {log.status}
                   </span>
                </div>
              ))}
              {logs.length === 0 && <p className="text-slate-500 text-sm">{t('noActivity')}</p>}
            </div>
         </Card>
      </div>
    </div>
  );
}