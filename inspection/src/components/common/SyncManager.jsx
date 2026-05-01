import React, { useState, useEffect } from 'react';
import { getAllSubmissions, deleteSubmission } from '../../lib/offline-store';
import { apiFetch } from '../../lib/api';

export default function SyncManager() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const checkPending = async () => {
    const pending = await getAllSubmissions();
    setPendingCount(pending.length);
  };

  useEffect(() => {
    checkPending();
    
    const autoSync = () => {
      if (navigator.onLine) {
        handleSync();
      }
    };

    window.addEventListener('online', autoSync);
    const interval = setInterval(checkPending, 30000); 
    
    // Initial check/sync if online
    if (navigator.onLine) handleSync();

    return () => {
      window.removeEventListener('online', autoSync);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError('');
    
    try {
      const pending = await getAllSubmissions();
      for (const item of pending) {
        try {
          if (item.type === 'registration') {
            const url = item.data.id_to_edit 
              ? `/inspections/businesses/${item.data.id_to_edit}/`
              : '/inspections/businesses/';
            await apiFetch(url, {
              method: item.data.id_to_edit ? 'PATCH' : 'POST',
              body: JSON.stringify(item.data)
            });
          } else if (item.type === 'audit') {
            const auditData = { ...item.data };
            
            // Handle pending photos if any
            if (auditData.pending_photos && auditData.pending_photos.length > 0) {
              const photoUrls = [];
              const photoMeta = [];
              const successfullyUploadedIndices = [];

              for (let i = 0; i < auditData.pending_photos.length; i++) {
                const p = auditData.pending_photos[i];
                try {
                  const uploadData = new FormData();
                  uploadData.append('file', p.file);
                  const publicData = await apiFetch('/inspections/upload/', {
                    method: 'POST',
                    body: uploadData
                  });
                  photoUrls.push(publicData.publicUrl);
                  photoMeta.push({ 
                    url: publicData.publicUrl, 
                    name: p.name, 
                    caption: p.caption, 
                    issue: p.issue 
                  });
                  successfullyUploadedIndices.push(i);
                } catch (imgErr) {
                  // Silent fail for individual image, will try again if the whole sync is retried
                }
              }
              
              auditData.photo_urls = [...(auditData.photo_urls || []), ...photoUrls];
              auditData.photo_meta = [...(auditData.photo_meta || []), ...photoMeta];
              
              // Filter out successfully uploaded photos from the pending list
              auditData.pending_photos = auditData.pending_photos.filter((_, idx) => !successfullyUploadedIndices.includes(idx));
              
              // If we still have pending photos (meaning some failed), throw to stop deletion
              if (auditData.pending_photos.length > 0) {
                throw new Error('Some photos failed to upload. Will retry later.');
              } else {
                delete auditData.pending_photos;
              }
            }

            const url = auditData.inspectionId 
              ? `/inspections/inspections/${auditData.inspectionId}/`
              : '/inspections/inspections/';
            await apiFetch(url, {
              method: auditData.inspectionId ? 'PATCH' : 'POST',
              body: JSON.stringify(auditData)
            });
          }
          // Success! Remove from offline store
          await deleteSubmission(item.id);
        } catch (itemErr) {
          // Silent catch for individual items to prevent one failure from blocking others
        }
      }
      await checkPending();
    } catch (err) {
      setError('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (pendingCount === 0 && !syncing) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:w-96 animate-slide-up">
      <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-4 ${
        syncing ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-900 border-slate-700 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            syncing ? 'bg-emerald-100' : 'bg-slate-800'
          }`}>
            {syncing ? (
              <svg className="w-5 h-5 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="text-xl">📡</span>
            )}
          </div>
          <div>
            <p className="font-bold text-sm">
              {syncing ? 'Syncing field data...' : `${pendingCount} Items Pending Sync`}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              {syncing ? 'Connecting to Nairobi Server...' : 'Captured while you were offline'}
            </p>
          </div>
        </div>
        
        {!syncing && (
          <button 
            onClick={handleSync}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            SYNC NOW
          </button>
        )}
      </div>
      {error && (
        <div className="mt-2 p-2 bg-rose-500 text-white text-[10px] text-center rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
