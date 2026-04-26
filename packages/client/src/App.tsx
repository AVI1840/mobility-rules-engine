import { useState } from 'react';
import { MessageCircle, LayoutDashboard, Scale, Eye, BookOpen, Search, Zap, FileText, TestTube } from 'lucide-react';
import { FeedbackModal } from '@/components/FeedbackModal';
import { Dashboard } from '@/components/Dashboard';
import { EligibilityForm } from '@/components/EligibilityForm';
import { DecisionTrace } from '@/components/DecisionTrace';
import { RuleExplanation } from '@/components/RuleExplanation';
import { VariableInspection } from '@/components/VariableInspection';
import { EdgeCaseSimulation } from '@/components/EdgeCaseSimulation';
import { SourceMaterials } from '@/components/SourceMaterials';
import { QADashboard } from '@/components/QADashboard';
import type { EvaluationResponse } from '@/types';

type Tab = 'dashboard' | 'eligibility' | 'trace' | 'explanation' | 'variables' | 'edge-cases' | 'sources' | 'qa';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [lastResult, setLastResult] = useState<EvaluationResponse | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as Tab, label: 'סקירה כללית', icon: LayoutDashboard },
    { id: 'eligibility' as Tab, label: 'בדיקת זכאות', icon: Scale },
    { id: 'trace' as Tab, label: 'מעקב החלטות', icon: Eye },
    { id: 'explanation' as Tab, label: 'הסבר כללים', icon: BookOpen },
    { id: 'variables' as Tab, label: 'בדיקת משתנים', icon: Search },
    { id: 'edge-cases' as Tab, label: 'סימולציית קצה', icon: Zap },
    { id: 'sources' as Tab, label: 'חומרי מקור', icon: FileText },
    { id: 'qa' as Tab, label: 'בדיקות QA', icon: TestTube },
  ];

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header style={{ backgroundColor: '#1B3A5C' }} className="text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">מנוע זכויות ניידות</h1>
            <p className="text-xs opacity-70 mt-0.5">המוסד לביטוח לאומי — מחלקת ניידות</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded font-medium">14 כללים פעילים</span>
          <span className="text-xs bg-white/15 px-2 py-1 rounded">פיילוט v1.0</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-48 bg-white border-l border-gray-200 flex flex-col py-3 shadow-sm">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm text-right transition-all ${
                activeTab === id
                  ? 'text-white font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
              style={activeTab === id ? { backgroundColor: '#1B3A5C' } : {}}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'dashboard' && <Dashboard onNavigate={(t) => setActiveTab(t as Tab)} />}
          {activeTab === 'eligibility' && <EligibilityForm onResult={setLastResult} />}
          {activeTab === 'trace' && <DecisionTrace result={lastResult} />}
          {activeTab === 'explanation' && <RuleExplanation result={lastResult} />}
          {activeTab === 'variables' && <VariableInspection result={lastResult} />}
          {activeTab === 'edge-cases' && <EdgeCaseSimulation onResult={setLastResult} />}
          {activeTab === 'sources' && <SourceMaterials />}
          {activeTab === 'qa' && <QADashboard />}
        </main>
      </div>

      {/* Feedback button */}
      <button
        onClick={() => setFeedbackOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white text-sm font-medium transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: '#1B3A5C' }}
        aria-label="משוב פיילוט"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">משוב פיילוט</span>
      </button>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
