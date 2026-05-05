import React, { useState } from 'react';
import { ColumnConfig } from '../types';
import { Settings2, Lock, Unlock, AlignLeft, Type, Hash, Percent, FormInput } from 'lucide-react';
import { DEFAULT_COLUMN_ORDER } from '../constants';

interface Props {
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  customColumns: ColumnConfig[];
  onCustomColumnsChange: (columns: ColumnConfig[]) => void;
}

export default function Settings({ columnOrder, onColumnOrderChange, customColumns, onCustomColumnsChange }: Props) {
  
  const getColConfig = (colId: string): ColumnConfig => {
    const existing = customColumns.find(c => c.id === colId);
    if (existing) return existing;
    
    // Default fallback
    let title = 'Custom';
    let dataType: ColumnConfig['dataType'] = 'text';

    if (colId === 'index') { title = 'No.'; dataType = 'number'; }
    else if (colId === 'name') { title = 'Learner Name'; dataType = 'text'; }
    else if (colId === 'stream') { title = 'Stream'; dataType = 'text'; }
    else if (colId === 'aoi') { title = 'AoI Data'; dataType = 'number'; }
    else if (colId.startsWith('l')) { title = `Level ${colId[1]}`; dataType = 'number'; }
    else if (colId === 'totals') { title = 'CAI Totals'; dataType = 'number'; }

    return { id: colId, title, dataType };
  };

  const updateConfig = (colId: string, updates: Partial<ColumnConfig>) => {
    const existing = customColumns.find(c => c.id === colId);
    if (existing) {
      onCustomColumnsChange(customColumns.map(c => c.id === colId ? { ...c, ...updates } : c));
    } else {
      onCustomColumnsChange([...customColumns, { ...getColConfig(colId), ...updates }]);
    }
  };

  const resetOrder = () => {
    if(confirm("Are you sure you want to reset the column order to default?")) {
        onColumnOrderChange(DEFAULT_COLUMN_ORDER);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h2 className="text-2xl font-bold font-display tracking-tight flex items-center gap-3">
          <Settings2 className="text-zinc-400" />
          Column Settings
        </h2>
        <p className="text-zinc-500 mt-2">Manage column formulas, data types, and lock states.</p>
      </div>

      <div className="bg-white border md:rounded-xl border-zinc-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
             <h3 className="font-semibold px-2">Active Columns</h3>
             <button onClick={resetOrder} className="text-sm text-zinc-500 hover:text-black hover:underline">Reset Default Order</button>
        </div>
        <div className="divide-y divide-zinc-100">
          {columnOrder.map((colId, index) => {
            const config = getColConfig(colId);
            return (
              <div key={colId} className="p-4 flex items-start gap-4 hover:bg-zinc-50/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-500 shrink-0 mt-1">
                  {index + 1}
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Title / Alias</label>
                    <input 
                      type="text" 
                      value={config.title} 
                      onChange={(e) => updateConfig(colId, { title: e.target.value })}
                      className="w-full h-9 px-3 text-sm border border-zinc-200 rounded-md focus:border-black focus:ring-1 focus:ring-black outline-none"
                    />
                  </div>

                  {/* Data Type */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Data Type</label>
                    <div className="relative">
                      <select 
                        value={config.dataType || 'text'}
                        onChange={(e) => updateConfig(colId, { dataType: e.target.value as any })}
                        className="w-full h-9 pl-9 pr-3 text-sm border border-zinc-200 rounded-md focus:border-black focus:ring-1 focus:ring-black outline-none appearance-none"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="percentage">Percentage</option>
                        <option value="formula">Formula (Calc)</option>
                      </select>
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                        {config.dataType === 'number' ? <Hash size={14} /> : 
                         config.dataType === 'percentage' ? <Percent size={14} /> : 
                         config.dataType === 'formula' ? <FormInput size={14} /> : 
                         <Type size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Formula String (If formula) */}
                  <div className="lg:col-span-2">
                    <label className="flex items-center justify-between text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">
                       <span>Formula</span>
                       {config.dataType !== 'formula' && <span className="text-[10px] normal-case font-normal">(Requires 'Formula' type)</span>}
                    </label>
                    <input 
                      type="text" 
                      value={config.formula || ''} 
                      onChange={(e) => updateConfig(colId, { formula: e.target.value })}
                      disabled={config.dataType !== 'formula'}
                      placeholder={config.dataType === 'formula' ? "e.g. l1_sc + l1_gs" : "Not applicable"}
                      className="w-full h-9 px-3 text-sm border border-zinc-200 rounded-md focus:border-black focus:ring-1 focus:ring-black outline-none disabled:bg-zinc-50 disabled:text-zinc-400 font-mono"
                    />
                  </div>
                </div>

                {/* Lock Toggle */}
                <div className="flex flex-col items-center justify-center shrink-0 w-12 pt-6">
                  <button 
                    onClick={() => updateConfig(colId, { isLocked: !config.isLocked })}
                    className={`p-2 rounded-md transition-colors ${config.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-400 hover:text-black hover:bg-zinc-200'}`}
                    title={config.isLocked ? "Unlock column" : "Lock column form edits"}
                  >
                    {config.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
