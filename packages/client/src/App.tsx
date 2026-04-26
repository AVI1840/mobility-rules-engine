import { useState } from 'react';
import { MessageCircle, Scale, Eye, BookOpen, Search, Zap, GitCompare, TestTube } from 'lucide-react';
import { FeedbackModal } from '@/components/FeedbackModal';
import { EligibilityForm } from '@/components/EligibilityForm';
import { DecisionTrace } from '@/components/DecisionTrace';
import { RuleExplanation } from '@/components/RuleExplanation';
import { VariableInspection } from '@/components/VariableInspection';
import { EdgeCaseSimulation } from '@/components/EdgeCaseSimulation';
import { HistoricalComparison } from '@/components/HistoricalComparison';
import { QADashboard } from '@/components/QADashboard';
import type { EvaluationResponse } from '@/types';

type Tab = 'eligibility' | 'trace' | 'explanation' | 'variables' | 'edge-cases' | 'comparison' | 'qa';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('eligibility');
  const [lastResult, setLastResult] = useState<EvaluationResponse | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const navItems = [
    { id: 'eligibility' as Tab, label: 'בדיקת זכאות', icon: Scale },
    { id: 'trace' as Tab, label: 'מעקב החלטות', icon: Eye },
    { id: 'explanation' as Tab, label: 'הסבר כללים', icon: BookOpen },
    { id: 'variables' as Tab, label: 'בדיקת משתנים', icon: Search },
    { id: 'edge-cases' as Tab, label: 'סימולציית קצה', icon: Zap },
    { id: 'comparison' as Tab, label: 'השוואה היסטורית', icon: GitCompare },
    { id: 'qa' as Tab, label: 'בדיקות QA', icon: TestTube },
  ];

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header style={{ backgroundColor: '#1B3A5C' }} className="text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">מנוע זכויות ניידות</h1>
          <p className="text-sm opacity-75 mt-0.5">המוסד לביטוח לאומי — מחלקת ניידות</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-2 py-1 rounded">פיילוט v1.0</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-52 bg-white border-l border-gray-200 flex flex-col py-4">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium text-right transition-colors ${
                activeTab === id
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
          {activeTab === 'eligibility' && <EligibilityForm onResult={setLastResult} />}
          {activeTab === 'trace' && <DecisionTrace result={lastResult} />}
          {activeTab === 'explanation' && <RuleExplanation result={lastResult} />}
          {activeTab === 'variables' && <VariableInspection result={lastResult} />}
          {activeTab === 'edge-cases' && <EdgeCaseSimulation onResult={setLastResult} />}
          {activeTab === 'comparison' && <HistoricalComparison />}
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
