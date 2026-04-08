'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from '@/lib/msalConfig';
import { onenoteService } from '@/lib/onenote';
import { Editor } from './Editor';
import { 
  BookOpen, 
  CloudUpload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut,
  ChevronRight,
  Sparkles,
  Plus,
  FileText,
  FolderOpen,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';

export function OneNoteAdvanced() {
  const { instance, accounts, inProgress } = useMsal();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastPageUrl, setLastPageUrl] = useState('');

  // Selection state
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  
  const [selectedNotebookId, setSelectedNotebookId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  
  const [isNewPage, setIsNewPage] = useState(true);
  const [newPageTitle, setNewPageTitle] = useState('');

  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(false);

  // Caching for performance
  const [sectionCache, setSectionCache] = useState<Record<string, any[]>>({});
  const [pageCache, setPageCache] = useState<Record<string, any[]>>({});

  // Use memoization to ensure activeAccount is stable across renders
  const activeAccount = React.useMemo(() => 
    instance.getActiveAccount() || (accounts.length > 0 ? accounts[0] : null),
  [instance, accounts]);

  // Track initial fetch to prevent loops
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

  const fetchNotebooks = useCallback(async (isRefresh = false) => {
    if (!activeAccount || (hasFetchedInitial && !isRefresh) || isLoadingNotebooks) {
      return;
    }
    
    setIsLoadingNotebooks(true);
    setHasFetchedInitial(true);
    setErrorMessage('');
    
    try {
      const data = await onenoteService.getNotebooks();
      if (!data || data.length === 0) {
        setNotebooks([]);
      } else {
        setNotebooks(data);
        const defaultNotebook = data.find((nb: any) => 
          nb.displayName.toLowerCase().includes("journal") || 
          nb.displayName === "My Personal Journal"
        ) || data[0];
        
        setSelectedNotebookId(defaultNotebook.id);
      }
    } catch (error: any) {
      console.error("Failed to fetch notebooks:", error);
      setErrorMessage(`Failed to load notebooks: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingNotebooks(false);
    }
  }, [activeAccount?.homeAccountId, hasFetchedInitial, isLoadingNotebooks]);

  useEffect(() => {
    if (activeAccount && inProgress === InteractionStatus.None && !hasFetchedInitial) {
      fetchNotebooks();
    }
  }, [activeAccount, inProgress, hasFetchedInitial, fetchNotebooks]);

  useEffect(() => {
    if (selectedNotebookId) {
      const fetchSections = async () => {
        // Check cache first
        if (sectionCache[selectedNotebookId]) {
          setSections(sectionCache[selectedNotebookId]);
          if (sectionCache[selectedNotebookId].length > 0) {
            setSelectedSectionId(sectionCache[selectedNotebookId][0].id);
          }
          return;
        }

        setIsLoadingSections(true);
        try {
          const data = await onenoteService.getSections(selectedNotebookId);
          const sectionsData = data || [];
          setSections(sectionsData);
          setSectionCache(prev => ({ ...prev, [selectedNotebookId]: sectionsData }));
          
          setSelectedSectionId('');
          setPages([]);
          setSelectedPageId('');
          if (sectionsData.length > 0) {
            setSelectedSectionId(sectionsData[0].id);
          }
        } catch (error) {
          console.error("Failed to fetch sections", error);
        } finally {
          setIsLoadingSections(false);
        }
      };
      fetchSections();
    }
  }, [selectedNotebookId, sectionCache]);

  useEffect(() => {
    if (selectedSectionId && !isNewPage) {
      const fetchPages = async () => {
        // Check cache first
        if (pageCache[selectedSectionId]) {
          setPages(pageCache[selectedSectionId]);
          if (pageCache[selectedSectionId].length > 0) {
            setSelectedPageId(pageCache[selectedSectionId][0].id);
          }
          return;
        }

        setIsLoadingPages(true);
        try {
          const data = await onenoteService.getPages(selectedSectionId);
          const pagesData = data || [];
          setPages(pagesData);
          setPageCache(prev => ({ ...prev, [selectedSectionId]: pagesData }));
          
          if (pagesData.length > 0) {
            setSelectedPageId(pagesData[0].id);
          }
        } catch (error) {
          console.error("Failed to fetch pages", error);
        } finally {
          setIsLoadingPages(false);
        }
      };
      fetchPages();
    }
  }, [selectedSectionId, isNewPage, pageCache]);

  // Set default title for new page
  useEffect(() => {
    if (isNewPage && !newPageTitle) {
      const date = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      setNewPageTitle(`Journal - ${date}`);
    }
  }, [isNewPage, newPageTitle]);

  const handleLogin = () => {
    if (inProgress === InteractionStatus.None) {
      instance.loginRedirect(loginRequest).catch(e => console.error(e));
    }
  };

  const handleLogout = () => {
    if (inProgress === InteractionStatus.None) {
      instance.logoutRedirect().catch(e => console.error(e));
    }
  };

  const handleSave = async () => {
    if (!content || content === '<p></p>') return;
    if (isNewPage && !newPageTitle) {
      setErrorMessage("Please enter a page title");
      setSaveStatus('error');
      return;
    }
    if (!isNewPage && !selectedPageId) {
      setErrorMessage("Please select a page to append to");
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      let response;
      if (isNewPage) {
        response = await onenoteService.createPage(selectedSectionId, newPageTitle, content);
      } else {
        response = await onenoteService.appendContent(selectedPageId, content);
      }
      
      const pageUrl = response?.links?.oneNoteWebUrl?.href;
      
      setSaveStatus('success');
      setLastPageUrl(pageUrl);
      setContent(''); 
      setTimeout(() => {
        setSaveStatus('idle');
        setLastPageUrl('');
      }, 10000);
    } catch (error: any) {
      console.error('Failed to sync with OneNote', error);
      setSaveStatus('error');
      setErrorMessage(error.message || 'Failed to sync with OneNote');
    } finally {
      setIsSaving(false);
    }
  };

  const isInteractionInProgress = inProgress !== InteractionStatus.None;

  if (inProgress === InteractionStatus.HandleRedirect) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
        <p className="text-zinc-500 font-medium">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 max-w-7xl mx-auto px-4">
      <div className="flex flex-col items-center justify-center gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-[0.2em] uppercase">
            OneNote
          </h1>
        </div>

        <AuthenticatedTemplate>
          <div className="flex flex-col sm:flex-row items-center gap-4">
             <div className="flex items-center gap-3 px-4 py-2 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-300 break-all text-center">
                  {activeAccount?.name} <span className="text-zinc-400 dark:text-zinc-500 font-medium opacity-70">({activeAccount?.username})</span>
                </span>
             </div>
             <button 
              onClick={handleLogout}
              disabled={isInteractionInProgress}
              className="group flex items-center gap-2 px-6 py-3 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all duration-300 border border-transparent hover:border-red-200"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold text-xs uppercase tracking-wider">Logout</span>
            </button>
          </div>
        </AuthenticatedTemplate>
      </div>

      <AuthenticatedTemplate>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12">
          {/* Configuration Panel */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-none transition-all sticky top-24">
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-8 flex items-center gap-3">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <FolderOpen className="w-5 h-5 text-teal-500" />
                </div>
                Environment
              </h3>
              
              <div className="space-y-8">
                {/* Notebook Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Active Notebook</label>
                    <button 
                      onClick={() => fetchNotebooks()}
                      disabled={isLoadingNotebooks}
                      className="p-1 text-zinc-400 hover:text-teal-500 transition-colors disabled:opacity-30"
                      title="Refresh Notebooks"
                    >
                      <RefreshCw size={14} className={isLoadingNotebooks ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="relative group">
                    <select 
                      value={selectedNotebookId}
                      onChange={(e) => setSelectedNotebookId(e.target.value)}
                      disabled={isLoadingNotebooks}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingNotebooks ? <option>Discovering notebooks...</option> : null}
                      {!isLoadingNotebooks && notebooks.length === 0 ? <option>No notebooks found</option> : null}
                      {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.displayName}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-teal-500 transition-colors">
                      <ChevronRight size={20} className="rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Section Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">Target Section</label>
                  <div className="relative group">
                    <select 
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      disabled={isLoadingSections || !selectedNotebookId}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingSections ? <option>Locating sections...</option> : null}
                      {!isLoadingSections && sections.length === 0 ? <option>No sections in this notebook</option> : null}
                      {sections.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-teal-500 transition-colors">
                      <ChevronRight size={20} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />

                {/* Entry Mode Toggle */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1 block text-center">Sync Strategy</label>
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-[1.25rem] border-2 border-zinc-50 dark:border-zinc-800 shadow-inner">
                    <button 
                      onClick={() => setIsNewPage(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-300 ${isNewPage ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-400 shadow-xl shadow-zinc-200/50 dark:shadow-none' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30'}`}
                    >
                      <Plus size={18} />
                      Initialization
                    </button>
                    <button 
                      onClick={() => setIsNewPage(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all duration-300 ${!isNewPage ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-400 shadow-xl shadow-zinc-200/50 dark:shadow-none' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30'}`}
                    >
                      <ArrowRightLeft size={18} />
                      Appendment
                    </button>
                  </div>
                </div>

                {/* Page Selection or Title Input */}
                {isNewPage ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">Page Designation</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        value={newPageTitle}
                        onChange={(e) => setNewPageTitle(e.target.value)}
                        placeholder="New Page Title..."
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all pr-12"
                      />
                      <FileText className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 w-5 h-5 group-focus-within:text-teal-500 transition-colors" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">Target Resource</label>
                    <div className="relative group">
                      <select 
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        disabled={isLoadingPages || !selectedSectionId}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all appearance-none cursor-pointer disabled:opacity-50"
                      >
                        {isLoadingPages ? <option>Indexing pages...</option> : null}
                        {!isLoadingPages && pages.length === 0 ? <option>No pages in this section</option> : null}
                        {pages.map(p => <option key={p.id} value={p.id}>{p.title || 'Untitled Page'}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-teal-500 transition-colors">
                        <ChevronRight size={20} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-10 border border-zinc-200 dark:border-zinc-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] dark:shadow-none transition-all h-full flex flex-col">
              <div className="flex-1 min-h-[500px]">
                <Editor 
                  content={content} 
                  onChange={setContent} 
                  placeholder="The floor is yours. Begin your transcription..."
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-10 border-t border-zinc-100 dark:border-zinc-800 mt-10 gap-6">
                <div className="flex-1 w-full sm:w-auto">
                  {saveStatus === 'success' && (
                    <div className="flex flex-col gap-1.5 items-start animate-in fade-in slide-in-from-left-4 transition-all bg-teal-50 dark:bg-teal-900/10 px-6 py-4 rounded-[1.5rem] border border-teal-500/20 shadow-lg shadow-teal-500/5">
                      <div className="flex items-center gap-3 text-teal-600 dark:text-teal-400 font-black">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="text-lg">Deployment Successful</span>
                      </div>
                      {lastPageUrl && (
                        <a 
                          href={lastPageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-teal-500 hover:text-teal-600 underline font-bold ml-9 flex items-center gap-1 group"
                        >
                          Access via OneNote Web
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                      )}
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-4 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-left-4 transition-all bg-red-50 dark:bg-red-900/10 px-6 py-4 rounded-[1.5rem] border border-red-500/20">
                      <AlertCircle className="w-6 h-6 shrink-0" />
                      <span className="text-base font-bold leading-tight">{errorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      setContent('');
                      setSaveStatus('idle');
                    }}
                    disabled={isSaving || !content || content === '<p></p>'}
                    className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-300 disabled:opacity-30 disabled:grayscale border border-transparent hover:border-red-200"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={isSaving || !content || content === '<p></p>' || !selectedSectionId}
                    className={`
                      flex items-center justify-center gap-3 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-500
                      ${isSaving 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-[1.03] active:scale-95 shadow-lg shadow-zinc-900/20 dark:shadow-white/5 border border-zinc-900 dark:border-white'
                      }
                      disabled:opacity-50 disabled:grayscale
                    `}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4" />
                        Sync
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className="flex flex-col items-center justify-center py-32 px-12 text-center bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[4rem] gap-10 shadow-2xl shadow-zinc-200/50 dark:shadow-none mx-auto max-w-3xl">
          <div className="w-32 h-32 bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-900/10 rounded-[2.5rem] flex items-center justify-center rotate-6 hover:rotate-0 transition-all duration-700 shadow-xl shadow-teal-500/5">
            <BookOpen className="w-16 h-16 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="space-y-4">
            <h4 className="text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Full System Integration</h4>
            <p className="text-zinc-500 dark:text-zinc-400 text-xl font-medium leading-relaxed max-w-lg mx-auto">
              Unlock precise environment selection. Synchronize your thoughts with any notebook, section, and page in your cloud.
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isInteractionInProgress}
            className="flex items-center gap-5 px-12 py-6 bg-[#0078d4] hover:bg-[#005a9e] text-white rounded-[2rem] font-black text-xl transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_25px_50px_-12px_rgba(0,120,212,0.4)] disabled:opacity-50"
          >
            {isInteractionInProgress ? (
              <>
                <Loader2 className="w-7 h-7 animate-spin" />
                Negotiating...
              </>
            ) : (
              <>
                Authorize with Microsoft
                <ChevronRight className="w-7 h-7" />
              </>
            )}
          </button>
        </div>
      </UnauthenticatedTemplate>
    </div>
  );
}
