import React from 'react';

// Generates the appropriate class based on color types mappings from index.css
export default function Badge({ children, type = 'gray', className = '', ...props }) {
  const badgeColors = {
    green: 'bg-green-100 text-green-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  const cssClass = badgeColors[type] || badgeColors.gray;
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cssClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
