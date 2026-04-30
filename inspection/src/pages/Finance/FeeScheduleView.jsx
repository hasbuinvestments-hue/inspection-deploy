import React, { useState } from 'react';
import { FEE_SCHEDULE } from '../../lib/feeData';

export default function FeeScheduleView() {
  const [search, setSearch] = useState('');
  const categories = Object.keys(FEE_SCHEDULE);

  const filteredData = categories.reduce((acc, cat) => {
    const items = FEE_SCHEDULE[cat].filter(item => 
      item.premise.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase())
    );
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Finance Act 2023 Pricing Matrix</h3>
          <p className="text-sm text-slate-500">Official Nairobi County Pest Control Statutory Rates</p>
        </div>
        <div className="w-1/3">
          <input 
            type="text" 
            placeholder="Search premises or categories..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
        {Object.keys(filteredData).map(cat => (
          <div key={cat} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="bg-slate-800 text-white p-4 font-bold text-sm tracking-wide uppercase">
              {cat}
            </div>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200">
                  <th className="p-3 font-bold text-slate-500 w-2/3">Premise Classification</th>
                  <th className="p-3 font-bold text-slate-500">Pest Control</th>
                  <th className="p-3 font-bold text-slate-500">Audit Fee</th>
                  <th className="p-3 font-bold text-slate-100 bg-emerald-600 text-right">TOTAL KES</th>
                </tr>
              </thead>
              <tbody>
                {filteredData[cat].map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                    <td className="p-3 text-slate-700 font-medium">{item.premise}</td>
                    <td className="p-3 text-slate-500">KES {item.fees.pestControl.toLocaleString()}</td>
                    <td className="p-3 text-slate-500">KES {item.fees.ipmAudit.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-700 bg-emerald-50/30">
                      {Number(item.fees.total).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {Object.keys(filteredData).length === 0 && (
          <div className="text-center p-20 text-slate-400 italic">
            No classifications found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
