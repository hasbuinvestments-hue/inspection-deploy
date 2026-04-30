import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import nairobiLogo from '/nairobi_logo.png';

// Placeholders for modularization
import InspectionForm from './InspectionForm';
import PHODashboardStats from './PHODashboardStats';
import PHODrafts from './PHODrafts';
import PHOActionRequired from './PHOActionRequired';
import PHOArchive from './PHOArchive';
import PHOApplications from './PHOApplications';

export default function PHO() {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'new' | 'drafts' | 'issues' | 'archive'
  const [selectedDraft, setSelectedDraft] = useState(null);

  const handleLogout = () => {
    logout();
  };

  const onResume = (draft) => {
    setSelectedDraft(draft);
    setActiveTab('new');
  };

  return (
    <div className="pho-shell">
      <div className="pho-container">
        <header className="pho-header">
          <div className="pho-user-card">
            <p>PHO Officer</p>
            <strong>{profile?.full_name}</strong>
            <button onClick={handleLogout} className="pho-logout-btn">Logout</button>
          </div>
          <div className="pho-logo-wrap">
            <img src={nairobiLogo} alt="Logo" className="pho-logo" />
          </div>
          <h1 className="pho-title">Nairobi City <span>Government</span></h1>
          <p className="pho-subtitle">Integrated Pest Control Management Audit System</p>
        </header>

        <div className="pho-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            className={`pho-tab ${activeTab === 'apply' ? 'active' : ''}`}
          >
            🎯 Apply for Audit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`pho-tab ${activeTab === 'new' ? 'active' : ''}`}
          >
            📋 Inspection Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`pho-tab ${activeTab === 'drafts' ? 'active' : ''}`}
          >
            📝 My Drafts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('issues')}
            className={`pho-tab ${activeTab === 'issues' ? 'active' : ''}`}
          >
            ⚠️ Action Required
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`pho-tab ${activeTab === 'archive' ? 'active' : ''}`}
          >
            📜 History Archive
          </button>
        </div>

        <div className="fade-in py-6">
          <PHODashboardStats profile={profile} />
          
          {activeTab === 'apply' && (
            <PHOApplications 
              profile={profile} 
              onApplied={() => setActiveTab('new')} 
            />
          )}

          {activeTab === 'new' && (
            <InspectionForm
              profile={profile}
              initialData={selectedDraft}
              onComplete={() => {
                setSelectedDraft(null);
                setActiveTab('archive');
              }}
            />
          )}

          {activeTab === 'drafts' && <PHODrafts profile={profile} onResume={onResume} />}
          {activeTab === 'issues' && <PHOActionRequired profile={profile} onResume={onResume} />}
          {activeTab === 'archive' && <PHOArchive profile={profile} onResume={onResume} />}
        </div>
      </div>
    </div>
  );
}
