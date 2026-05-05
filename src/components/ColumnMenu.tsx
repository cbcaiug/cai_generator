import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, ArrowLeft, ArrowRight, Plus, Pencil, Trash2 } from 'lucide-react';

interface ColumnMenuProps {
  id: string;
  title: string;
  isCustom: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export default function ColumnMenu({
  id,
  title,
  isCustom,
  onMoveLeft,
  onMoveRight,
  onAddLeft,
  onAddRight,
  onRename,
  onDelete
}: ColumnMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block ml-1 align-middle" ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1 text-zinc-400 hover:text-black hover:bg-zinc-200/50 rounded transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white rounded-lg shadow-xl border border-zinc-200 z-50 py-1 text-sm font-normal text-left">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 border-b border-zinc-100 uppercase tracking-wider">
            {title}
          </div>
          <div className="p-1">
            <button onClick={() => { onMoveLeft(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-zinc-700 font-medium">
              <ArrowLeft size={14} className="text-zinc-400" /> Move Left
            </button>
            <button onClick={() => { onMoveRight(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-zinc-700 font-medium">
              <ArrowRight size={14} className="text-zinc-400" /> Move Right
            </button>
            
            <div className="h-px bg-zinc-100 my-1 mx-2" />
            
            <button onClick={() => { onAddLeft(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-zinc-700 font-medium">
              <Plus size={14} className="text-zinc-400" /> Add Left
            </button>
            <button onClick={() => { onAddRight(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-zinc-700 font-medium">
              <Plus size={14} className="text-zinc-400" /> Add Right
            </button>

            <div className="h-px bg-zinc-100 my-1 mx-2" />
            
            <button onClick={() => { onRename?.(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-50 rounded text-zinc-700 font-medium">
              <Pencil size={14} className="text-zinc-400" /> Rename
            </button>
            <button onClick={() => { onDelete?.(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-red-50 text-red-600 rounded font-medium">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
