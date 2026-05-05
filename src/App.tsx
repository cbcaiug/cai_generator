/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Download,
  Table,
  RefreshCcw,
  Info,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  Upload,
  Cloud,
  CloudUpload,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import {
  Subject,
  Learner,
  ScoreData,
  ReverseScoreData,
  ColumnConfig,
} from "./types";
import { SUBJECTS } from "./data/subjects";
import { STORAGE_KEYS, LEVEL_WEIGHTS, DEFAULT_COLUMN_ORDER } from "./constants";
import ScoreGrid from "./components/ScoreGrid";
import ReverseScoreGrid from "./components/ReverseScoreGrid";
import AddLearnerModal from "./components/AddLearnerModal";
import ImportModal from "./components/ImportModal";
import ExportButton from "./components/ExportButton";
import UserGuide from "./components/UserGuide";
import Settings from "./components/Settings";
import LoginModal from "./components/LoginModal";
import { auth, logOut, saveToCloud, loadFromCloud } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Cloud Sync State
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Automatically attempt to load cloud data on login
        try {
          const cloudData = await loadFromCloud(currentUser.uid);
          if (cloudData) {
            if (cloudData.learners) setLearners(cloudData.learners);
            if (cloudData.scores) setScores(cloudData.scores);
            if (cloudData.reverseScores) setReverseScores(cloudData.reverseScores);
            if (cloudData.columnOrder) setColumnOrder(cloudData.columnOrder);
            if (cloudData.customColumns) setCustomColumns(cloudData.customColumns);
          }
        } catch (error) {
          console.error("Could not load initial data", error);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(
    SUBJECTS[0].name,
  );
  const [selectedClassName, setSelectedClassName] = useState<string>(
    SUBJECTS[0].class,
  );

  // Derive the active subject configuration
  const selectedSubject: Subject = React.useMemo(() => {
    const match = SUBJECTS.find(
      (s) => s.name === selectedSubjectName && s.class === selectedClassName,
    );
    if (match) return match;

    // Fallback for custom subject/class combination built dynamically
    return {
      id: `${selectedSubjectName.toLowerCase()}-${selectedClassName.toLowerCase()}`,
      code: "custom",
      name: selectedSubjectName,
      class: selectedClassName,
      term: 1,
      aoi_max: 3,
      levels: SUBJECTS[0].levels,
    };
  }, [selectedSubjectName, selectedClassName]);

  const uniqueSubjectNames = Array.from(new Set(SUBJECTS.map((s) => s.name)));
  const uniqueClasses = ["S1", "S2", "S3", "S4", "S5", "S6"];
  const [learners, setLearners] = useState<Learner[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEARNERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [scores, setScores] = useState<ScoreData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCORES);
    return saved ? JSON.parse(saved) : [];
  });
  const [reverseScores, setReverseScores] = useState<ReverseScoreData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REVERSE_SCORES);
    return saved ? JSON.parse(saved) : [];
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLUMN_ORDER);
    return saved ? JSON.parse(saved) : DEFAULT_COLUMN_ORDER;
  });
  const [customColumns, setCustomColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_COLUMNS);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeSection, setActiveSection] = useState<
    "guide" | "standard" | "reverse" | "settings"
  >("guide");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEARNERS, JSON.stringify(learners));
  }, [learners]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.REVERSE_SCORES,
      JSON.stringify(reverseScores),
    );
  }, [reverseScores]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.COLUMN_ORDER,
      JSON.stringify(columnOrder),
    );
  }, [columnOrder]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CUSTOM_COLUMNS,
      JSON.stringify(customColumns),
    );
  }, [customColumns]);

  const handleSyncToCloud = async () => {
    if (!user) return;
    setSyncStatus('saving');
    try {
      await saveToCloud(user.uid, {
        learners,
        scores,
        reverseScores,
        columnOrder,
        customColumns
      });
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const handleAddLearner = (name: string, stream: string) => {
    const newLearner: Learner = {
      id: crypto.randomUUID(),
      name,
      stream,
      customData: {},
    };
    setLearners([...learners, newLearner]);
    setIsAddModalOpen(false);
  };

  const handleImportLearners = (importedLearners: Learner[]) => {
    setLearners((prev) => [...prev, ...importedLearners]);
  };

  const handleDeleteLearner = (id: string) => {
    setLearners(learners.filter((l) => l.id !== id));
    setScores(scores.filter((s) => s.learnerId !== id));
    setReverseScores(reverseScores.filter((s) => s.learnerId !== id));
  };

  const handleLearnerDataChange = (updatedLearners: Learner[]) => {
    setLearners(updatedLearners);
  };

  const SidebarItem = ({
    icon: Icon,
    label,
    id,
  }: {
    icon: any;
    label: string;
    id: typeof activeSection;
  }) => {
    const isActive = activeSection === id;

    return (
      <button
        onClick={() => {
          setActiveSection(id);
          if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
          }
        }}
        className={cn(
          "w-full relative px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
          isActive
            ? "text-white"
            : "text-zinc-600 hover:text-black hover:bg-zinc-100/80",
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebarActiveIndicator"
            className="absolute inset-0 bg-black rounded-lg shadow-sm"
            initial={false}
            transition={{
              type: "spring",
              bounce: 0,
              duration: 0.2,
            }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3">
          <Icon size={18} />
          {label}
        </div>
      </button>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col justify-center relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-zinc-100/50 transform -skew-y-6 -translate-y-32 z-0" />
        <LoginModal onSuccess={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 font-sans selection:bg-black selection:text-white overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -260, md: { x: 0, width: 0, opacity: 0 } }}
              animate={{ x: 0, md: { width: 260, opacity: 1 } }}
              exit={{ x: -260, md: { width: 0, opacity: 0 } }}
              className="fixed md:static inset-y-0 left-0 z-50 flex-shrink-0 border-r border-zinc-200 bg-zinc-50 flex flex-col pt-4 overflow-hidden"
              style={{ width: 260 }}
            >
              <div className="px-6 mb-8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black flex items-center justify-center rounded-lg shrink-0">
                    <GraduationCap className="text-white w-5 h-5" />
                  </div>
                  <h1 className="font-display font-semibold text-lg tracking-tight whitespace-nowrap">
                    CAI Manager
                  </h1>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-2 text-zinc-400 hover:text-black rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-1">
                <SidebarItem icon={BookOpen} label="User Guide" id="guide" />
                <SidebarItem
                  icon={Table}
                  label="Standard Sheet"
                  id="standard"
                />
                <SidebarItem
                  icon={RefreshCcw}
                  label="Reverse Calc"
                  id="reverse"
                />
                <div className="my-4 border-t border-zinc-200" />
                <SidebarItem
                  icon={SettingsIcon}
                  label="Column Settings"
                  id="settings"
                />
              </nav>

              <div className="p-4 border-t border-zinc-200">
                <button
                  onClick={async () => {
                    try {
                      await logOut();
                    } catch (error) {
                      console.error("Logout failed", error);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 text-sm text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white md:rounded-tl-xl md:border-t md:border-l border-zinc-200 shadow-xl overflow-hidden relative z-10 md:mt-2 md:mb-2 md:mr-2">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200">
          <div className="px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <Menu size={20} />
              </button>

              <div className="md:hidden flex items-center gap-2 pr-2">
                <div className="w-8 h-8 bg-black flex items-center justify-center rounded-lg">
                  <GraduationCap className="text-white w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <select
                  className="premium-input w-28 md:w-36 font-medium"
                  value={selectedSubjectName}
                  onChange={(e) => setSelectedSubjectName(e.target.value)}
                >
                  {uniqueSubjectNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  <option disabled>──────</option>
                  <option value="Physics">Physics</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Geography">Geography</option>
                  <option value="History">History</option>
                  <option value="English">English</option>
                </select>

                <select
                  className="premium-input w-20 md:w-24 font-medium"
                  value={selectedClassName}
                  onChange={(e) => setSelectedClassName(e.target.value)}
                >
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="hidden md:flex items-center">
                <button
                  onClick={handleSyncToCloud}
                  disabled={syncStatus === 'saving'}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                    syncStatus === 'saved' 
                      ? "bg-green-50 text-green-700 border-green-200"
                      : syncStatus === 'error'
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 shadow-sm"
                  )}
                >
                  {syncStatus === 'saving' ? (
                    <CloudUpload size={16} className="animate-bounce" />
                  ) : syncStatus === 'saved' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Cloud size={16} />
                  )}
                  <span>
                    {syncStatus === 'saving' ? 'Saving...' 
                    : syncStatus === 'saved' ? 'Saved'
                    : 'Save to Cloud'}
                  </span>
                </button>
              </div>

              <ExportButton
                subject={selectedSubject}
                learners={learners}
                scores={scores}
                reverseScores={reverseScores}
                columnOrder={columnOrder}
                customColumns={customColumns}
              />
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 bg-zinc-50/30">
          {(activeSection === "standard" || activeSection === "reverse") && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                {activeSection === "standard" ? (
                  <Table className="text-zinc-400" />
                ) : (
                  <RefreshCcw className="text-zinc-400" />
                )}
                {activeSection === "standard"
                  ? "Standard Score Sheet"
                  : "Reverse Calculation"}
              </h2>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="premium-button-secondary flex items-center justify-center gap-2 md:px-4 md:py-2 p-0 w-10 h-10 md:w-auto md:h-auto rounded-full shrink-0"
                  title="Import Learners"
                >
                  <Upload size={16} />
                  <span className="hidden md:inline">Import</span>
                </button>
                <button
                  onClick={() => setActiveSection(activeSection === "standard" ? "reverse" : "standard")}
                  className="premium-button-secondary flex items-center justify-center gap-2 md:px-5 md:py-2 p-0 w-10 h-10 md:w-auto md:h-auto rounded-full shrink-0"
                >
                  <RefreshCcw size={16} />
                  <span className="hidden md:inline">{activeSection === "standard" ? "Reverse Calculation" : "Score Entry"}</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="premium-button-primary flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-5 md:py-2 p-0 rounded-full shrink-0"
                >
                  <Plus size={18} />
                  <span className="hidden md:inline">Add Learner</span>
                </button>
              </div>
            </div>
          )}

          <div
            className={
              activeSection !== "guide" && activeSection !== "settings"
                ? "bg-white border border-zinc-200 shadow-sm rounded-xl overflow-hidden"
                : ""
            }
          >
            {activeSection === "guide" ? (
              <UserGuide />
            ) : activeSection === "settings" ? (
              <Settings
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
                customColumns={customColumns}
                onCustomColumnsChange={setCustomColumns}
              />
            ) : activeSection === "standard" ? (
              <ScoreGrid
                subject={selectedSubject}
                learners={learners}
                scores={scores}
                onScoresChange={setScores}
                onDeleteLearner={handleDeleteLearner}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
                customColumns={customColumns}
                onCustomColumnsChange={setCustomColumns}
                onLearnerDataChange={handleLearnerDataChange}
              />
            ) : (
              <ReverseScoreGrid
                subject={selectedSubject}
                learners={learners}
                reverseScores={reverseScores}
                onReverseScoresChange={setReverseScores}
                onDeleteLearner={handleDeleteLearner}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
                customColumns={customColumns}
                onCustomColumnsChange={setCustomColumns}
                onLearnerDataChange={handleLearnerDataChange}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddLearnerModal
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddLearner}
          />
        )}
        {isImportModalOpen && (
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImportLearners}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
