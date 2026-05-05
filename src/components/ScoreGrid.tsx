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
    if (!scoreRow) return null;
    let sum = 0;
    let allFilled = true;
    for (let i = 1; i <= 5; i++) {
      const sc = scoreRow.scores[i]?.sc;
      const gs = scoreRow.scores[i]?.gs;
      if (sc === null || sc === undefined || gs === null || gs === undefined) {
        allFilled = false;
        break;
      }
      sum += sc + gs;
    }
    return allFilled ? sum : null;
  };

  const calculatePercentage = (learnerId: string) => {
    const total = calculateTotal(learnerId);
    if (total === null) return null;
    const maxTotal = subject.levels.reduce((acc, l) => acc + l.sc_max + l.gs_max, 0);
    return ((total / maxTotal) * 100).toFixed(1);
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
    <div className="overflow-x-auto pb-32">
      <PromptModal 
        isOpen={prompt.isOpen} title={prompt.title} description={prompt.desc} initialValue={prompt.val}
        onClose={() => setPrompt({ ...prompt, isOpen: false })} onConfirm={prompt.onConfirm}
      />
      <ConfirmModal 
        isOpen={confirm.isOpen} title={confirm.title} message={confirm.msg}
        onClose={() => setConfirm({ ...confirm, isOpen: false })} onConfirm={confirm.onConfirm}
      />

      <table className="w-full border-collapse text-sm">
        <thead>
          {/* Main Headers */}
          <tr className="bg-zinc-50 border-b border-zinc-200">
            {columnOrder.map(colId => {
              if (['index', 'name', 'stream'].includes(colId) || colId.startsWith('custom_')) {
                const isSticky = ['index', 'name'].includes(colId);
                const stickyClass = colId === 'index' ? 'sticky left-0 bg-zinc-50 z-10 w-16 border-r' : colId === 'name' ? 'sticky left-16 bg-zinc-50 z-10 min-w-48 border-r' : 'border-r';
                return (
                  <th key={colId} className={`p-3 text-left border-zinc-200 whitespace-nowrap ${stickyClass}`}>
                    {getColTitle(colId)} {renderMenu(colId)}
                  </th>
                );
              }
              if (colId === 'aoi' || colId === 'totals' || colId.startsWith('l')) {
                return (
                  <th key={colId} className="p-3 text-center border-r border-zinc-200 bg-zinc-100/50 min-w-[120px] whitespace-nowrap" colSpan={2}>
                    {getColTitle(colId)} {renderMenu(colId)}
                  </th>
                );
              }
              return null;
            })}
            <th className="p-3 w-10"></th>
          </tr>

          {/* Sub Headers */}
          <tr className="bg-white border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {columnOrder.map(colId => {
              if (colId === 'name') return <th key={colId} className="p-2 border-r border-zinc-200 text-right pr-4">MAX SCORES &rarr;</th>;
              if (['index', 'stream'].includes(colId) || colId.startsWith('custom_')) return <th key={colId} className="p-2 border-r border-zinc-200"></th>;
              if (colId === 'aoi') return (
                <React.Fragment key={colId}>
                  <th className="p-2 border-r border-zinc-200 bg-zinc-50">Pts</th>
                  <th className="p-2 border-r border-zinc-200 bg-zinc-50">%</th>
                </React.Fragment>
              );
              if (colId.startsWith('l')) return (
                <React.Fragment key={colId}>
                  <th className="p-2 border-r border-zinc-100">SC</th>
                  <th className="p-2 border-r border-zinc-200">GS</th>
                </React.Fragment>
              );
              if (colId === 'totals') return (
                <React.Fragment key={colId}>
                  <th className="p-2 border-r border-zinc-200 bg-zinc-50">Raw</th>
                  <th className="p-2 border-r border-zinc-200 bg-zinc-50">%</th>
                </React.Fragment>
              );
              return null;
            })}
            <th className="p-2"></th>
          </tr>

          {/* Max Scores */}
          <tr className="bg-zinc-50/50 border-b border-zinc-200 text-xs font-mono font-medium">
            {columnOrder.map(colId => {
              if (colId === 'index') return <td key={colId} className="p-2 border-r border-zinc-200 text-center">#</td>;
              if (colId === 'name') return <td key={colId} className="p-2 border-r border-zinc-200">Values from subject config</td>;
              if (['stream'].includes(colId) || colId.startsWith('custom_')) return <td key={colId} className="p-2 border-r border-zinc-200"></td>;
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
            <td className="p-2"></td>
          </tr>
        </thead>

        <tbody>
          {learners.map((learner, idx) => (
            <tr key={learner.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
              {columnOrder.map(colId => {
                if (colId === 'index') return <td key={colId} className="p-3 text-center sticky left-0 bg-white border-r border-zinc-100 text-xs text-zinc-400">{idx + 1}</td>;
                if (colId === 'name') return (
                  <td key={colId} className="p-0 font-medium sticky left-16 bg-white border-r border-zinc-100 whitespace-nowrap min-w-48">
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
                    <td className="p-0 border-r border-zinc-100 bg-zinc-50/30 min-w-16">
                      <input type="number" step="0.1" className="w-full h-10 px-2 text-center bg-transparent font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed" value={getAoI(learner.id) ?? ''} onChange={(e) => updateAoI(learner.id, e.target.value)} disabled={isLocked(colId)} />
                    </td>
                    <td className="p-3 text-center border-r border-zinc-100 text-xs font-mono text-zinc-400 min-w-16">
                      {getAoI(learner.id) !== '' ? (((getAoI(learner.id) as number) / subject.aoi_max) * 100).toFixed(0) : '-'}
                    </td>
                  </React.Fragment>
                );
                if (colId.startsWith('l')) {
                  const levelNum = parseInt(colId[1]);
                  return (
                    <React.Fragment key={colId}>
                      <td className="p-0 border-r border-zinc-50 min-w-16">
                        <input type="number" className="w-full h-10 px-2 text-center bg-transparent font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed" value={getScore(learner.id, levelNum, 'sc')} onChange={(e) => updateScore(learner.id, levelNum, 'sc', e.target.value)} disabled={isLocked(colId)} />
                      </td>
                      <td className="p-0 border-r border-zinc-100 min-w-16">
                        <input type="number" className="w-full h-10 px-2 text-center bg-transparent font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed" value={getScore(learner.id, levelNum, 'gs')} onChange={(e) => updateScore(learner.id, levelNum, 'gs', e.target.value)} disabled={isLocked(colId)} />
                      </td>
                    </React.Fragment>
                  );
                }
                if (colId === 'totals') return (
                  <React.Fragment key={colId}>
                    <td className="p-3 text-center border-r border-zinc-200 bg-zinc-50 font-mono font-bold min-w-16">{calculateTotal(learner.id) ?? '-'}</td>
                    <td className="p-3 text-center border-r border-zinc-200 bg-zinc-50 font-mono font-bold min-w-16">{calculatePercentage(learner.id) ?? '-'}%</td>
                  </React.Fragment>
                );
                return null;
              })}
              <td className="p-3 text-center">
                <button onClick={() => onDeleteLearner(learner.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
