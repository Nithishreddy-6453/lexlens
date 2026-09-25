import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  Globe, 
  ExternalLink, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle, 
  Calendar, 
  FileText, 
  Building2, 
  Landmark, 
  BookOpen, 
  Loader2, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Copy, 
  Check, 
  RefreshCw,
  Info,
  ShieldCheck
} from 'lucide-react';
import { StoredDocument, LegalContextCheckResult, LegalSourceItem } from '../types';

interface LegalContextCheckViewProps {
  activeDoc: StoredDocument | null;
  initialJurisdiction?: string;
  initialClauseTitle?: string;
  initialClauseText?: string;
  onNavigateTab: (tab: string) => void;
}

const PRESET_JURISDICTIONS = [
  { id: 'ny', label: 'New York', value: 'State of New York, USA' },
  { id: 'de', label: 'Delaware', value: 'State of Delaware, USA' },
  { id: 'ca', label: 'California', value: 'State of California, USA' },
  { id: 'tx', label: 'Texas', value: 'State of Texas, USA' },
  { id: 'uk', label: 'England & Wales', value: 'England and Wales, United Kingdom' },
  { id: 'fed', label: 'US Commercial Law', value: 'United States General Commercial Law' },
];

const PRESET_QUESTIONS = [
  {
    title: 'Holdover Rent & Liquidated Damages',
    question: 'Are 200% holdover rent multipliers and liquidated damages penalties enforceable in commercial leases?',
    category: 'Monetary Penalties'
  },
  {
    title: 'Automatic Renewal / Evergreen Notice',
    question: 'What statutory reminder notice is required before an automatic renewal or evergreen clause binds a party?',
    category: 'Term & Renewal'
  },
  {
    title: 'Consequential Damages & Gross Negligence',
    question: 'Can a contract waive liability or consequential damages for gross negligence, willful misconduct, or fraud?',
    category: 'Liability & Risk'
  },
  {
    title: 'Liquidated Damages vs. Unlawful Penalty',
    question: 'What is the judicial test for distinguishing valid pre-estimated liquidated damages from an unenforceable penalty?',
    category: 'Remedies'
  },
  {
    title: 'Jury Trial & Dispute Resolution Waivers',
    question: 'Under what circumstances are pre-dispute jury trial waivers or mandatory arbitration clauses enforceable?',
    category: 'Dispute Resolution'
  },
  {
    title: 'Material Breach & Notice to Cure',
    question: 'Does the law require written notice and opportunity to cure before terminating for material breach?',
    category: 'Termination'
  }
];

export const LegalContextCheckView: React.FC<LegalContextCheckViewProps> = ({
  activeDoc,
  initialJurisdiction,
  initialClauseTitle,
  initialClauseText,
  onNavigateTab,
}) => {
  // 1. Jurisdiction State
  const defaultJurisdiction = initialJurisdiction || activeDoc?.jurisdiction || 'State of New York, USA';
  const [jurisdiction, setJurisdiction] = useState<string>(defaultJurisdiction);
  const [customJurisdiction, setCustomJurisdiction] = useState<string>('');

  // 2. Query Selection State
  const [queryMode, setQueryMode] = useState<'clause' | 'preset_question' | 'custom_question'>(
    initialClauseTitle ? 'clause' : 'preset_question'
  );
  
  // Selected Clause
  const [selectedClauseId, setSelectedClauseId] = useState<string>('');
  const [clauseTitle, setClauseTitle] = useState<string>(initialClauseTitle || '');
  const [clauseText, setClauseText] = useState<string>(initialClauseText || '');

  // Selected Question
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customQuestion, setCustomQuestion] = useState<string>('');

  // 3. Execution & Results State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<LegalContextCheckResult | null>(null);
  const [history, setHistory] = useState<LegalContextCheckResult[]>([]);
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);

  // Available clauses from active document
  const availableClauses = activeDoc?.analysis?.clauses || [];

  // Update clause state when dropdown changes
  const handleClauseSelect = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    const found = availableClauses.find(c => c.id === clauseId);
    if (found) {
      setClauseTitle(found.title);
      setClauseText(found.rawText || found.plainSummary);
    }
  };

  // If initial props are supplied, sync them
  useEffect(() => {
    if (initialClauseTitle) {
      setClauseTitle(initialClauseTitle);
      setClauseText(initialClauseText || '');
      setQueryMode('clause');
    }
  }, [initialClauseTitle, initialClauseText]);

  // Execute Legal Context Check
  const handleRunCheck = async () => {
    const effectiveJurisdiction = customJurisdiction.trim() || jurisdiction;
    let targetQuestion = '';
    let effectiveClauseTitle = '';
    let effectiveClauseText = '';

    if (queryMode === 'clause') {
      effectiveClauseTitle = clauseTitle || 'Contract Provision';
      effectiveClauseText = clauseText || 'Clause text under examination';
      targetQuestion = `${effectiveClauseTitle}: ${effectiveClauseText}`;
    } else if (queryMode === 'preset_question') {
      targetQuestion = PRESET_QUESTIONS[selectedPresetIndex]?.question || 'General contract enforceability';
    } else {
      targetQuestion = customQuestion.trim();
      if (!targetQuestion) return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/legal-context-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdiction: effectiveJurisdiction,
          queryType: queryMode === 'clause' ? 'clause' : 'question',
          clauseTitle: queryMode === 'clause' ? effectiveClauseTitle : undefined,
          clauseText: queryMode === 'clause' ? effectiveClauseText : undefined,
          question: queryMode !== 'clause' ? targetQuestion : undefined,
          documentType: activeDoc?.documentType,
          documentTitle: activeDoc?.title
        })
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve legal context information.');
      }

      const data: LegalContextCheckResult = await res.json();
      setCurrentResult(data);
      setHistory(prev => [data, ...prev.filter(h => h.id !== data.id)].slice(0, 10));

      // Smoothly scroll to results
      setTimeout(() => {
        const el = document.getElementById('context-check-results-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error('Legal Context Check error:', err);
      alert('Unable to complete legal context check at this time. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = (result: LegalContextCheckResult) => {
    const reportText = `[${result.label}]
Topic: ${result.clauseTitle || result.question}
Jurisdiction: ${result.jurisdiction}
Date Checked: ${result.dateChecked}

SUMMARY:
${result.summary}

STATUTORY LANDSCAPE:
${result.statutoryLandscape}

JUDICIAL STANDARDS:
${result.judicialStandards}

${result.hasUncertainty ? `UNCERTAINTY & VARIATION:\n${result.uncertaintyOrDisagreement}\n` : ''}
AUTHORITATIVE CITATIONS:
${result.authoritativeCitations.join('\n')}

SOURCES USED:
${result.sources.map(s => `- ${s.title} (${s.url})`).join('\n')}

MANDATORY NOTICE:
${result.prominentDisclaimers.enforceabilityWarning}
${result.prominentDisclaimers.contextDependenceNote}`;

    navigator.clipboard.writeText(reportText);
    setCopiedResultId(result.id);
    setTimeout(() => setCopiedResultId(null), 3000);
  };

  const getSourceTypeBadge = (sourceType: LegalSourceItem['sourceType']) => {
    switch (sourceType) {
      case 'government':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Building2 className="w-2.5 h-2.5" />
            Official Government (.gov)
          </span>
        );
      case 'court':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
            <Landmark className="w-2.5 h-2.5" />
            Court / Judicial Precedent
          </span>
        );
      case 'legislation_database':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
            <BookOpen className="w-2.5 h-2.5" />
            Legislation Database
          </span>
        );
      case 'regulator':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldCheck className="w-2.5 h-2.5" />
            Regulatory Agency
          </span>
        );
      case 'official_publication':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
            <FileText className="w-2.5 h-2.5" />
            Official Bar Publication
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            <Globe className="w-2.5 h-2.5" />
            Public Legal Resource
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Top Header & Purpose Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 font-serif-legal">Legal Context Check</h1>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                  External Public Sources
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Informational context from current public legal sources without blending into document-specific analysis.
              </p>
            </div>
          </div>

          {activeDoc && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold truncate max-w-[200px]">{activeDoc.title}</span>
            </div>
          )}
        </div>

        {/* Mandatory Prominent Notice Banner (Requirements 8 & 11) */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">
              Important Legal Context Notice & Enforceability Boundary:
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Legal rules can depend heavily on <strong>jurisdiction</strong>, <strong>specific factual circumstances</strong>, <strong>enactment dates</strong>, and the <strong>precise contractual agreement</strong>. External search results provide general informational context only and <strong>never determine whether your specific agreement or clause is legally enforceable</strong> in court.
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Setup Card: 1. Jurisdiction Selection + 2. Question/Clause Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        
        {/* Step 1: Select Jurisdiction */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-purple-700" />
              <span>1. Select Governing Jurisdiction</span>
            </label>
            <span className="text-[11px] text-slate-400">Current selection: <span className="font-semibold text-slate-700">{customJurisdiction || jurisdiction}</span></span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {PRESET_JURISDICTIONS.map((item) => {
              const isSelected = !customJurisdiction && jurisdiction === item.value;
              return (
                <button
                  key={item.id}
                  id={`jurisdiction-btn-${item.id}`}
                  onClick={() => {
                    setJurisdiction(item.value);
                    setCustomJurisdiction('');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                    isSelected
                      ? 'bg-purple-50 border-purple-500 text-purple-950 font-bold ring-1 ring-purple-300 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Custom Jurisdiction Input */}
          <div className="pt-1">
            <input
              id="custom-jurisdiction-input"
              type="text"
              value={customJurisdiction}
              onChange={(e) => setCustomJurisdiction(e.target.value)}
              placeholder="Or enter custom jurisdiction (e.g. State of Florida, USA, or France)..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Step 2: Select Target (Clause from Doc, Common Question, or Custom) */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-700" />
              <span>2. Select Question or Clause to Research</span>
            </label>

            {/* Mode Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
              {availableClauses.length > 0 && (
                <button
                  id="tab-mode-clause"
                  onClick={() => setQueryMode('clause')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    queryMode === 'clause' ? 'bg-white text-purple-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  From Document Clause
                </button>
              )}
              <button
                id="tab-mode-preset"
                onClick={() => setQueryMode('preset_question')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  queryMode === 'preset_question' ? 'bg-white text-purple-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard Questions
              </button>
              <button
                id="tab-mode-custom"
                onClick={() => setQueryMode('custom_question')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  queryMode === 'custom_question' ? 'bg-white text-purple-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Inquiries
              </button>
            </div>
          </div>

          {/* Mode A: Select from Document Clause */}
          {queryMode === 'clause' && (
            <div className="space-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Choose Clause:</span>
                <select
                  id="clause-selector-dropdown"
                  value={selectedClauseId}
                  onChange={(e) => handleClauseSelect(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">-- Choose clause from {activeDoc?.title || 'active document'} --</option>
                  {availableClauses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clause text edit/view */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Clause Title & Context for Search Grounding:</span>
                </div>
                <input
                  type="text"
                  value={clauseTitle}
                  onChange={(e) => setClauseTitle(e.target.value)}
                  placeholder="Clause Title (e.g., Section 7.2 Holdover Tenancy Multiplier)..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none"
                />
                <textarea
                  value={clauseText}
                  onChange={(e) => setClauseText(e.target.value)}
                  rows={3}
                  placeholder="Verbatim or summarized clause text to check against public statutes..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Mode B: Common Preset Questions */}
          {queryMode === 'preset_question' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PRESET_QUESTIONS.map((q, idx) => {
                const isSelected = selectedPresetIndex === idx;
                return (
                  <div
                    key={idx}
                    id={`preset-question-${idx}`}
                    onClick={() => setSelectedPresetIndex(idx)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-300 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                        {q.category}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />}
                    </div>
                    <p className="text-xs font-bold text-slate-900">{q.title}</p>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{q.question}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode C: Custom Inquiries */}
          {queryMode === 'custom_question' && (
            <div className="space-y-2">
              <textarea
                id="custom-legal-question-input"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                rows={3}
                placeholder="Type your specific legal inquiry (e.g. Under New York law, what notice is mandatory before drawing on a commercial security deposit?)..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-slate-800"
              />
              <p className="text-[11px] text-slate-400">
                Gemini with Google Search Grounding will search authoritative public legislation databases, courts, and regulators for this specific query.
              </p>
            </div>
          )}
        </div>

        {/* Step 3: Run Action Button */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Grounding prefers: <strong>Government (.gov)</strong>, <strong>Legislation Databases</strong>, <strong>Judicial Opinions</strong>.
          </div>

          <button
            id="run-legal-context-check-btn"
            onClick={handleRunCheck}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-purple-900 hover:bg-purple-800 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                <span>Grounding with Public Legal Databases...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 text-purple-300" />
                <span>Run Legal Context Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-purple-200 p-8 shadow-xs text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-purple-100 mx-auto flex items-center justify-center text-purple-700">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900">Conducting Public Legal Grounding</h3>
            <p className="text-xs text-slate-500">
              Querying live Google Search grounding tools for authoritative statutory provisions and judicial precedents in {customJurisdiction || jurisdiction}...
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          RESULTS SECTION: Clearly Labeled "External legal information"
          ========================================================================= */}
      {currentResult && !isLoading && (
        <div id="context-check-results-section" className="space-y-5 animate-in fade-in">
          
          {/* Main Context Card */}
          <div className="bg-white rounded-2xl border border-purple-300 shadow-sm overflow-hidden">
            
            {/* Top Label & Date Checked Bar (Requirements 7 & 10) */}
            <div className="bg-purple-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-purple-800 text-purple-200 border border-purple-700">
                    {currentResult.label}
                  </span>
                  <span className="text-xs font-medium text-purple-200">
                    Jurisdiction: <strong className="text-white">{currentResult.jurisdiction}</strong>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold font-serif-legal text-white">
                  {currentResult.clauseTitle || currentResult.question}
                </h2>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="text-right text-xs">
                  <span className="text-purple-300 text-[10px] block">Date Checked</span>
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-purple-400" />
                    {currentResult.dateChecked}
                  </span>
                </div>

                <button
                  id="copy-context-report-btn"
                  onClick={() => handleCopyReport(currentResult)}
                  className="p-2 rounded-lg bg-purple-800 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-700 transition-colors"
                  title="Copy Full Context Report to Clipboard"
                >
                  {copiedResultId === currentResult.id ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Strict Enforceability Guardrail Notice (Requirement 8) */}
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Enforceability Guardrail:</strong> {currentResult.prominentDisclaimers.enforceabilityWarning}
              </p>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Section 1: Executive Public Synthesis */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-purple-700" />
                  <span>Public Legal Synthesis & Commercial Standards</span>
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  {currentResult.summary}
                </p>
              </div>

              {/* Section 2: Statutory Landscape & Judicial Doctrines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Statutory Landscape */}
                <div className="p-4 rounded-xl bg-purple-50/30 border border-purple-100 space-y-2">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-purple-600" />
                    Statutory Framework ({currentResult.jurisdiction}):
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentResult.statutoryLandscape}
                  </p>
                </div>

                {/* Judicial Standards */}
                <div className="p-4 rounded-xl bg-purple-50/30 border border-purple-100 space-y-2">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                    <Landmark className="w-3 h-3 text-purple-600" />
                    Judicial Review Standards & Court Scrutiny:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {currentResult.judicialStandards}
                  </p>
                </div>
              </div>

              {/* Section 3: Legal Uncertainty or Disagreement (Requirement 9) */}
              {currentResult.hasUncertainty && currentResult.uncertaintyOrDisagreement && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Identified Legal Uncertainty, Fact-Sensitivity, or Jurisdictional Split:</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed pl-6">
                    {currentResult.uncertaintyOrDisagreement}
                  </p>
                </div>
              )}

              {/* Section 4: Authoritative Citations Preserved (Requirement 6) */}
              {currentResult.authoritativeCitations && currentResult.authoritativeCitations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                    Preserved Statutory & Case Law Citations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentResult.authoritativeCitations.map((cit, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono-legal px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        {cit}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Sources Used (Requirements 4 & 5) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-700" />
                    <span>Authoritative Public Sources Used ({currentResult.sources?.length || 0})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Grounding: {currentResult.groundingConfidence === 'grounded_live_search' ? 'Live Gemini Google Search' : 'Authoritative Public Legal Compilation'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentResult.sources?.map((src) => (
                    <div
                      key={src.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50/20 transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          {getSourceTypeBadge(src.sourceType)}
                          <span className="text-[10px] text-slate-400 font-mono">{src.domain}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {src.title}
                        </h4>
                        {src.snippet && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {src.snippet}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline"
                        >
                          <span>Visit Public Source</span>
                          <ExternalLink className="w-3 h-3 text-purple-600" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: Questions for Legal Counsel */}
              {currentResult.questionsForCounsel && currentResult.questionsForCounsel.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wider block">
                    Recommended Questions to Clarify with Legal Counsel:
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentResult.questionsForCounsel.map((q, idx) => (
                      <li key={idx} className="text-xs text-purple-900 bg-purple-50/60 p-3 rounded-xl border border-purple-100 flex items-start gap-2">
                        <span className="text-purple-600 font-bold mt-0.5">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Context Dependence Note (Requirement 11) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed italic">
                {currentResult.prominentDisclaimers.contextDependenceNote}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* History of Recent Checks in this Session */}
      {history.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Recent Context Checks in this Session ({history.length})</span>
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentResult(item)}
                className={`py-2.5 px-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  currentResult?.id === item.id ? 'bg-purple-50 font-semibold text-purple-950' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Scale className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-xs truncate">{item.clauseTitle || item.question}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">({item.jurisdiction})</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{item.dateChecked}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
