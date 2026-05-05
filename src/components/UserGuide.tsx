/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, AlertCircle, Info, Download, Target, Users } from 'lucide-react';

export default function UserGuide() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-900">User Guide</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          Learn how to effectively manage, calculate, and export Continuous Assessment Instrument (CAI) scores.
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
              <Target size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg">1. Preparation</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-zinc-600">
            <p>
              <strong>Select Subject & Class:</strong> Use the dropdown menu in the top right corner to select the subject and class you are recording scores for. This automatically sets up the correct maximum scores for AoI, Subject Competencies (SC), and Generic Skills (GS) across all levels.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
              <Users size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg">2. Managing Learners</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-zinc-600">
            <p>
              <strong>Add a Learner:</strong> Click the "Add Learner" button to enter a student's name and class stream. They will appear in both the Standard and Reverse score sheets.
            </p>
            <p>
              <strong>Delete a Learner:</strong> Click the trash icon at the right end of a learner's row to remove them completely from the system.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
              <BookOpen size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg">3. Standard Score Sheet</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-zinc-600">
            <p>Use the Standard Score Sheet to record actual raw marks obtained by learners.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>AoI:</strong> Enter the Average Activity of Integration raw score. The percentage will calculate automatically.</li>
              <li><strong>Level Scores:</strong> Enter the raw marks for SC and GS at each level (1-5).</li>
              <li><strong>Totals:</strong> The Total CAI and %CAI will calculate automatically <em>only</em> when all SC and GS scores across all 5 levels are entered.</li>
            </ul>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="bg-orange-50 border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <RefreshCcwIcon size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg text-orange-900">4. Reverse Calculation</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-zinc-600">
            <p>This mode back-calculates individual SC and GS scores from known overall percentages.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Input Fields (Orange headers):</strong> You only need to enter <strong>%AoI</strong> and/or <strong>%CAI</strong> for a learner.</li>
              <li><strong>Auto-generation:</strong> The system uses a difficulty-weighted distribution to distribute the %CAI across the levels appropriately, simulating realistic assessment results.</li>
              <li><strong>Note:</strong> This is a predictive estimate based on psychomotor taxonomy progression and should not replace actual recorded marks when available.</li>
            </ul>
          </div>
        </section>
        
        <section className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
              <Download size={18} />
            </div>
            <h3 className="font-display font-semibold text-lg">5. Exporting Data</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-zinc-600">
            <p>
              Click "Export to Spreadsheet" to download an Excel file containing all your data. The exported file includes the Standard Score Sheet, the Reverse Score Sheet, and a User Guide sheet. 
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-800">
              <Info size={20} className="shrink-0 mt-0.5" />
              <p>The exported Excel file retains all automatic calculation formulas, so you can continue working on it offline!</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// Temporary icon component since we didn't import RefreshCcw at the top
function RefreshCcwIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 21v-5h5"/>
    </svg>
  );
}
