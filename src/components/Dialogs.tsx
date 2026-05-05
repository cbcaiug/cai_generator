import React, { useState, useEffect } from 'react';

interface PromptProps {
  isOpen: boolean;
  title: string;
  description?: string;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (val: string) => void;
}

export function PromptModal({ isOpen, title, description, initialValue = '', onClose, onConfirm }: PromptProps) {
  const [val, setVal] = useState(initialValue);
  
  useEffect(() => { 
    if (isOpen) setVal(initialValue);
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
        <input 
          autoFocus 
          className="w-full mt-4 bg-white border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all rounded-md shadow-sm" 
          value={val} 
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onConfirm(val.trim()); onClose(); } }}
        />
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-md transition-colors">Cancel</button>
          <button onClick={() => { if(val.trim()){ onConfirm(val.trim()); onClose(); } }} className="px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-zinc-800 transition-colors shadow-sm">Save</button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ isOpen, title, message, onClose, onConfirm }: ConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">{title}</h3>
        {message && <p className="text-sm text-zinc-500 mt-1">{message}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-md transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm">Delete</button>
        </div>
      </div>
    </div>
  );
}
