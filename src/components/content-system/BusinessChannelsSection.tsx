"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { DEFAULT_PLATFORMS, CONTENT_TYPES, type BusinessChannel, type ContentIdea } from '@/types/content-system';

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
    customContentType: '',
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
      contentType: 'Posts',
      customContentType: '',
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
      contentType: CONTENT_TYPES.includes(channel.contentType || '') ? (channel.contentType || 'Posts') : 'Other',
      customContentType: CONTENT_TYPES.includes(channel.contentType || '') ? '' : (channel.contentType || ''),
      status: channel.status,
      postingFrequency: channel.postingFrequency,
      lastPostedDate: channel.lastPostedDate
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const platform = formData.platform === 'Other' ? formData.customPlatform : formData.platform;
    const contentType = formData.contentType === 'Other' ? formData.customContentType : formData.contentType;
    const lastPostedDate = new Date(formData.lastPostedDate);
    const nextDueDate = new Date(lastPostedDate);
    nextDueDate.setDate(lastPostedDate.getDate() + formData.postingFrequency);

    const newChannel: BusinessChannel = {
      id: editingChannel ? editingChannel.id : crypto.randomUUID(),
      name: formData.name,
      platform: platform || 'Other',
      contentType: contentType || 'Other',
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

    if (ideaId) {
      const updatedIdeas = ideas.map(idea => 
        idea.id === ideaId ? { ...idea, status: 'Completed' as const } : idea
      );
      setIdeas(updatedIdeas);
      setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, JSON.stringify(updatedIdeas));
    }

    setChannels(updatedChannels);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updatedChannels));
    setIsIdeaModalOpen(false);
    setSelectedChannelForPost(null);
  };

  const getStatusIndicator = (channel: BusinessChannel) => {
    if (channel.status !== 'Active') return { label: 'draft', color: 'text-zinc-400', priority: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(channel.nextPostDueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'overdue', color: 'text-rose-500', priority: 3 };
    if (diffDays <= 1) return { label: 'due soon', color: 'text-amber-500', priority: 2 };
    return { label: 'on track', color: 'text-emerald-500', priority: 1 };
  };

  const getPlatformDotColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'bg-rose-400';
    if (p.includes('youtube')) return 'bg-red-400';
    if (p.includes('linkedin')) return 'bg-blue-400';
    return 'bg-zinc-400';
  };

  const sortedChannels = [...channels].sort((a, b) => {
    const statusA = getStatusIndicator(a);
    const statusB = getStatusIndicator(b);
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return (statusB.priority || 0) - (statusA.priority || 0);
  });

  if (!isLoaded) return null;

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">
            System Channels
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest font-bold">
            The operational layer of your content distribution
          </p>
        </div>

        <button 
          onClick={openAddModal}
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-3.5 rounded-2xl text-xs uppercase tracking-widest font-black shadow-md hover:scale-[1.02] active:scale-95 transition-all"
        >
          New Channel
        </button>
      </div>

      {/* Table View (Desktop) */}
      <div className="hidden lg:block bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500">Status</th>
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500">Channel Name</th>
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500">Platform</th>
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500">Category</th>
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500 text-center">Freq</th>
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500 text-center">Velocity</th>
                <th className="px-8 py-6 text-[11px] uppercase tracking-widest font-black text-zinc-500 text-right">Next Due</th>
                <th className="px-8 py-6"></th>
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
                  <tr key={channel.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <td className="px-8 py-6">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${indicator.color}`}>
                        {indicator.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {channel.name}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPlatformDotColor(channel.platform)} opacity-80`} />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-tight">
                          {channel.platform}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                        {channel.contentType || 'Mixed'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 font-bold">
                        {channel.postingFrequency}d
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-xs font-black ${daysSince > channel.postingFrequency ? 'text-rose-500' : 'text-zinc-500'}`}>
                        {daysSince}d
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`text-sm font-bold tracking-tight ${indicator.label === 'overdue' ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {channel.nextPostDueDate ? new Date(channel.nextPostDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {channel.status === 'Active' && (
                          <button
                            onClick={() => markAsPosted(channel.id)}
                            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest"
                          >
                            Mark Posted
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(channel)}
                          className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <span className="text-xs text-zinc-400 uppercase tracking-widest font-black">No channels detected</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View (Mobile) */}
      <div className="lg:hidden space-y-4">
        {sortedChannels.length > 0 ? sortedChannels.map(channel => {
          const indicator = getStatusIndicator(channel);
          const lastPosted = new Date(channel.lastPostedDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const daysSince = Math.floor((today.getTime() - lastPosted.getTime()) / (1000 * 60 * 60 * 24));

          return (
            <div key={channel.id} className="p-6 rounded-[32px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 space-y-5">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPlatformDotColor(channel.platform)} opacity-80`} />
                    <span className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      {channel.platform}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                    {channel.name}
                  </span>
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest ${indicator.color}`}>
                  {indicator.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Freq</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{channel.postingFrequency}d</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Velocity</span>
                  <span className={`text-sm font-bold ${daysSince > channel.postingFrequency ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>{daysSince}d</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Due</span>
                  <span className={`text-sm font-bold ${indicator.label === 'overdue' ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {channel.nextPostDueDate ? new Date(channel.nextPostDueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => openEditModal(channel)}
                  className="flex-1 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-2xl"
                >
                  Edit
                </button>
                {channel.status === 'Active' && (
                  <button
                    onClick={() => markAsPosted(channel.id)}
                    className="flex-[2] py-3.5 text-xs font-black uppercase tracking-widest bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl shadow-md"
                  >
                    Mark Posted
                  </button>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="p-12 text-center bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[32px]">
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-black">No channels found</span>
          </div>
        )}
      </div>

      {/* Modal Integration */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingChannel ? 'Edit Channel' : 'New Channel'}
        onSubmit={handleSubmit}
        submitText={editingChannel ? 'Update' : 'Create'}
        accentColor="purple"
      >
        <DynamicForm
          sections={[
            {
              id: 'channel_basic',
              title: '',
              fields: [
                { name: 'name', label: 'Channel Name', type: 'text', required: true, fullWidth: true, placeholder: 'Operational title...' },
                {
                  name: 'platform', label: 'Platform', type: 'select' as const,
                  options: DEFAULT_PLATFORMS.map(p => ({ label: p, value: p }))
                },
                ...(formData.platform === 'Other' ? [{ name: 'customPlatform', label: 'Other Platform', type: 'text' as const, required: true }] : []),
                {
                  name: 'contentType', label: 'Category', type: 'select' as const,
                  options: CONTENT_TYPES.map(t => ({ label: t, value: t }))
                },
                ...(formData.contentType === 'Other' ? [{ name: 'customContentType', label: 'Other Category', type: 'text' as const, required: true }] : []),
                { name: 'postingFrequency', label: 'Frequency (Days)', type: 'number', min: 1, required: true },
                { name: 'lastPostedDate', label: 'Last Posting', type: 'date', required: true }
              ]
            }
          ]}
          formData={formData}
          accentColor="purple"
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
        />

        <div className="flex flex-col gap-3 mt-8">
          <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Operation Status</label>
          <div className="flex gap-2">
            {['Active', 'Paused', 'Idea'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({...formData, status: status as 'Active' | 'Paused' | 'Idea'})}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                  formData.status === status
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 shadow-sm'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-500'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {editingChannel && (
          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 mt-8">
            <button 
              type="button" 
              onClick={() => deleteChannel(editingChannel.id)} 
              className="text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
            >
              Delete Lifecycle
            </button>
          </div>
        )}
      </Modal>

      {/* Idea Selection Modal */}
      <Modal
        isOpen={isIdeaModalOpen && !!selectedChannelForPost}
        onClose={() => setIsIdeaModalOpen(false)}
        title="Link Queue Item"
      >
        <div className="pb-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">
            Associate this post with a pending idea
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto mb-8 pr-2">
            {ideas.filter(i => i.channelId === selectedChannelForPost && i.status === 'Pending').map(idea => (
              <button
                key={idea.id}
                onClick={() => markAsPosted(selectedChannelForPost!, idea.id)}
                className="w-full text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all bg-zinc-50/50 dark:bg-zinc-900/40"
              >
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {idea.title}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => markAsPosted(selectedChannelForPost!, 'none')}
            className="w-full py-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all"
          >
            Standalone Post
          </button>
        </div>
      </Modal>
    </section>
  );
}
