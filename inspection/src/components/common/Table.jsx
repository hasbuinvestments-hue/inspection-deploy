import React from 'react';

export default function Table({ 
  headers, 
  children, 
  emptyMessage = 'No data available.', 
  variant = 'light',
  className = '',
  ...props 
}) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  const isDark = variant === 'dark';

  return (
    <div 
      className={`overflow-x-auto rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'} ${className}`}
      {...props}
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={`${isDark ? 'bg-slate-950 text-emerald-400 border-emerald-500/20' : 'bg-slate-50 text-slate-700 border-slate-200'} border-b text-xs uppercase tracking-wider`}>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className={`text-sm ${isDark ? 'divide-y divide-slate-700' : 'divide-y divide-slate-100'}`}>
          {isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="text-center p-8 text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
