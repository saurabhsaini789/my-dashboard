"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Info, CheckCircle2, LayoutGrid, List, Trash2, AlertCircle, X, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { DEFAULT_PLATFORMS, POST_TYPES, type BusinessChannel, type ContentIdea, type ContentTypeSchedule } from '@/types/business';
import { Text, SectionTitle } from '../ui/Text';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

export function BusinessChannelsSection() {
  const channels = useStorageSubscription<BusinessChannel[]>(SYNC_KEYS.FINANCES_BUSINESS, []);
  const ideas = useStorageSubscription<ContentIdea[]>(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<BusinessChannel | null>(null);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [selectedChannelForPost, setSelectedChannelForPost] = useState<string | null>(null);
  const viewMode = useStorageSubscription<'table' | 'grid'>('content_system_view_mode', 'table');
  
  const [formData, setFormData] = useState({
    name: '', platform: 'Instagram', customPlatform: '', status: 'Active' as any, rowColor: '', about: '',
    schedules: [] as ContentTypeSchedule[]
  });

  const [newScheduleType, setNewScheduleType] = useState('Post');
  const [customScheduleType, setCustomScheduleType] = useState('');
  const [newFrequency, setNewFrequency] = useState(1);

  const LIGHT_COLORS = [
    { name: 'Default', value: '', dot: 'bg-zinc-200' },
    { name: 'Rose', value: 'bg-rose-50', dot: 'bg-rose-500' },
    { name: 'Amber', value: 'bg-amber-50', dot: 'bg-amber-500' },
    { name: 'Emerald', value: 'bg-emerald-50', dot: 'bg-emerald-500' },
    { name: 'Sky', value: 'bg-sky-50', dot: 'bg-sky-500' },
    { name: 'Indigo', value: 'bg-indigo-50', dot: 'bg-indigo-500' },
    { name: 'Violet', value: 'bg-violet-50', dot: 'bg-violet-500' },
    { name: 'Zinc', value: 'bg-zinc-50', dot: 'bg-zinc-500' },
  ];

  useEffect(() => {
    // Migration Logic: Convert legacy channels to new schedule format
    const needsMigration = channels.some(c => !c.schedules || (c as any).postingFrequency !== undefined);
    if (needsMigration) {
      const migrated = channels.map(c => {
        if (!c.schedules || (c as any).postingFrequency !== undefined) {
          const legacy = c as any;
          const status = (['Active', 'Paused', 'Idea'].includes(legacy.status) ? legacy.status : 'Active') as 'Active' | 'Paused' | 'Idea';
          return {
            id: legacy.id,
            name: legacy.name,
            platform: legacy.platform,
            status: status,
            about: legacy.about,
            rowColor: legacy.rowColor,
            schedules: [{
              id: crypto.randomUUID(),
              type: legacy.contentType || 'Post',
              frequency: legacy.postingFrequency || 1,
              lastPostedDate: legacy.lastPostedDate || new Date().toISOString().split('T')[0],
              nextPostDueDate: legacy.nextPostDueDate || new Date().toISOString().split('T')[0]
            }]
          } as BusinessChannel;
        }
        return c;
      });
      setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(migrated));
    }
  }, [channels]);

  const toggleViewMode = (mode: 'table' | 'grid') => { setSyncedItem('content_system_view_mode', mode); };

  const openAddModal = () => {
    setEditingChannel(null);
    setFormData({ name: '', platform: 'Instagram', customPlatform: '', status: 'Active', rowColor: '', about: '', schedules: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (channel: BusinessChannel) => {
    setEditingChannel(channel);
    const isStandardPlatform = DEFAULT_PLATFORMS.includes(channel.platform);
    setFormData({
      name: channel.name, platform: isStandardPlatform ? channel.platform : 'Other', customPlatform: isStandardPlatform ? '' : channel.platform,
      status: channel.status, rowColor: channel.rowColor || '', about: channel.about || '',
      schedules: [...channel.schedules]
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const platform = formData.platform === 'Other' ? formData.customPlatform : formData.platform;
    
    const newItem: BusinessChannel = {
      id: editingChannel ? editingChannel.id : crypto.randomUUID(),
      name: formData.name, platform: platform || 'Other', status: formData.status,
      rowColor: formData.rowColor, about: formData.about,
      schedules: formData.schedules
    };

    const updated = editingChannel ? channels.map(c => c.id === editingChannel.id ? newItem : c) : [newItem, ...channels];
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updated));
    setIsModalOpen(false);
  };

  const addSchedule = () => {
    const type = newScheduleType === 'Other' ? customScheduleType : newScheduleType;
    if (!type) return;
    const newSched: ContentTypeSchedule = {
      id: crypto.randomUUID(),
      type,
      frequency: newFrequency,
      lastPostedDate: new Date().toISOString().split('T')[0],
      nextPostDueDate: new Date().toISOString().split('T')[0]
    };
    setFormData(prev => ({ ...prev, schedules: [...prev.schedules, newSched] }));
    setCustomScheduleType('');
  };

  const removeSchedule = (id: string) => {
    setFormData(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== id) }));
  };

  const markAsPosted = (channelId: string, scheduleId: string, ideaId?: string) => {
    if (!ideaId) {
      if (ideas.filter(i => i.channelId === channelId && i.status === 'Pending').length > 0) {
        setSelectedChannelForPost(channelId); setIsIdeaModalOpen(true); return;
      }
    }
    const today = new Date().toISOString().split('T')[0];
    const updatedChannels = channels.map(c => {
      if (c.id === channelId) {
        const updatedSchedules = c.schedules.map(s => {
          if (s.id === scheduleId) {
            const next = new Date(); next.setDate(next.getDate() + s.frequency);
            return { ...s, lastPostedDate: today, nextPostDueDate: next.toISOString().split('T')[0] };
          }
          return s;
        });
        return { ...c, schedules: updatedSchedules };
      }
      return c;
    });
    if (ideaId && ideaId !== 'none') {
      const updatedIdeas = ideas.map(i => i.id === ideaId ? { ...i, status: 'Completed' as any } : i);
      setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, JSON.stringify(updatedIdeas));
    }
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updatedChannels));
    setIsIdeaModalOpen(false);
  };

  const getStatus = (c: BusinessChannel) => {
    if (c.status !== 'Active') return { l: 'Draft', c: 'text-zinc-400' };
    if (!c.schedules || c.schedules.length === 0) return { l: 'No Schedule', c: 'text-zinc-400' };
    
    const today = new Date(); today.setHours(0,0,0,0);
    let mostUrgentDiff = Infinity;
    
    for (const s of c.schedules) {
      if (!s.nextPostDueDate) continue;
      const due = new Date(s.nextPostDueDate);
      if (isNaN(due.getTime())) continue;
      due.setHours(0,0,0,0);
      const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      if (diff < mostUrgentDiff) mostUrgentDiff = diff;
    }

    if (mostUrgentDiff < 0) return { l: 'Overdue', c: 'text-rose-500' };
    if (mostUrgentDiff <= 1) return { l: 'Due Soon', c: 'text-amber-500' };
    return { l: 'On Track', c: 'text-emerald-500' };
  };

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div><SectionTitle>Content System</SectionTitle><Text variant="label" className="mt-1">The central database and control layer of your content empire</Text></div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl h-[54px]">
            <button onClick={()=>toggleViewMode('table')} className={`px-4 rounded-xl text-xs font-bold ${viewMode==='table'?'bg-white shadow-sm':'text-zinc-400'}`}><List size={16}/></button>
            <button onClick={()=>toggleViewMode('grid')} className={`px-4 rounded-xl text-xs font-bold ${viewMode==='grid'?'bg-white shadow-sm':'text-zinc-400'}`}><LayoutGrid size={16}/></button>
          </div>
          <button onClick={openAddModal} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold px-6 h-[54px] rounded-2xl shadow-sm">+ NEW CHANNEL</button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-[10px] font-bold uppercase text-zinc-400">
              <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Channel</th><th className="px-6 py-4">Platform</th><th className="px-6 py-4">Schedules</th><th className="px-6 py-4"></th></tr>
            </thead>
            <tbody className="text-sm font-bold">
              {channels.map(c => {
                const s = getStatus(c);
                return (
                  <tr key={c.id} className="border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50">
                    <td className="px-6 py-4"><span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${s.c} bg-zinc-50`}>{s.l}</span></td>
                    <td className="px-6 py-4">{c.name}</td>
                    <td className="px-6 py-4 text-zinc-400">{c.platform}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.schedules?.map(sched => (
                          <span key={sched.id} className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-500">{sched.type} ({sched.frequency}d)</span>
                        ))}
                        {(!c.schedules || c.schedules.length === 0) && <span className="text-zinc-300 italic">None</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                      <button onClick={()=>openEditModal(c)} className="p-2 bg-zinc-100 rounded-xl text-zinc-400"><Edit2 size={14}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map(c => {
            const s = getStatus(c);
            return (
              <div key={c.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl shadow-sm hover:-translate-y-1 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div><Text variant="body" className="font-bold text-lg">{c.name}</Text><span className="text-[10px] font-bold uppercase text-zinc-400">{c.platform}</span></div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${s.c} bg-zinc-50`}>{s.l}</span>
                </div>
                <div className="flex flex-col gap-2 py-4 border-t border-zinc-50">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Schedules</span>
                  <div className="space-y-1.5">
                    {c.schedules?.map(sched => {
                      const due = new Date(sched.nextPostDueDate);
                      const isOverdue = due < new Date();
                      return (
                        <div key={sched.id} className="flex justify-between items-center text-xs font-bold">
                          <span className="text-zinc-600">{sched.type}</span>
                          <span className={isOverdue ? 'text-rose-500' : 'text-zinc-400'}>{sched.frequency}d • {due.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>openEditModal(c)} className="w-full py-3 bg-zinc-100 rounded-xl text-zinc-400 flex items-center justify-center gap-2 font-bold text-xs"><Edit2 size={14}/> EDIT CHANNEL</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title="Channel Record" onSubmit={handleSubmit}>
        <DynamicForm
          sections={[{ id:'c', fields:[
            { name:'name', label:'Name', type:'text', required:true, fullWidth:true },
            { name:'platform', label:'Platform', type:'select', options:DEFAULT_PLATFORMS.map(p=>({label:p,value:p})) },
            { name:'about', label:'Description', type:'textarea', fullWidth:true }
          ]}]}
          formData={formData}
          onChange={(n,v)=>setFormData(p=>({...p,[n]:v}))}
        />
        {/* Custom Schedule Manager */}
        <div className="mt-8 pt-8 border-t border-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-zinc-400" />
            <span className="text-xs font-bold uppercase text-zinc-900">Post Schedules</span>
          </div>

          <div className="space-y-3 mb-6">
            {formData.schedules.map(sched => (
              <div key={sched.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100 group">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-900">{sched.type}</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Every {sched.frequency} days</span>
                </div>
                <button type="button" onClick={() => removeSchedule(sched.id)} className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                  <X size={14} />
                </button>
              </div>
            ))}
            {formData.schedules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200">
                <AlertCircle size={24} className="text-zinc-200 mb-2" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase">No schedules added yet</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-4 bg-zinc-100/50 rounded-3xl border border-zinc-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase px-1">Post Type</span>
                <select 
                  value={newScheduleType} 
                  onChange={(e) => setNewScheduleType(e.target.value)}
                  className="w-full bg-white border border-zinc-100 px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                >
                  {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase px-1">Frequency (Days)</span>
                <input 
                  type="number" 
                  value={newFrequency} 
                  onChange={(e) => setNewFrequency(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-zinc-100 px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                  min="1"
                />
              </div>
            </div>
            
            {newScheduleType === 'Other' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase px-1">Other Type Name</span>
                <input 
                  type="text" 
                  value={customScheduleType} 
                  onChange={(e) => setCustomScheduleType(e.target.value)}
                  placeholder="e.g. Webinar"
                  className="w-full bg-white border border-zinc-100 px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>
            )}

            <button 
              type="button" 
              onClick={addSchedule}
              className="mt-1 w-full bg-zinc-900 text-white py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:shadow-lg transition-all active:scale-[0.98]"
            >
              + Add Schedule
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-8">
          {['Active', 'Paused', 'Idea'].map(s => (
            <button 
              key={s} 
              type="button" 
              onClick={()=>setFormData({...formData, status:s as any})} 
              className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider border transition-all ${formData.status===s?'bg-zinc-900 text-white border-zinc-900 shadow-lg':'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
        
        {editingChannel && (
          <div className="flex justify-center mt-6">
            <button 
              type="button" 
              onClick={()=>setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(channels.filter(c=>c.id!==editingChannel.id)))} 
              className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
            >
              Delete Channel
            </button>
          </div>
        )}
      </Modal>

      <Modal isOpen={isIdeaModalOpen} onClose={()=>setIsIdeaModalOpen(false)} title="Select Idea">
        <div className="space-y-3">
          {ideas.filter(i => i.channelId === selectedChannelForPost && i.status === 'Pending').map(i => (
            <button key={i.id} onClick={()=>markAsPosted(selectedChannelForPost!, 'todo', i.id)} className="w-full p-4 rounded-xl border hover:border-emerald-500 transition-all text-sm font-bold text-left">{i.title}</button>
          ))}
          <button onClick={()=>markAsPosted(selectedChannelForPost!, 'todo', 'none')} className="w-full p-4 rounded-xl border border-dashed text-zinc-400 text-xs font-bold">Post without idea</button>
        </div>
      </Modal>
    </section>
  );
}
