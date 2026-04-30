import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import ReportViewerModal from '../../components/common/ReportViewerModal';

export default function NccgReviewModal({ inspection, onClose, refetch }) {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!inspection) return null;

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to officially approve this inspection and release it for payment?')) return;
    setLoading(true);
    try {
      await apiFetch(`/inspections/inspections/${inspection.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
      });
      
      onClose();
      refetch();
    } catch (e) {
      alert("Error approving: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert("Please provide a structured decline reason via notes.");
      return;
    }
    if (!confirm('Are you sure you want to decline this inspection back to the PHO?')) return;
    setLoading(true);
    try {
      await apiFetch(`/inspections/inspections/${inspection.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          approval_status: 'declined',
          decline_reason: 'review_failed',
          nccg_notes: rejectReason
        })
      });
      
      onClose();
      refetch();
    } catch (e) {
      alert("Error declining: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const actions = {
    onApprove: handleApprove,
    onReject: handleReject,
    loading: loading,
    notes: rejectReason,
    setNotes: setRejectReason
  };

  return (
    <ReportViewerModal 
      inspection={inspection} 
      onClose={onClose} 
      actions={inspection.approval_status === 'pending' ? actions : null} 
    />
  );
}
