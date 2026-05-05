/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onClose: () => void;
  onSave: (name: string, stream: string) => void;
}

export default function AddLearnerModal({ onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [stream, setStream] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), stream.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-display font-semibold text-lg">Add New Learner</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learner Name</label>
            <input
              autoFocus
              required
              type="text"
              className="premium-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Stream</label>
            <input
              type="text"
              className="premium-input"
              placeholder="e.g. A"
              value={stream}
              onChange={(e) => setStream(e.target.value)}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="premium-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="premium-button-primary flex-1"
            >
              Save Learner
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
