'use client';

import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';

export function OneNoteJournal() {
  const { instance, accounts, inProgress } = useMsal();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastPageUrl, setLastPageUrl] = useState('');

  const handleLogin = () => {
    // Only trigger if no other login/logout is in progress
    if (inProgress === InteractionStatus.None) {
      instance.loginRedirect(loginRequest).catch(e => {
          console.error("Login redirect failed:", e);
      });
    }
  };

  const handleLogout = () => {
    if (inProgress === InteractionStatus.None) {
      instance.logoutRedirect().catch(e => {
          console.error("Logout redirect failed:", e);
      });
    }
  };

  const handleSave = async () => {
    if (!content || content === '<p></p>') return;

    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const date = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const title = `Journal - ${date}`;
      
      const response = await onenoteService.createOrUpdatePage(title, content);
      
      // If the response is from an existing page (PATCH), it will have the links
      const pageUrl = response?.links?.oneNoteWebUrl?.href;
      
      setSaveStatus('success');
      setLastPageUrl(pageUrl);
      setContent(''); // Clear editor after success
      setTimeout(() => {
        setSaveStatus('idle');
        setLastPageUrl('');
      }, 10000); // Show for longer to allow clicking
    } catch (error: any) {
      console.error('Failed to save journal', error);
      setSaveStatus('error');
      setErrorMessage(error.message || 'Failed to sync with OneNote');
    } finally {
      setIsSaving(false);
    }
  };

  const isInteractionInProgress = inProgress !== InteractionStatus.None;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-all duration-300">
      <div className="flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-2xl">
              <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                OneNote Journal
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Capture your thoughts, sync to the cloud</p>
            </div>
          </div>
          
          <AuthenticatedTemplate>
            <button 
              onClick={handleLogout}
              disabled={isInteractionInProgress}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
              title="Logout from OneNote"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </AuthenticatedTemplate>
        </div>

        {/* Content Area */}
        <AuthenticatedTemplate>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 w-fit">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Connected as {instance.getActiveAccount()?.name || accounts[0]?.name || 'User'}
              </span>
            </div>

            <Editor 
              content={content} 
              onChange={setContent} 
              placeholder="What's on your mind today?"
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                {saveStatus === 'success' && (
                  <div className="flex flex-col gap-1 items-start animate-in fade-in slide-in-from-left-2 transition-all">
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Synced to OneNote!</span>
                    </div>
                    {lastPageUrl && (
                      <a 
                        href={lastPageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-teal-500 hover:text-teal-600 underline ml-7"
                      >
                        View in OneNote
                      </a>
                    )}
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-left-2 transition-all">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{errorMessage}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setContent('');
                    setSaveStatus('idle');
                  }}
                  disabled={isSaving || !content || content === '<p></p>'}
                  className="px-6 py-3 rounded-2xl font-semibold text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-300 disabled:opacity-30 disabled:grayscale"
                >
                  Clear
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving || !content || content === '<p></p>'}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-2xl font-semibold transition-all duration-300
                    ${isSaving 
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105 active:scale-95 shadow-lg shadow-zinc-400/20 dark:shadow-none'
                    }
                    disabled:opacity-50 disabled:grayscale
                  `}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-5 h-5" />
                      Sync to OneNote
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </AuthenticatedTemplate>

        <UnauthenticatedTemplate>
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl gap-6">
            <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mb-2">
              <BookOpen className="w-10 h-10 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="max-w-xs">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Connect Your OneNote</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Sign in with your Microsoft account to securely sync your journals directly to your OneNote notebooks.
              </p>
            </div>
            <button
              onClick={handleLogin}
              disabled={isInteractionInProgress}
              className="flex items-center gap-3 px-8 py-4 bg-[#05a6f0] hover:bg-[#0078d4] text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:grayscale"
            >
              {isInteractionInProgress ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Sign in with Microsoft
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </UnauthenticatedTemplate>

      </div>
    </div>
  );
}
