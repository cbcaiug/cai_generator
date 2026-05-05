import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { Learner } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (learners: Learner[]) => void;
}

export default function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Learners Template');
      
      worksheet.columns = [
        { header: 'Full Name (Required)', key: 'name', width: 30 },
        { header: 'Stream/Class (Optional)', key: 'stream', width: 20 },
      ];

      // Add some examples
      worksheet.addRow({ name: 'John Doe', stream: 'Class A' });
      worksheet.addRow({ name: 'Jane Smith', stream: 'Class B' });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Learners_Import_Template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };



  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      
      const newLearners: Learner[] = [];
      let headerRowIndex = 1;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === headerRowIndex) return; // skip header
        
        const nameVal = row.getCell(1).value;
        const streamVal = row.getCell(2).value;

        const name = nameVal ? nameVal.toString().trim() : '';
        const stream = streamVal ? streamVal.toString().trim() : '';

        if (name) {
          newLearners.push({
            id: uuidv4(),
            name,
            stream
          });
        }
      });

      if (newLearners.length === 0) {
        throw new Error('No valid learner names found in the file. Make sure the first column contains the names.');
      }

      onImport(newLearners);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error processing the Excel file. Please ensure it follows the template format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
      >
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xl font-bold font-display tracking-tight flex items-center gap-2">
            <Upload size={20} className="text-blue-500" />
            Import Learners
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-zinc-900 mb-2">1. Download Template (Optional)</h3>
            <p className="text-zinc-500 mb-3">Download our spreadsheet template to ensure your data is formatted correctly before importing.</p>
            <button 
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className={cn(
                "flex items-center gap-2 font-medium transition-all px-4 py-2 rounded-lg",
                downloadSuccess 
                ? "bg-green-50 text-green-700 border border-green-100" 
                : "bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              )}
            >
              {isDownloadingTemplate ? (
                 <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 size={16} />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              {downloadSuccess ? 'Downloaded!' : 'Download Excel Template'}
            </button>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h3 className="font-semibold text-zinc-900 mb-2">2. Upload Excel File</h3>
            <p className="text-zinc-500 mb-3">Upload your filled <code>.xlsx</code> file.</p>
            
            <div className="flex flex-col gap-3">
              <input 
                type="file" 
                accept=".xlsx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setError('');
                }}
                className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-zinc-800 file:cursor-pointer cursor-pointer border border-zinc-200 rounded-xl p-2"
              />
              
              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 hover:text-black font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="px-6 py-2 bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Import Data
          </button>
        </div>
      </motion.div>
    </div>
  );
}
