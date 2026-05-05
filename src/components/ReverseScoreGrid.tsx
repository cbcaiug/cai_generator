import React, { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { Subject, Learner, ReverseScoreData, ColumnConfig } from '../types';
import { LEVEL_WEIGHTS } from '../constants';
import ColumnMenu from './ColumnMenu';
import { PromptModal, ConfirmModal } from './Dialogs';

interface Props {
  subject: Subject;
  learners: Learner[];
  reverseScores: ReverseScoreData[];
  onReverseScoresChange: (scores: ReverseScoreData[]) => void;
  onDeleteLearner: (id: string) => void;
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  customColumns: ColumnConfig[];
  onCustomColumnsChange: (columns: ColumnConfig[]) => void;
  onLearnerDataChange: (learners: Learner[]) => void;
}

export default function ReverseScoreGrid({ 
  subject, learners, reverseScores, onReverseScoresChange, onDeleteLearner,
  columnOrder, onColumnOrderChange, customColumns, onCustomColumnsChange, onLearnerDataChange
}: Props) {
  
  const [prompt, setPrompt] = useState<{ isOpen: boolean; title: string; desc: string; val: string; onConfirm: (v: string) => void }>({
    isOpen: false, title: '', desc: '', val: '', onConfirm: () => {}
  });

  const [confirm, setConfirm] = useState<{ isOpen: boolean; title: string; msg: string; onConfirm: () => void }>({
    isOpen: false, title: '', msg: '', onConfirm: () => {}
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [freezeCols, setFreezeCols] = useState(true);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);

  const filteredLearners = learners.filter(l => {
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (streamFilter && l.stream !== streamFilter) return false;
    return true;
  });
  const uniqueStreams = Array.from(new Set(learners.map(l => l.stream).filter(Boolean)));

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (draggedColId && draggedColId !== targetColId) {
      const idx1 = columnOrder.indexOf(draggedColId);
      const idx2 = columnOrder.indexOf(targetColId);
      if (idx1 > -1 && idx2 > -1) {
        const newOrder = [...columnOrder];
        newOrder.splice(idx1, 1);
        newOrder.splice(idx2, 0, draggedColId);
        onColumnOrderChange(newOrder);
      }
    }
    setDraggedColId(null);
  };

  const getFormatHighlight = (learnerId: string) => {
     const data = getReverseData(learnerId);
     const pct = data?.caiPercentage ?? null;
     if (pct === null) return '';
     if (pct > 80) return 'text-green-700 bg-green-50 font-bold';
     if (pct >= 60) return 'text-yellow-700 bg-yellow-50 font-bold';
     return 'text-red-700 bg-red-50 font-bold';
  };

  const getReverseData = (learnerId: string) => {
    return reverseScores.find(s => s.learnerId === learnerId);
  };

  const isLocked = (colId: string) => {
    return !!customColumns.find(c => c.id === colId)?.isLocked;
  };

  const evaluateFormula = (colId: string, learnerId: string) => {
     const config = customColumns.find(c => c.id === colId);
     if (!config || config.dataType !== 'formula' || !config.formula) return '';
     
     try {
       const scope: Record<string, number> = {};
       const data = getReverseData(learnerId);
       scope['aoi'] = data?.aoiPercentage || 0;
       scope['totals'] = data?.caiPercentage || 0;
       for(let i = 1; i <= 5; i++) {
         const sc = calculateDerivedScore(learnerId, i, 'sc');
         const gs = calculateDerivedScore(learnerId, i, 'gs');
         scope[`l${i}_sc`] = typeof sc === 'number' ? sc : 0;
         scope[`l${i}_gs`] = typeof gs === 'number' ? gs : 0;
       }
       
       const fn = new Function(...Object.keys(scope), `return ${config.formula};`);
       const result = fn(...Object.values(scope));
       return isNaN(result) ? 'Err' : Number(result.toFixed(2));
     } catch (e) {
       return 'Err';
     }
  };

  const updateReverseScore = (learnerId: string, field: 'aoiPercentage' | 'caiPercentage', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const existingIndex = reverseScores.findIndex(s => s.learnerId === learnerId);
    
    let newScores = [...reverseScores];
    if (existingIndex > -1) {
      newScores[existingIndex] = { ...newScores[existingIndex], [field]: numValue };
    } else {
      newScores.push({
        learnerId,
        aoiPercentage: field === 'aoiPercentage' ? numValue : null,
        caiPercentage: field === 'caiPercentage' ? numValue : null
      });
    }
    onReverseScoresChange(newScores);
  };

  const updateCustomData = (learnerId: string, colId: string, value: string) => {
    const updated = learners.map(l => {
      if (l.id === learnerId) {
        return { ...l, customData: { ...l.customData, [colId]: value } };
      }
      return l;
    });
    onLearnerDataChange(updated);
  };

  const calculateDerivedScore = (learnerId: string, level: number, type: 'sc' | 'gs') => {
    const data = getReverseData(learnerId);
    if (!data || data.caiPercentage === null) return '-';

    const weight = LEVEL_WEIGHTS[level as keyof typeof LEVEL_WEIGHTS];
    const maxTotal = subject.levels.reduce((acc, l) => acc + l.sc_max + l.gs_max, 0);
    
    const denominator = subject.levels.reduce((acc, l) => {
      const w = LEVEL_WEIGHTS[l.level as keyof typeof LEVEL_WEIGHTS];
      return acc + (l.sc_max + l.gs_max) * w;
    }, 0);

    if (denominator === 0) return '-';

    const targetTotalCAI = (data.caiPercentage / 100) * maxTotal;
    const maxForThisCell = type === 'sc' ? subject.levels.find(l => l.level === level)!.sc_max : subject.levels.find(l => l.level === level)!.gs_max;
    
    const result = Math.round((maxForThisCell * weight * targetTotalCAI) / denominator);
    return Math.min(result, maxForThisCell);
  };

  const calculateTotal = (learnerId: string) => {
    let sum = 0;
    const data = getReverseData(learnerId);
    if (!data || data.caiPercentage === null) return '-';

    for (let i = 1; i <= 5; i++) {
      const sc = calculateDerivedScore(learnerId, i, 'sc') as number;
      const gs = calculateDerivedScore(learnerId, i, 'gs') as number;
      sum += sc + gs;
    }
    return sum;
  };

  const moveColumn = (colId: string, direction: 1 | -1) => {
    const idx = columnOrder.indexOf(colId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= columnOrder.length) return;
    const newOrder = [...columnOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    onColumnOrderChange(newOrder);
  };

  const addCustomColumn = (targetColId: string, direction: 1 | -1) => {
    setPrompt({
      isOpen: true,
      title: 'Add New Column',
      desc: 'Enter a name for the new column.',
      val: '',
      onConfirm: (title) => {
        const newId = `custom_${Date.now()}`;
        const newCustoms = [...customColumns, { id: newId, title }];
        onCustomColumnsChange(newCustoms);
        
        const idx = columnOrder.indexOf(targetColId);
        const insertIdx = direction === 1 ? idx + 1 : idx;
        const newOrder = [...columnOrder];
        newOrder.splice(insertIdx, 0, newId);
        onColumnOrderChange(newOrder);
      }
    });
  };

  const renameColumn = (colId: string) => {
    const currentTitle = getColTitle(colId);
    setPrompt({
      isOpen: true,
      title: 'Rename Column',
      desc: 'Enter a new name for this column.',
      val: currentTitle,
      onConfirm: (title) => {
        const existing = customColumns.find(c => c.id === colId);
        if (existing) {
          onCustomColumnsChange(customColumns.map(c => c.id === colId ? { ...c, title } : c));
        } else {
          onCustomColumnsChange([...customColumns, { id: colId, title }]);
        }
      }
    });
  };

  const deleteColumn = (colId: string) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Column',
      msg: 'Are you sure you want to remove this column from the view? Formulas may adapt dynamically.',
      onConfirm: () => {
        if (colId.startsWith('custom_')) {
          onCustomColumnsChange(customColumns.filter(c => c.id !== colId));
        }
        onColumnOrderChange(columnOrder.filter(id => id !== colId));
      }
    });
  };

  const getColTitle = (colId: string) => {
    const alias = customColumns.find(c => c.id === colId)?.title;
    if (alias) return alias;

    if (colId === 'index') return 'No.';
    if (colId === 'name') return 'Learner Name';
    if (colId === 'stream') return 'Stream';
    if (colId === 'aoi') return 'AoI Data';
    if (colId.startsWith('l')) return `Level ${colId[1]}`;
    if (colId === 'totals') return 'CAI Totals';
    return 'Custom';
  };

  const renderMenu = (colId: string) => (
    <ColumnMenu 
      id={colId}
      title={getColTitle(colId)}
      isCustom={true}
      onMoveLeft={() => moveColumn(colId, -1)}
      onMoveRight={() => moveColumn(colId, 1)}
      onAddLeft={() => addCustomColumn(colId, -1)}
      onAddRight={() => addCustomColumn(colId, 1)}
      onRename={() => renameColumn(colId)}
      onDelete={() => deleteColumn(colId)}
    />
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-zinc-200">
      <div className="p-4 border-b border-zinc-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-50 rounded-t-xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search learners..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input w-full md:w-64"
          />
          <select 
            value={streamFilter} 
            onChange={(e) => setStreamFilter(e.target.value)}
            className="premium-input w-full md:w-40"
          >
            <option value="">All Streams</option>
            {uniqueStreams.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-600 flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={freezeCols} 
              onChange={(e) => setFreezeCols(e.target.checked)}
              className="rounded border-zinc-300 text-black focus:ring-black"
            />
            Freeze Left Columns
          </label>
        </div>
      </div>
      
      {learners.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-400">
          <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-4 border border-zinc-100 shadow-sm shadow-zinc-200/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
          </div>
          <p className="text-base text-zinc-600 font-medium mb-1">No learners found</p>
          <p className="text-sm">Click 'Add Learner' at the top to start registering students.</p>
        </div>
      ) : (
      <div className="overflow-x-auto pb-32">
      <PromptModal 
        isOpen={prompt.isOpen} title={prompt.title} description={prompt.desc} initialValue={prompt.val}
        onClose={() => setPrompt({ ...prompt, isOpen: false })} onConfirm={prompt.onConfirm}
      />
      <ConfirmModal 
        isOpen={confirm.isOpen} title={confirm.title} message={confirm.msg}
        onClose={() => setConfirm({ ...confirm, isOpen: false })} onConfirm={confirm.onConfirm}
      />

      <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center gap-3 text-xs text-zinc-500">
        <AlertCircle size={14} className="text-orange-500" />
        <p>Entry Mode: Enter percentages to back-calculate raw scores.</p>
      </div>
      
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            {columnOrder.map(colId => {
              if (['index', 'name', 'stream'].includes(colId) || colId.startsWith('custom_')) {
                const isSticky = freezeCols && ['index', 'name'].includes(colId);
                const stickyClass = !isSticky ? 'border-r' : colId === 'index' ? 'sticky left-0 bg-zinc-50 z-10 w-16 border-r' : 'sticky left-16 bg-zinc-50 z-10 min-w-48 border-r shadow-[1px_0_0_0_#e4e4e7]';
                return (
                  <th 
                    key={colId} 
                    className={`p-3 text-left border-zinc-200 whitespace-nowrap ${stickyClass} cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors ${draggedColId === colId ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, colId)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, colId)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{getColTitle(colId)}</span>
                      {renderMenu(colId)}
                    </div>
                  </th>
                );
              }
              if (colId === 'aoi' || colId === 'totals' || colId.startsWith('l')) {
                return (
                  <th 
                    key={colId} 
                    className={`p-3 text-center border-r border-zinc-200 bg-zinc-100/50 min-w-[120px] whitespace-nowrap cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors ${draggedColId === colId ? 'opacity-50' : ''}`} 
                    colSpan={2}
                    draggable
                    onDragStart={(e) => handleDragStart(e, colId)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, colId)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 text-center font-bold">{getColTitle(colId)}</span>
                      {renderMenu(colId)}
                    </div>
                  </th>
                );
              }
              return null;
            })}
            <th className="p-3 w-12 sticky right-0 bg-zinc-50 border-l border-zinc-200 z-10"></th>
          </tr>
          <tr className="bg-white border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {columnOrder.map(colId => {
              const isSticky = freezeCols && ['index', 'name'].includes(colId);
              const stickyClass = !isSticky ? 'border-r border-zinc-200' : colId === 'index' ? 'sticky left-0 bg-white z-10 w-16 border-r border-zinc-200' : 'sticky left-16 bg-white z-10 min-w-48 border-r border-zinc-200 shadow-[1px_0_0_0_#e4e4e7]';
              if (['index', 'name', 'stream'].includes(colId) || colId.startsWith('custom_')) return <th key={colId} className={`p-2 ${stickyClass}`}></th>;
              if (colId === 'aoi') return (
                <React.Fragment key={colId}>
                  <th className="p-2 border-r border-zinc-200 bg-orange-100/50 min-w-24">%AoI Input</th>
                  <th className="p-2 border-r border-zinc-200 text-zinc-400 min-w-24">AoI/3 Calc</th>
                </React.Fragment>
              );
              if (colId === 'totals') return (
                <React.Fragment key={colId}>
                  <th className="p-2 border-r border-zinc-200 bg-orange-100/50 min-w-24">%CAI Input</th>
                  <th 
                    className="p-2 border-r border-zinc-200 bg-zinc-100/80 min-w-24 relative group cursor-help"
                    title="This value is calculated based on weighted difficulty and the %CAI input"
                  >
                    Total Calc
                  </th>
                </React.Fragment>
              );
              if (colId.startsWith('l')) return (
                <React.Fragment key={colId}>
                  <th className="p-2 border-r border-zinc-100 min-w-16">SC (Calc)</th>
                  <th className="p-2 border-r border-zinc-200 min-w-16">GS (Calc)</th>
                </React.Fragment>
              );
              return null;
            })}
            <th className="p-2 sticky right-0 bg-white border-l border-zinc-200 shadow-[-1px_0_0_0_#e4e4e7] z-10"></th>
          </tr>
        </thead>

        <tbody>
          {filteredLearners.map((learner, idx) => (
            <tr key={learner.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
              {columnOrder.map(colId => {
                const isSticky = freezeCols && ['index', 'name'].includes(colId);
                if (colId === 'index') return <td key={colId} className={`p-3 text-center border-r border-zinc-100 text-xs text-zinc-400 ${isSticky ? 'sticky left-0 bg-white z-10' : ''}`}>{idx + 1}</td>;
                if (colId === 'name') return (
                  <td key={colId} className={`p-0 font-medium whitespace-nowrap border-r border-zinc-100 min-w-48 ${isSticky ? 'sticky left-16 bg-white z-10 shadow-[1px_0_0_0_#e4e4e7]' : ''}`}>
                    <input 
                      type="text"
                      className="w-full h-full min-h-[44px] px-3 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black disabled:text-zinc-600 disabled:bg-zinc-50/50"
                      value={learner.name}
                      disabled={isLocked(colId)}
                      onChange={(e) => {
                        const updated = learners.map(l => l.id === learner.id ? { ...l, name: e.target.value } : l);
                        onLearnerDataChange(updated);
                      }}
                    />
                  </td>
                );
                if (colId === 'stream') return (
                  <td key={colId} className="p-0 text-zinc-500 border-r border-zinc-100 min-w-24">
                    <input 
                      type="text"
                      className="w-full h-full min-h-[44px] px-3 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black disabled:text-zinc-500 disabled:bg-zinc-50/50"
                      value={learner.stream}
                      disabled={isLocked(colId)}
                      onChange={(e) => {
                        const updated = learners.map(l => l.id === learner.id ? { ...l, stream: e.target.value } : l);
                        onLearnerDataChange(updated);
                      }}
                    />
                  </td>
                );
                if (colId.startsWith('custom_')) {
                  const colConfig = customColumns.find(c => c.id === colId);
                  const isFormula = colConfig?.dataType === 'formula';
                  
                  return (
                    <td key={colId} className={`p-0 border-r border-zinc-100 ${isFormula ? 'bg-zinc-50/50' : ''}`}>
                      {isFormula ? (
                        <div className="w-full h-10 px-3 flex items-center text-zinc-600 font-mono text-xs">
                          {evaluateFormula(colId, learner.id)}
                        </div>
                      ) : (
                        <input 
                          type={colConfig?.dataType === 'number' || colConfig?.dataType === 'percentage' ? 'number' : 'text'}
                          className="w-full h-10 px-3 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black disabled:text-zinc-400 disabled:bg-zinc-50/50"
                          value={learner.customData?.[colId] || ''}
                          disabled={colConfig?.isLocked}
                          onChange={(e) => updateCustomData(learner.id, colId, e.target.value)}
                        />
                      )}
                    </td>
                  );
                }
                if (colId === 'aoi') return (
                  <React.Fragment key={colId}>
                    <td className="p-0 border-r border-zinc-100 bg-orange-50/20 relative">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-full h-10 px-2 text-center bg-transparent font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500 invalid:text-red-500 invalid:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={getReverseData(learner.id)?.aoiPercentage ?? ''}
                        onChange={(e) => updateReverseScore(learner.id, 'aoiPercentage', e.target.value)}
                        disabled={isLocked(colId)}
                        placeholder="%"
                      />
                    </td>
                    <td className="p-3 text-center border-r border-zinc-100 text-xs font-mono font-bold text-zinc-600 bg-zinc-50/50">
                      {getReverseData(learner.id)?.aoiPercentage !== null && getReverseData(learner.id)?.aoiPercentage !== undefined
                        ? ((getReverseData(learner.id)!.aoiPercentage! / 100) * subject.aoi_max).toFixed(1)
                        : '-'}
                    </td>
                  </React.Fragment>
                );
                if (colId === 'totals') {
                  const hl = getFormatHighlight(learner.id);
                  return (
                    <React.Fragment key={colId}>
                      <td className="p-0 border-r border-zinc-100 bg-orange-50/20 relative">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          className={`w-full h-10 px-2 text-center bg-transparent font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500 invalid:text-red-500 invalid:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed ${hl ? hl.replace('bg-', 'placeholder-').replace('text-', '') : ''}`}
                          value={getReverseData(learner.id)?.caiPercentage ?? ''}
                          onChange={(e) => updateReverseScore(learner.id, 'caiPercentage', e.target.value)}
                          disabled={isLocked(colId)}
                          placeholder="%"
                        />
                      </td>
                      <td className={`p-3 text-center border-r border-zinc-200 font-mono font-bold transition-colors ${hl || 'bg-zinc-100'}`}>
                        {calculateTotal(learner.id)}
                      </td>
                    </React.Fragment>
                  );
                }
                if (colId.startsWith('l')) {
                  const levelNum = parseInt(colId[1]);
                  return (
                    <React.Fragment key={colId}>
                      <td className="p-3 text-center border-r border-zinc-50 font-mono text-emerald-600 bg-emerald-50/10 whitespace-nowrap">
                        {calculateDerivedScore(learner.id, levelNum, 'sc')}
                      </td>
                      <td className="p-3 text-center border-r border-zinc-100 font-mono text-emerald-600 bg-emerald-50/10 whitespace-nowrap">
                        {calculateDerivedScore(learner.id, levelNum, 'gs')}
                      </td>
                    </React.Fragment>
                  );
                }
                return null;
              })}
              <td className="p-3 text-center sticky right-0 bg-white border-l border-zinc-200 z-10 shadow-[-1px_0_0_0_#e4e4e7]">
                <button 
                  onClick={() => onDeleteLearner(learner.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    )}
    </div>
  );
}
