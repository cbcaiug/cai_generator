import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Subject, Learner, ScoreData, ColumnConfig } from '../types';
import ColumnMenu from './ColumnMenu';
import { PromptModal, ConfirmModal } from './Dialogs';

interface Props {
  subject: Subject;
  learners: Learner[];
  scores: ScoreData[];
  onScoresChange: (scores: ScoreData[]) => void;
  onDeleteLearner: (id: string) => void;
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  customColumns: ColumnConfig[];
  onCustomColumnsChange: (columns: ColumnConfig[]) => void;
  onLearnerDataChange: (learners: Learner[]) => void;
}

export default function ScoreGrid({ 
  subject, learners, scores, onScoresChange, onDeleteLearner, 
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
     const pctStr = calculatePercentage(learnerId);
     if (!pctStr) return '';
     const pct = parseFloat(pctStr);
     if (pct > 80) return 'text-green-700 bg-green-50 font-bold';
     if (pct >= 60) return 'text-yellow-700 bg-yellow-50 font-bold';
     return 'text-red-700 bg-red-50 font-bold';
  };

  const getScore = (learnerId: string, level: number, type: 'sc' | 'gs') => {
    const scoreRow = scores.find(s => s.learnerId === learnerId);
    return scoreRow?.scores[level]?.[type] ?? '';
  };

  const getAoI = (learnerId: string) => {
    const scoreRow = scores.find(s => s.learnerId === learnerId);
    return scoreRow?.aoi ?? '';
  };

  const isLocked = (colId: string) => {
    return !!customColumns.find(c => c.id === colId)?.isLocked;
  };

  const evaluateFormula = (colId: string, learnerId: string) => {
     const config = customColumns.find(c => c.id === colId);
     if (!config || config.dataType !== 'formula' || !config.formula) return '';
     
     try {
       const scope: Record<string, number> = {};
       scope['aoi'] = Number(getAoI(learnerId)) || 0;
       scope['totals'] = calculateTotal(learnerId) || 0;
       for(let i = 1; i <= 5; i++) {
         scope[`l${i}_sc`] = Number(getScore(learnerId, i, 'sc')) || 0;
         scope[`l${i}_gs`] = Number(getScore(learnerId, i, 'gs')) || 0;
       }
       
       const fn = new Function(...Object.keys(scope), `return ${config.formula};`);
       const result = fn(...Object.values(scope));
       return isNaN(result) ? 'Err' : Number(result.toFixed(2));
     } catch (e) {
       return 'Err';
     }
  };

  const updateScore = (learnerId: string, level: number, type: 'sc' | 'gs', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const existingIndex = scores.findIndex(s => s.learnerId === learnerId);
    
    let newScores = [...scores];
    if (existingIndex > -1) {
      newScores[existingIndex] = {
        ...newScores[existingIndex],
        scores: {
          ...newScores[existingIndex].scores,
          [level]: {
            ...newScores[existingIndex].scores[level],
            [type]: numValue
          }
        }
      };
    } else {
      newScores.push({
        learnerId,
        aoi: null,
        scores: { [level]: { sc: type === 'sc' ? numValue : null, gs: type === 'gs' ? numValue : null } }
      });
    }
    onScoresChange(newScores);
  };

  const updateAoI = (learnerId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const existingIndex = scores.findIndex(s => s.learnerId === learnerId);
    
    let newScores = [...scores];
    if (existingIndex > -1) {
      newScores[existingIndex] = { ...newScores[existingIndex], aoi: numValue };
    } else {
      newScores.push({ learnerId, aoi: numValue, scores: {} });
    }
    onScoresChange(newScores);
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

  const calculateTotal = (learnerId: string) => {
    const scoreRow = scores.find(s => s.learnerId === learnerId);
    if (!scoreRow) return '';
    let sum = 0;
    let anyRequiredLevelMissing = false;

    // Only check levels that are defined and have max scores > 0 in the subject
    subject.levels.forEach(l => {
      if (l.sc_max > 0 || l.gs_max > 0) {
        const sc = scoreRow.scores[l.level]?.sc;
        const gs = scoreRow.scores[l.level]?.gs;
        if (sc === null || sc === undefined || gs === null || gs === undefined) {
          anyRequiredLevelMissing = true;
        } else {
          sum += sc + gs;
        }
      }
    });

    return anyRequiredLevelMissing ? '' : sum;
  };

  const calculatePercentage = (learnerId: string) => {
    const total = calculateTotal(learnerId);
    if (total === '') return '';
    const maxTotal = subject.levels.reduce((acc, l) => acc + l.sc_max + l.gs_max, 0);
    if (maxTotal === 0) return '';
    return ((Number(total) / maxTotal) * 100).toFixed(1);
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
        // If it's an existing custom column or base column alias we store it in customColumns
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
    if (colId === 'aoi') return 'AoI';
    if (colId.startsWith('l')) return `Level ${colId[1]}`;
    if (colId === 'totals') return 'CAI Totals';
    return 'Custom';
  };

  const renderMenu = (colId: string) => (
    <ColumnMenu 
      id={colId}
      title={getColTitle(colId)}
      isCustom={true} // Enabled for all columns so user can re-organize and rename freely
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
        <table className="w-full border-collapse text-sm table-auto">
          <thead>
            {/* Main Headers */}
            <tr className="bg-zinc-50 border-b border-zinc-200">
              {columnOrder.map(colId => {
                if (['index', 'name', 'stream'].includes(colId) || colId.startsWith('custom_')) {
                  const isSticky = freezeCols && ['index', 'name'].includes(colId);
                  const stickyClass = !isSticky ? 'border-r' : colId === 'index' ? 'sticky left-0 bg-zinc-50 z-10 w-12 border-r text-center' : 'sticky left-12 bg-zinc-50 z-10 min-w-48 border-r shadow-[1px_0_0_0_#e4e4e7]';
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
                      colSpan={2} 
                      className={`p-3 text-center border-r border-zinc-200 bg-zinc-100/50 whitespace-nowrap cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors ${draggedColId === colId ? 'opacity-50' : ''}`}
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
              <th className="p-3 w-12 sticky right-0 bg-zinc-50 border-l border-zinc-200 z-10 no-print"></th>
            </tr>

            {/* Sub Headers */}
            <tr className="bg-white border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {columnOrder.map(colId => {
                const isSticky = freezeCols && ['index', 'name'].includes(colId);
                const stickyClass = !isSticky ? 'border-r border-zinc-200' : colId === 'index' ? 'sticky left-0 bg-white z-10 w-12 border-r border-zinc-200 text-center' : 'sticky left-12 bg-white z-10 min-w-48 border-r border-zinc-200 shadow-[1px_0_0_0_#e4e4e7]';
                
                if (colId === 'name') return <th key={colId} className={`p-2 text-right pr-4 ${stickyClass}`}>MAX SCORES &rarr;</th>;
                if (['index', 'stream'].includes(colId) || colId.startsWith('custom_')) return <th key={colId} className={`p-2 ${stickyClass}`}></th>;
                if (colId === 'aoi') return (
                  <React.Fragment key={colId}>
                    <th className="p-2 border-r border-zinc-200 bg-zinc-50 w-16">Pts</th>
                    <th className="p-2 border-r border-zinc-200 bg-zinc-50 w-16">%</th>
                  </React.Fragment>
                );
                if (colId.startsWith('l')) return (
                  <React.Fragment key={colId}>
                    <th className="p-2 border-r border-zinc-100 w-16">SC</th>
                    <th className="p-2 border-r border-zinc-200 w-16">GS</th>
                  </React.Fragment>
                );
                if (colId === 'totals') return (
                  <React.Fragment key={colId}>
                    <th className="p-2 border-r border-zinc-200 bg-zinc-50 w-16">Raw</th>
                    <th className="p-2 border-r border-zinc-200 bg-zinc-50 w-20">%</th>
                  </React.Fragment>
                );
                return null;
              })}
              <th className="p-2 bg-white sticky right-0 z-10 border-l border-zinc-200 shadow-[-1px_0_0_0_#e4e4e7] no-print"></th>
            </tr>

          {/* Max Scores */}
          <tr className="bg-zinc-50/50 border-b border-zinc-200 text-xs font-mono font-medium">
            {columnOrder.map(colId => {
              const isSticky = freezeCols && ['index', 'name'].includes(colId);
              const stickyClass = !isSticky ? 'border-r border-zinc-200' : colId === 'index' ? 'sticky left-0 bg-zinc-50 z-10 w-16 border-r border-zinc-200' : 'sticky left-16 bg-zinc-50 z-10 min-w-48 border-r border-zinc-200 shadow-[1px_0_0_0_#e4e4e7]';

              if (colId === 'index') return <td key={colId} className={`p-2 text-center ${stickyClass}`}>#</td>;
              if (colId === 'name') return <td key={colId} className={`p-2 ${stickyClass}`}>Values from subject config</td>;
              if (['stream'].includes(colId) || colId.startsWith('custom_')) return <td key={colId} className={`p-2 ${stickyClass}`}></td>;
              if (colId === 'aoi') return (
                <React.Fragment key={colId}>
                  <td className="p-2 border-r border-zinc-200 text-center font-bold">{subject.aoi_max}</td>
                  <td className="p-2 border-r border-zinc-200 text-center">100</td>
                </React.Fragment>
              );
              if (colId.startsWith('l')) {
                const levelConfig = subject.levels.find(l => l.level === parseInt(colId[1]));
                return (
                  <React.Fragment key={colId}>
                    <td className="p-2 border-r border-zinc-100 text-center">{levelConfig?.sc_max}</td>
                    <td className="p-2 border-r border-zinc-200 text-center">{levelConfig?.gs_max}</td>
                  </React.Fragment>
                );
              }
              if (colId === 'totals') return (
                <React.Fragment key={colId}>
                  <td className="p-2 border-r border-zinc-200 text-center font-bold">{subject.levels.reduce((acc, l) => acc + l.sc_max + l.gs_max, 0)}</td>
                  <td className="p-2 border-r border-zinc-200 text-center">100</td>
                </React.Fragment>
              );
              return null;
            })}
            <td className="p-2 sticky right-0 bg-zinc-50 z-10 border-l border-zinc-200 shadow-[-1px_0_0_0_#e4e4e7]"></td>
          </tr>
        </thead>

        <tbody>
          {filteredLearners.map((learner, idx) => (
            <tr key={learner.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
              {columnOrder.map(colId => {
                const isSticky = freezeCols && ['index', 'name'].includes(colId);
                if (colId === 'index') return <td key={colId} className={`p-3 text-center border-r border-zinc-100 text-xs text-zinc-400 ${isSticky ? 'sticky left-0 bg-white z-10 w-12' : ''}`}>{idx + 1}</td>;
                if (colId === 'name') return (
                  <td key={colId} className={`p-0 font-medium whitespace-nowrap border-r border-zinc-100 min-w-48 ${isSticky ? 'sticky left-12 bg-white z-10 shadow-[1px_0_0_0_#e4e4e7]' : ''}`}>
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
                    <td className="p-0 border-r border-zinc-100 bg-zinc-50/30 min-w-16 relative">
                      <input type="number" step="0.1" min="0" max={subject.aoi_max} className="w-full h-10 px-2 text-center bg-transparent font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black invalid:text-red-500 invalid:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" value={getAoI(learner.id) ?? ''} onChange={(e) => updateAoI(learner.id, e.target.value)} disabled={isLocked(colId)} />
                    </td>
                    <td className="p-3 text-center border-r border-zinc-100 text-xs font-mono text-zinc-400 min-w-16">
                      {getAoI(learner.id) !== '' ? (((getAoI(learner.id) as number) / subject.aoi_max) * 100).toFixed(0) : '-'}
                    </td>
                  </React.Fragment>
                );
                if (colId.startsWith('l')) {
                  const levelNum = parseInt(colId[1]);
                  const lcfg = subject.levels.find(l => l.level === levelNum);
                  return (
                    <React.Fragment key={colId}>
                      <td className="p-0 border-r border-zinc-50 min-w-16 relative">
                        <input type="number" min="0" max={lcfg?.sc_max} className="w-full h-10 px-2 text-center bg-transparent font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black invalid:text-red-500 invalid:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" value={getScore(learner.id, levelNum, 'sc')} onChange={(e) => updateScore(learner.id, levelNum, 'sc', e.target.value)} disabled={isLocked(colId)} />
                      </td>
                      <td className="p-0 border-r border-zinc-100 min-w-16 relative">
                        <input type="number" min="0" max={lcfg?.gs_max} className="w-full h-10 px-2 text-center bg-transparent font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black invalid:text-red-500 invalid:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" value={getScore(learner.id, levelNum, 'gs')} onChange={(e) => updateScore(learner.id, levelNum, 'gs', e.target.value)} disabled={isLocked(colId)} />
                      </td>
                    </React.Fragment>
                  );
                }
                if (colId === 'totals') {
                  const hl = getFormatHighlight(learner.id);
                  const total = calculateTotal(learner.id);
                  const percentage = calculatePercentage(learner.id);
                  return (
                    <React.Fragment key={colId}>
                      <td className={`p-3 text-center border-r border-zinc-200 font-mono min-w-16 transition-colors ${hl || 'bg-zinc-50 font-bold'}`}>{total !== '' ? total : ''}</td>
                      <td className={`p-3 text-center border-r border-zinc-200 font-mono min-w-16 transition-colors ${hl || 'bg-zinc-50 font-bold'}`}>{percentage !== '' ? `${percentage}%` : ''}</td>
                    </React.Fragment>
                  );
                }
                return null;
              })}
              <td className="p-3 text-center sticky right-0 bg-white border-l border-zinc-200 z-10 shadow-[-1px_0_0_0_#e4e4e7] no-print">
                <button onClick={() => onDeleteLearner(learner.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
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
