import React from 'react';

export default function Pagination({ 
  page, 
  totalPages, 
  onPrev, 
  onNext, 
  label,
  className = '',
  ...props 
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex justify-between items-center mt-4 ${className}`} {...props}>
      <span className="text-sm text-slate-700 font-medium">
        Page {page + 1} of {totalPages}
        {label && ` (${label})`}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-3 py-1.5 border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 border border-slate-200 rounded text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
