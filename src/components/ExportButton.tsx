import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { Download, Loader2 } from 'lucide-react';
import { Subject, Learner, ScoreData, ReverseScoreData, ColumnConfig } from '../types';
import { LEVEL_WEIGHTS } from '../constants';

interface Props {
  subject: Subject;
  learners: Learner[];
  scores: ScoreData[];
  reverseScores: ReverseScoreData[];
  columnOrder: string[];
  customColumns: ColumnConfig[];
}

export default function ExportButton({ subject, learners, scores, reverseScores, columnOrder, customColumns }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  // Helper to convert 1-based index to Excel letter (1=A, 2=B...)
  const getColLetter = (num: number) => {
    let s = '';
    let t;
    while (num > 0) {
      t = (num - 1) % 26;
      s = String.fromCharCode(65 + t) + s;
      num = ((num - t) / 26) | 0;
    }
    return s;
  };

  const getColTitle = (colId: string) => {
    const alias = customColumns.find(c => c.id === colId)?.title;
    if (alias) return alias;

    if (colId === 'index') return 'No.';
    if (colId === 'name') return 'Learner Name';
    if (colId === 'stream') return 'Stream';
    if (colId === 'aoi') return 'AoI';
    if (colId.startsWith('l')) return `L${colId[1]}`;
    if (colId === 'totals') return 'Totals';
    return 'Custom';
  };

  const generateColMap = () => {
    const map = new Map<string, { start: number; span: number }>();
    let currentIdx = 1;
    columnOrder.forEach(col => {
      if (['aoi', 'totals', 'l1', 'l2', 'l3', 'l4', 'l5'].includes(col)) {
        map.set(col, { start: currentIdx, span: 2 });
        currentIdx += 2;
      } else {
        map.set(col, { start: currentIdx, span: 1 });
        currentIdx += 1;
      }
    });
    return { map, totalWidth: currentIdx - 1 };
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CAI Score Manager';
      workbook.created = new Date();

      const { map: colMap, totalWidth } = generateColMap();
      const lastColLetter = getColLetter(totalWidth);

      // --- 1. SCORE SHEET ---
      const scoreSheet = workbook.addWorksheet('Score Sheet', {
        views: [{ state: 'frozen', ySplit: 4, xSplit: colMap.get('name')?.start || 2 }]
      });

      // Headers Row 1 (Main)
      scoreSheet.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = scoreSheet.getCell('A1');
      titleCell.value = `${subject.name} - ${subject.class} (Term ${subject.term}) CAI Score Sheet`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };

      // Headers Row 2 (Info)
      scoreSheet.getRow(2).values = ['Subject', subject.name, 'Class', subject.class, 'Term', subject.term, 'Year', new Date().getFullYear()];
      scoreSheet.getRow(2).font = { bold: true };

      // Headers Row 3 (Column Titles)
      const headerRow3 = scoreSheet.getRow(3);
      columnOrder.forEach(col => {
        const info = colMap.get(col);
        if (!info) return;
        const cell = headerRow3.getCell(info.start);
        if (info.span === 1) {
          cell.value = getColTitle(col);
        } else if (col === 'aoi') {
          cell.value = 'AoI Pts';
          headerRow3.getCell(info.start + 1).value = '%AoI';
        } else if (col === 'totals') {
          cell.value = 'Total CAI';
          headerRow3.getCell(info.start + 1).value = '%CAI';
        } else if (col.startsWith('l')) {
          cell.value = `${getColTitle(col)} SC`;
          headerRow3.getCell(info.start + 1).value = `${getColTitle(col)} GS`;
        }
      });
      
      headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow3.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Max Scores Row 4
      const maxTotal = subject.levels.reduce((acc, l) => acc + l.sc_max + l.gs_max, 0);
      const headerRow4 = scoreSheet.getRow(4);
      
      columnOrder.forEach(col => {
        const info = colMap.get(col);
        if (!info) return;
        if (col === 'name') {
           headerRow4.getCell(info.start).value = 'MAX SCORES →';
        } else if (col === 'aoi') {
           headerRow4.getCell(info.start).value = subject.aoi_max;
           headerRow4.getCell(info.start + 1).value = 100;
        } else if (col === 'totals') {
           headerRow4.getCell(info.start).value = maxTotal;
           headerRow4.getCell(info.start + 1).value = 100;
        } else if (col.startsWith('l')) {
           const lcfg = subject.levels.find(l => l.level === parseInt(col[1]));
           if (lcfg) {
             headerRow4.getCell(info.start).value = lcfg.sc_max;
             headerRow4.getCell(info.start + 1).value = lcfg.gs_max;
           }
        }
      });

      headerRow4.font = { bold: true };
      headerRow4.eachCell((cell) => {
        if (!cell.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F5' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Populate Data
      learners.forEach((learner, idx) => {
        const rowIndex = 5 + idx;
        const row = scoreSheet.getRow(rowIndex);
        const lScores = scores.find(s => s.learnerId === learner.id);
        
        columnOrder.forEach(col => {
          const info = colMap.get(col);
          if (!info) return;
          
          if (col === 'index') row.getCell(info.start).value = idx + 1;
          else if (col === 'name') row.getCell(info.start).value = learner.name;
          else if (col === 'stream') row.getCell(info.start).value = learner.stream;
          else if (col.startsWith('custom_')) row.getCell(info.start).value = learner.customData?.[col] || '';
          else if (col === 'aoi') {
            row.getCell(info.start).value = lScores?.aoi ?? null;
            const aoiColLetter = getColLetter(info.start);
            row.getCell(info.start + 1).value = { formula: `IF(${aoiColLetter}${rowIndex}="","",ROUND(${aoiColLetter}${rowIndex}/${aoiColLetter}$4*100,0))` };
          } else if (col.startsWith('l')) {
            const level = parseInt(col[1]);
            row.getCell(info.start).value = lScores?.scores[level]?.sc ?? null;
            row.getCell(info.start + 1).value = lScores?.scores[level]?.gs ?? null;
          } else if (col === 'totals') {
            const sumParts: string[] = [];
            for (let i = 1; i <= 5; i++) {
               const lmap = colMap.get(`l${i}`);
               if (lmap) {
                 sumParts.push(`${getColLetter(lmap.start)}${rowIndex}`, `${getColLetter(lmap.start + 1)}${rowIndex}`);
               }
            }
            if (sumParts.length > 0) {
               const sumRange = sumParts.join(',');
               row.getCell(info.start).value = { formula: `IF(COUNT(${sumRange})<10,"",SUM(${sumRange}))` };
               const totalsColLetter = getColLetter(info.start);
               row.getCell(info.start + 1).value = { formula: `IF(${totalsColLetter}${rowIndex}="","",ROUND(${totalsColLetter}${rowIndex}/${totalsColLetter}$4*100,0))` };
            }
          }
        });
      });

      // --- 2. REVERSE SCORE SHEET ---
      const reverseSheet = workbook.addWorksheet('Reverse Score Sheet', {
        views: [{ state: 'frozen', ySplit: 5, xSplit: colMap.get('name')?.start || 2 }]
      });

      const getWeightedFormula = (colLtr: string, rowIndex: number, weight: number) => {
        let denomTerms: string[] = [];
        subject.levels.forEach(l => {
             const cmap = colMap.get(`l${l.level}`);
             if(cmap) {
                 const scLetter = getColLetter(cmap.start);
                 const gsLetter = getColLetter(cmap.start + 1);
                 const w = LEVEL_WEIGHTS[l.level as keyof typeof LEVEL_WEIGHTS];
                 denomTerms.push(`$${scLetter}$4*${w}+$${gsLetter}$4*${w}`);
             }
        });
        const denom = `(${denomTerms.join('+')})`;
        
        const totMap = colMap.get('totals');
        if (!totMap) return "0";
        const caiInputLetter = getColLetter(totMap.start);
        const caiTotalLetter = getColLetter(totMap.start + 1);
        
        const calculation = `ROUND(${colLtr}$4*${weight}*$${caiInputLetter}${rowIndex}/100*$${caiTotalLetter}$4/${denom},0)`;
        return `IF($${caiInputLetter}${rowIndex}="","",IF(${denom}=0,"",MIN(${colLtr}$4, ${calculation})))`;
      };

      reverseSheet.mergeCells(`A1:${lastColLetter}1`);
      reverseSheet.getCell('A1').value = `REVERSE CALCULATION: ${subject.name} - ${subject.class}`;
      reverseSheet.getCell('A1').font = { bold: true, size: 14 };

      const revRow4 = reverseSheet.getRow(4);
      columnOrder.forEach(col => {
        const info = colMap.get(col);
        if (!info) return;
        if (col === 'name') {
           revRow4.getCell(info.start).value = 'MAX SCORES →';
        } else if (col === 'aoi') {
           revRow4.getCell(info.start).value = 100; // % Input Max doesn't really apply, using 100
           revRow4.getCell(info.start + 1).value = subject.aoi_max;
        } else if (col === 'totals') {
           revRow4.getCell(info.start).value = 100; // CAI Input
           revRow4.getCell(info.start + 1).value = maxTotal;
        } else if (col.startsWith('l')) {
           const lcfg = subject.levels.find(l => l.level === parseInt(col[1]));
           if (lcfg) {
             revRow4.getCell(info.start).value = lcfg.sc_max;
             revRow4.getCell(info.start + 1).value = lcfg.gs_max;
           }
        }
      });
      revRow4.font = { bold: true };

      const revHeaderRow = reverseSheet.getRow(5);
      columnOrder.forEach(col => {
        const info = colMap.get(col);
        if (!info) return;
        const cell = revHeaderRow.getCell(info.start);
        if (info.span === 1) {
          cell.value = getColTitle(col);
        } else if (col === 'aoi') {
          cell.value = '%AoI (Input)';
          revHeaderRow.getCell(info.start + 1).value = 'AoI/3 (Calc)';
        } else if (col === 'totals') {
          cell.value = '%CAI (Input)';
          revHeaderRow.getCell(info.start + 1).value = 'Total (Calc)';
        } else if (col.startsWith('l')) {
          cell.value = `${getColTitle(col)} SC`;
          revHeaderRow.getCell(info.start + 1).value = `${getColTitle(col)} GS`;
        }
      });
      revHeaderRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      learners.forEach((learner, idx) => {
        const rowIndex = 6 + idx;
        const row = reverseSheet.getRow(rowIndex);
        const rData = reverseScores.find(s => s.learnerId === learner.id);

        columnOrder.forEach(col => {
          const info = colMap.get(col);
          if (!info) return;
          
          if (col === 'index') row.getCell(info.start).value = idx + 1;
          else if (col === 'name') row.getCell(info.start).value = learner.name;
          else if (col === 'stream') row.getCell(info.start).value = learner.stream;
          else if (col.startsWith('custom_')) row.getCell(info.start).value = learner.customData?.[col] || '';
          else if (col === 'aoi') {
            row.getCell(info.start).value = rData?.aoiPercentage ?? null;
            row.getCell(info.start).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
            const inputLetter = getColLetter(info.start);
            const calcLetter = getColLetter(info.start + 1);
            row.getCell(info.start + 1).value = { formula: `IF(${inputLetter}${rowIndex}="","",ROUND(${inputLetter}${rowIndex}/100*${calcLetter}$4,1))` };
          } else if (col === 'totals') {
            row.getCell(info.start).value = rData?.caiPercentage ?? null;
            row.getCell(info.start).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };
            
            const calcCols: string[] = [];
            for (let i = 1; i <= 5; i++) {
               const lmap = colMap.get(`l${i}`);
               if (lmap) {
                 calcCols.push(`${getColLetter(lmap.start)}${rowIndex}`, `${getColLetter(lmap.start + 1)}${rowIndex}`);
               }
            }
            if (calcCols.length > 0) {
               row.getCell(info.start + 1).value = { formula: `SUM(${calcCols.join(',')})` };
            }
          } else if (col.startsWith('l')) {
            const level = parseInt(col[1]);
            const weight = LEVEL_WEIGHTS[level as keyof typeof LEVEL_WEIGHTS];
            row.getCell(info.start).value = { formula: getWeightedFormula(getColLetter(info.start), rowIndex, weight) };
            row.getCell(info.start + 1).value = { formula: getWeightedFormula(getColLetter(info.start + 1), rowIndex, weight) };
          }
        });
      });

      // --- 3. GUIDE SHEET ---
      const guideSheet = workbook.addWorksheet('User Guide');
      guideSheet.columns = [{ width: 30 }, { width: 100 }];
      guideSheet.addRow(['S3/S4 AoI & CAI Score Sheet — USER GUIDE']).font = { bold: true, size: 16 };
      guideSheet.addRow([]);
      guideSheet.addRow(['1. PREPARATION', 'Do This First']);
      guideSheet.addRow(['Enter Max Scores', 'On the Score Sheet, find the MAX SCORES row (Row 4). Enter defaults from the subject config.']);
      guideSheet.addRow(['2. DATA ENTRY', 'Score Sheet']);
      guideSheet.addRow(['AoI Score', 'Enter raw Pts out of max (e.g. 2.5 out of 3). %AoI handles the rest.']);
      guideSheet.addRow(['3. REVERSE SHEET', 'Special Feature']);
      guideSheet.addRow(['The "Orange" Cells', 'Enter ONLY the percentages in the orange columns. The sheet will back-calculate raw scores.']);
      guideSheet.addRow(['Difficulty Weights', 'L1 = 1.25, L2 = 1.10, L3 = 1.00, L4 = 0.85, L5 = 0.70.']);

      // Final styling for all sheets
      workbook.eachSheet((sheet) => {
        sheet.getRow(1).height = 25;
        sheet.columns.forEach(col => {
          if (!col.width) col.width = 12;
        });
      });

      // Generate and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${subject.name}_${subject.class}_Scores_${new Date().toISOString().slice(0,10)}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      disabled={isExporting}
      onClick={handleExport}
      className="premium-button-primary flex items-center gap-2 group w-10 h-10 md:w-auto md:h-auto justify-center md:px-5 md:py-2 p-0 rounded-full md:rounded-full shrink-0"
    >
      {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />}
      <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export to Spreadsheet'}</span>
    </button>
  );
}
