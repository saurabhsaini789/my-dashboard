"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Globe, 
  MoreVertical, 
  ChevronDown, 
  X,
  PlusCircle,
  MoreHorizontal,
  Info,
  CheckCircle2,
  Rocket
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { DEFAULT_PLATFORMS, CONTENT_TYPES, type BusinessChannel, type ContentIdea } from '@/types/business';

export function BusinessChannelsSection() {
  const [channels, setChannels] = useState<BusinessChannel[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<BusinessChannel | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [selectedChannelForPost, setSelectedChannelForPost] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    platform: 'Instagram',
    customPlatform: '',
    contentType: 'Posts',
    status: 'Active' as 'Active' | 'Paused' | 'Idea',
    postingFrequency: 1,
    lastPostedDate: new Date().toISOString().split('T')[0]
  });

  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
    if (saved) {
      try {
        setChannels(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse business data", e);
      }
    }
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_BUSINESS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
        if (val && val !== JSON.stringify(channelsRef.current)) {
          try { setChannels(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_BUSINESS_IDEAS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS_IDEAS));
        if (val) {
          try { setIdeas(JSON.parse(val)); } catch (e) {}
        }
      }
    };

    // Initial load for ideas
    const savedIdeas = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS_IDEAS));
    if (savedIdeas) {
      try { setIdeas(JSON.parse(savedIdeas)); } catch (e) {}
    }

    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  const openAddModal = () => {
    setEditingChannel(null);
    setFormData({
      name: '',
      platform: 'Instagram',
      customPlatform: '',
      contentType: '',
      status: 'Active',
      postingFrequency: 1,
      lastPostedDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (channel: BusinessChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      platform: DEFAULT_PLATFORMS.includes(channel.platform) ? channel.platform : 'Other',
      customPlatform: DEFAULT_PLATFORMS.includes(channel.platform) ? '' : channel.platform,
      contentType: channel.contentType || '',
      status: channel.status,
      postingFrequency: channel.postingFrequency,
      lastPostedDate: channel.lastPostedDate
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const platform = formData.platform === 'Other' ? formData.customPlatform : formData.platform;
    const lastPostedDate = new Date(formData.lastPostedDate);
    const nextDueDate = new Date(lastPostedDate);
    nextDueDate.setDate(lastPostedDate.getDate() + formData.postingFrequency);

    const newChannel: BusinessChannel = {
      id: editingChannel ? editingChannel.id : crypto.randomUUID(),
      name: formData.name,
      platform: platform || 'Other',
      contentType: formData.contentType,
      status: formData.status,
      postingFrequency: formData.postingFrequency,
      lastPostedDate: formData.lastPostedDate,
      nextPostDueDate: nextDueDate.toISOString().split('T')[0]
    };

    let updatedChannels;
    if (editingChannel) {
      updatedChannels = channels.map(c => c.id === editingChannel.id ? newChannel : c);
    } else {
      updatedChannels = [newChannel, ...channels];
    }

    setChannels(updatedChannels);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updatedChannels));
    setIsModalOpen(false);
  };

  const deleteChannel = (id: string) => {
    const updated = channels.filter(c => c.id !== id);
    setChannels(updated);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updated));
    if (editingChannel?.id === id) setIsModalOpen(false);
  };

  const markAsPosted = (id: string, ideaId?: string) => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    
    // Check if we should show idea selection first
    if (!ideaId) {
      const channelIdeas = ideas.filter(i => i.channelId === id && i.status === 'Pending');
      if (channelIdeas.length > 0) {
        setSelectedChannelForPost(id);
        setIsIdeaModalOpen(true);
        return;
      }
    }

    const updatedChannels = channels.map(c => {
      if (c.id === id) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + c.postingFrequency);
        const nextDateISO = nextDate.toISOString().split('T')[0];
        
        return {
          ...c,
          lastPostedDate: todayISO,
          nextPostDueDate: nextDateISO
        };
      }
      return c;
    });

    // If an idea was selected, mark it as completed
    if (ideaId) {
      const updatedIdeas = ideas.map(idea => 
        idea.id === ideaId ? { ...idea, status: 'Completed' as const } : idea
      );
      setIdeas(updatedIdeas);
      setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, JSON.stringify(updatedIdeas));
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });

    setChannels(updatedChannels);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updatedChannels));
    setIsIdeaModalOpen(false);
    setSelectedChannelForPost(null);
  };

  const getStatusIndicator = (channel: BusinessChannel) => {
    if (channel.status !== 'Active') return { icon: '⚪', label: 'Draft', color: 'text-zinc-400' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(channel.nextPostDueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { icon: '🔴', label: 'Overdue', color: 'text-rose-500', priority: 3 };
    if (diffDays <= 1) return { icon: '🟡', label: 'Due Soon', color: 'text-amber-500', priority: 2 };
    return { icon: '🟢', label: 'On Track', color: 'text-emerald-500', priority: 1 };
  };

  const sortedChannels = [...channels].sort((a, b) => {
    const statusA = getStatusIndicator(a);
    const statusB = getStatusIndicator(b);
    
    // Idea/Paused at the bottom
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    
    // Sort by priority (Overdue > Due Soon > On Track)
    return (statusB.priority || 0) - (statusA.priority || 0);
  });

  if (!isLoaded) return null;

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
            Channels
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest">
            The central database and control layer of your content empire
          </p>
        </div>
        
        <button 
          onClick={openAddModal}
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 uppercase tracking-widest text-[10px] font-black px-6 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-900/10 h-[54px] flex items-center gap-2"
        >
          <Plus size={16} />
          New Channel
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[40px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Status</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Channel Name</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Platform</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Content</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black text-center">Freq</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black text-center">Days Ago</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black text-right">Next Due</th>
                <th className="px-6 py-6 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black"></th>
              </tr>
            </thead>
            <tbody>
              {sortedChannels.length > 0 ? sortedChannels.map(channel => {
                const indicator = getStatusIndicator(channel);
                const lastPosted = new Date(channel.lastPostedDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysSince = Math.floor((today.getTime() - lastPosted.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={channel.id} className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${indicator.label === 'Overdue' ? 'bg-rose-500/[0.02]' : ''}`}>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          channel.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : channel.status === 'Paused'
                            ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${channel.status === 'Active' ? 'bg-emerald-500 animate-pulse' : channel.status === 'Paused' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                          {channel.status}
                        </span>
                        {channel.status === 'Active' && (
                          <span className={`text-[10px] font-bold px-2 ${indicator.color}`}>
                            {indicator.icon} {indicator.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                          {channel.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                        {channel.platform}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-full">
                        {channel.contentType || 'Mixed'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        {channel.postingFrequency}d
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`text-xs font-bold ${daysSince > channel.postingFrequency ? 'text-rose-500' : 'text-zinc-500'}`}>
                        {daysSince}d
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold tracking-tight ${
                          indicator.label === 'Overdue'
                            ? 'text-rose-500'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {channel.nextPostDueDate ? new Date(channel.nextPostDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Date'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {channel.status === 'Active' && (
                          <button
                            onClick={() => markAsPosted(channel.id)}
                            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-2 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                            title="Mark as Posted"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(channel)}
                          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-xl transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Info size={32} className="text-zinc-300" />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">No channels found. Add your first platform!</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Integration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">
                  {editingChannel ? 'Edit Channel' : 'New Channel'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Channel Name</label>
                    <input 
                      required 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Personal Brand, Tech Blog..."
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-lg font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Platform</label>
                      <select 
                        value={formData.platform} 
                        onChange={e => setFormData({...formData, platform: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none font-medium cursor-pointer"
                      >
                        {DEFAULT_PLATFORMS.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {formData.platform === 'Other' && (
                      <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Other Platform Name</label>
                        <input 
                          required 
                          type="text" 
                          value={formData.customPlatform} 
                          onChange={e => setFormData({...formData, customPlatform: e.target.value})} 
                          placeholder="Platform name..."
                          className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Content Type</label>
                      <select 
                        value={formData.contentType} 
                        onChange={e => setFormData({...formData, contentType: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none font-medium cursor-pointer"
                      >
                        {CONTENT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Posting Frequency (Days)</label>
                      <input 
                        required 
                        type="number" 
                        min="1"
                        value={formData.postingFrequency} 
                        onChange={e => setFormData({...formData, postingFrequency: parseInt(e.target.value) || 1})} 
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-lg font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Last Posted Date</label>
                      <input 
                        required 
                        type="date" 
                        value={formData.lastPostedDate} 
                        onChange={e => setFormData({...formData, lastPostedDate: e.target.value})} 
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Current Status</label>
                    <div className="flex gap-2">
                      {['Active', 'Paused', 'Idea'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setFormData({...formData, status: status as 'Active' | 'Paused' | 'Idea'})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            formData.status === status
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg'
                              : 'bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-100 dark:border-zinc-700'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  {editingChannel && (
                    <button 
                      type="button" 
                      onClick={() => deleteChannel(editingChannel.id)} 
                      className="px-6 py-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                    >
                      Delete
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="flex-1 px-8 py-5 rounded-[24px] bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-[1.02] transition-all uppercase tracking-widest text-xs font-black shadow-xl shadow-zinc-900/10"
                  >
                    {editingChannel ? 'Update Channel' : 'Create Channel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Idea Selection Modal */}
      {isIdeaModalOpen && selectedChannelForPost && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                  Select Idea Used
                </h3>
                <button onClick={() => setIsIdeaModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 uppercase tracking-widest font-bold">
                Which idea did you just post?
              </p>

              <div className="space-y-3 max-h-[300px] overflow-y-auto mb-8 pr-2">
                {ideas.filter(i => i.channelId === selectedChannelForPost && i.status === 'Pending').map(idea => (
                  <button
                    key={idea.id}
                    onClick={() => markAsPosted(selectedChannelForPost, idea.id)}
                    className="w-full text-left p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                  >
                    <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      {idea.title}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => markAsPosted(selectedChannelForPost, 'none')}
                className="w-full py-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all"
              >
                Post without an idea from queue
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
