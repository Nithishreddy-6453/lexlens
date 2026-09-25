import React from 'react';
import { 
  FileText, 
  Layers, 
  MessageSquare, 
  GitCompare, 
  CheckSquare, 
  Upload, 
  ShieldAlert, 
  Scale, 
  Globe,
  ChevronDown,
  Info,
  Briefcase
} from 'lucide-react';
import { StoredDocument } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeDoc: StoredDocument | null;
  onOpenResponsibleModal: () => void;
  onSelectSample: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeDoc,
  onOpenResponsibleModal,
  onSelectSample
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'upload', label: 'Upload & Analyze', icon: Upload },
    { id: 'review', label: 'Document Review', icon: FileText, disabled: !activeDoc },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'ask', label: 'Ask Document', icon: MessageSquare, disabled: !activeDoc },
    { id: 'context_check', label: 'Legal Context Check', icon: Globe },
    { id: 'questions', label: 'Prepare for Legal Review', icon: Briefcase, disabled: !activeDoc },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <button 
              id="brand-logo-btn"
              onClick={() => setActiveTab('dashboard')} 
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-slate-800 transition-colors">
                <Scale className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tracking-tight text-slate-900 font-serif-legal">LexLens</span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Legal Intelligence
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">Document-first AI assistance & navigation</p>
              </div>
            </button>

            {/* Active Document Indicator Chip */}
            {activeDoc && (
              <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-slate-200 text-xs">
                <span className="text-slate-400 mr-1.5 font-medium">Active:</span>
                <button
                  id="active-doc-chip-btn"
                  onClick={() => setActiveTab('review')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition-colors truncate max-w-[220px]"
                  title={activeDoc.title}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{activeDoc.title}</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => !item.disabled && setActiveTab(item.id)}
                  disabled={item.disabled}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : item.disabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action: Responsible AI Badge & Quick Sample */}
          <div className="flex items-center gap-2">
            <button
              id="responsible-ai-pill-btn"
              onClick={onOpenResponsibleModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors"
              title="Click to view LexLens Responsible AI Principles"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Legal Info, Not Advice</span>
              <Info className="w-3 h-3 text-amber-500 ml-0.5" />
            </button>

            <button
              id="try-sample-btn"
              onClick={onSelectSample}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors hidden xl:inline-flex items-center gap-1"
            >
              <span>Sample Lease</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-btn-${item.id}`}
                onClick={() => !item.disabled && setActiveTab(item.id)}
                disabled={item.disabled}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : item.disabled
                    ? 'text-slate-300'
                    : 'text-slate-600 bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
