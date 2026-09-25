import React, { useState, useRef } from 'react';
import { 
  GitCompare, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileText, 
  Scale, 
  Layers,
  ArrowUpRight,
  Filter,
  Search,
  Upload,
  Clock,
  DollarSign,
  Shield,
  Eye,
  ChevronRight,
  HelpCircle,
  FilePlus,
  FileMinus,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
  AlertCircle
} from 'lucide-react';
import { 
  StoredDocument, 
  ComparisonResult, 
  ComparisonClauseItem, 
  DetectedChangeCategory 
} from '../types';
import { 
  SAMPLE_COMMERCIAL_LEASE, 
  SAMPLE_PROPOSED_AMENDMENT, 
  SAMPLE_COMPARISON_RESULT 
} from '../data/sampleDocuments';
import { DualDocumentLocationViewer } from './DualDocumentLocationViewer';

interface CompareViewProps {
  documents: StoredDocument[];
  onNavigateTab: (tab: string) => void;
  onSelectDoc: (doc: StoredDocument) => void;
  onNavigateToReviewPage?: (page: number, section?: string, doc?: StoredDocument) => void;
  onAddDocument?: (newDoc: StoredDocument) => void;
  initialDoc1Id?: string;
  initialDoc2Id?: string;
}

export const CompareView: React.FC<CompareViewProps> = ({ 
  documents, 
  onNavigateTab, 
  onSelectDoc,
  onNavigateToReviewPage,
  onAddDocument,
  initialDoc1Id,
  initialDoc2Id
}) => {
  // Combine workspace documents with default sample lease and amendment
  const allDocs = Array.from(
    new Map([...documents, SAMPLE_COMMERCIAL_LEASE, SAMPLE_PROPOSED_AMENDMENT].map(d => [d.id, d])).values()
  );

  const [doc1Id, setDoc1Id] = useState<string>(initialDoc1Id || SAMPLE_COMMERCIAL_LEASE.id);
  const [doc2Id, setDoc2Id] = useState<string>(initialDoc2Id || SAMPLE_PROPOSED_AMENDMENT.id);

  // Sync if initialDoc1Id or initialDoc2Id props change
  React.useEffect(() => {
    if (initialDoc1Id) setDoc1Id(initialDoc1Id);
    if (initialDoc2Id) setDoc2Id(initialDoc2Id);
  }, [initialDoc1Id, initialDoc2Id]);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(SAMPLE_COMPARISON_RESULT);
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inspector modal state
  const [activeInspectingItem, setActiveInspectingItem] = useState<ComparisonClauseItem | null>(null);

  // Upload state for Doc A and Doc B
  const [isUploadingDocA, setIsUploadingDocA] = useState<boolean>(false);
  const [isUploadingDocB, setIsUploadingDocB] = useState<boolean>(false);
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  const doc1 = allDocs.find((d) => d.id === doc1Id) || allDocs[0];
  const doc2 = allDocs.find((d) => d.id === doc2Id) || allDocs[1] || allDocs[0];

  // Helper to process uploaded file into StoredDocument
  const handleFileUpload = async (file: File, targetSlot: 'doc1' | 'doc2') => {
    try {
      if (targetSlot === 'doc1') setIsUploadingDocA(true);
      else setIsUploadingDocB(true);
      setErrorMessage(null);

      const text = await file.text();
      // Split into pages of ~2000 characters if no page breaks
      const textParts = text.split(/(?:--- Page \d+ ---|\f|\n\n\n)/g).filter(Boolean);
      const generatedPages = textParts.length > 0 
        ? textParts.map((content, idx) => ({ pageNumber: idx + 1, content: content.trim() }))
        : [{ pageNumber: 1, content: text }];

      const newDoc: StoredDocument = {
        id: `uploaded-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        fileName: file.name,
        documentType: 'other',
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        pageCount: generatedPages.length,
        jurisdiction: 'General / Specified in Agreement',
        rawText: text,
        pages: generatedPages,
        analysis: {
          id: `analysis-${Date.now()}`,
          documentId: `uploaded-${Date.now()}`,
          documentTitle: file.name,
          documentType: 'other',
          jurisdiction: 'General',
          analyzedAt: new Date().toISOString(),
          pageCount: generatedPages.length,
          executiveSummary: `Uploaded document "${file.name}" ready for comparison.`,
          parties: [],
          clauses: [],
          attentionAreas: [],
          obligations: [],
          importantDates: [],
          inconsistencies: []
        }
      };

      if (onAddDocument) {
        onAddDocument(newDoc);
      }

      if (targetSlot === 'doc1') {
        setDoc1Id(newDoc.id);
      } else {
        setDoc2Id(newDoc.id);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to parse uploaded document: ${err.message || 'File reading error'}`);
    } finally {
      if (targetSlot === 'doc1') setIsUploadingDocA(false);
      else setIsUploadingDocB(false);
    }
  };

  const handleRunComparison = async () => {
    if (!doc1 || !doc2 || doc1.id === doc2.id) {
      setErrorMessage('Please choose two distinct documents to compare.');
      return;
    }

    setIsComparing(true);
    setErrorMessage(null);

    try {
      const doc1Content = doc1.pages?.map((p) => p.content).join('\n\n') || doc1.rawText || '';
      const doc2Content = doc2.pages?.map((p) => p.content).join('\n\n') || doc2.rawText || '';

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc1Title: doc1.title,
          doc1Content,
          doc2Title: doc2.title,
          doc2Content
        })
      });

      if (!res.ok) {
        throw new Error('Comparison analysis request failed.');
      }

      const data = await res.json();
      setComparison(data.comparison);
    } catch (err: any) {
      console.error('Comparison error:', err);
      setErrorMessage(err.message || 'Error occurred while comparing documents.');
    } finally {
      setIsComparing(false);
    }
  };

  // Extract items from comparison result
  const items: ComparisonClauseItem[] = comparison?.items || [];

  // Calculate counts for tabs
  const stats = comparison?.stats || {
    totalClauses: items.length,
    modifiedCount: items.filter(i => i.changeType === 'modified').length,
    addedCount: items.filter(i => i.changeType === 'added').length,
    removedCount: items.filter(i => i.changeType === 'removed').length,
    unchangedCount: items.filter(i => i.changeType === 'unchanged').length,
    needsReviewCount: items.filter(i => i.matchConfidence === 'needs_review').length,
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    // Change type filter
    if (changeTypeFilter === 'modified' && item.changeType !== 'modified') return false;
    if (changeTypeFilter === 'added' && item.changeType !== 'added') return false;
    if (changeTypeFilter === 'removed' && item.changeType !== 'removed') return false;
    if (changeTypeFilter === 'unchanged' && item.changeType !== 'unchanged') return false;
    if (changeTypeFilter === 'needs_review' && item.matchConfidence !== 'needs_review') return false;

    // Category filter
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.clauseTitle?.toLowerCase().includes(q);
      const matchExpl = item.plainEnglishExplanation?.toLowerCase().includes(q);
      const matchDiff = item.practicalDifference?.toLowerCase().includes(q);
      const matchCat = item.categoryLabel?.toLowerCase().includes(q);
      if (!matchTitle && !matchExpl && !matchDiff && !matchCat) return false;
    }

    return true;
  });

  // Cycle through items inside Dual Viewer
  const currentInspectIndex = activeInspectingItem 
    ? filteredItems.findIndex(i => i.id === activeInspectingItem.id) 
    : -1;

  const handleSelectPrevInspectItem = () => {
    if (currentInspectIndex > 0) {
      setActiveInspectingItem(filteredItems[currentInspectIndex - 1]);
    }
  };

  const handleSelectNextInspectItem = () => {
    if (currentInspectIndex >= 0 && currentInspectIndex < filteredItems.length - 1) {
      setActiveInspectingItem(filteredItems[currentInspectIndex + 1]);
    }
  };

  const categoriesList: { id: string; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'monetary_amount', label: 'Monetary Amounts' },
    { id: 'deadlines', label: 'Deadlines' },
    { id: 'notice_periods', label: 'Notice Periods' },
    { id: 'termination_rights', label: 'Termination Rights' },
    { id: 'renewal_terms', label: 'Renewal Terms' },
    { id: 'liability_indemnity', label: 'Liability & Indemnity' },
    { id: 'dispute_resolution', label: 'Dispute Resolution' },
    { id: 'confidentiality_ip', label: 'Confidentiality & IP' },
    { id: 'general_terms', label: 'General Terms' }
  ];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Hidden File Inputs for Document A and B */}
      <input 
        type="file" 
        ref={fileInputRefA} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'doc1');
        }} 
        className="hidden" 
        accept=".pdf,.txt,.docx,.doc,.json"
      />
      <input 
        type="file" 
        ref={fileInputRefB} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, 'doc2');
        }} 
        className="hidden" 
        accept=".pdf,.txt,.docx,.doc,.json"
      />

      {/* Header Info */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold mb-1">
            <GitCompare className="w-3.5 h-3.5" />
            <span>Semantic Clause Alignment & Shift Analysis</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif-legal">
            Document Comparison Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aligns corresponding clauses across agreements even when numbering or phrasing differs. Strictly objective, practical analysis without legal conclusions.
          </p>
        </div>

        <button
          id="load-sample-comparison-btn"
          onClick={() => {
            setDoc1Id(SAMPLE_COMMERCIAL_LEASE.id);
            setDoc2Id(SAMPLE_PROPOSED_AMENDMENT.id);
            setComparison(SAMPLE_COMPARISON_RESULT);
          }}
          className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Load Lease vs. Amendment (Sample)</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Document Selection & Upload Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        
        {/* Document A Selector Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold font-mono">
                A
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Document A (Base Agreement)
              </span>
            </div>
            <button
              id="upload-docA-btn"
              onClick={() => fileInputRefA.current?.click()}
              disabled={isUploadingDocA}
              className="text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              {isUploadingDocA ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Upload Doc A</span>
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor="doc1-compare-select" className="text-xs font-medium text-slate-600">
              Select from available documents:
            </label>
            <select
              id="doc1-compare-select"
              value={doc1Id}
              onChange={(e) => setDoc1Id(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {allDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.pageCount} pages)
                </option>
              ))}
            </select>
          </div>

          {doc1 && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 text-xs space-y-1">
              <div className="font-semibold text-slate-800 truncate">{doc1.title}</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span>{doc1.pageCount} pages</span>
                <span>•</span>
                <span className="font-mono-legal">{doc1.jurisdiction || 'General Jurisdiction'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Document B Selector Card */}
        <div className="bg-white rounded-xl border border-purple-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold font-mono">
                B
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                Document B (Comparison / Redline)
              </span>
            </div>
            <button
              id="upload-docB-btn"
              onClick={() => fileInputRefB.current?.click()}
              disabled={isUploadingDocB}
              className="text-xs font-medium text-purple-800 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              {isUploadingDocB ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Upload Doc B</span>
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor="doc2-compare-select" className="text-xs font-medium text-purple-900">
              Select comparison document:
            </label>
            <select
              id="doc2-compare-select"
              value={doc2Id}
              onChange={(e) => setDoc2Id(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-purple-300 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            >
              {allDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.pageCount} pages)
                </option>
              ))}
            </select>
          </div>

          {doc2 && (
            <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-200/80 text-xs space-y-1">
              <div className="font-semibold text-purple-950 truncate">{doc2.title}</div>
              <div className="flex items-center gap-3 text-[11px] text-purple-700">
                <span>{doc2.pageCount} pages</span>
                <span>•</span>
                <span className="font-mono-legal">{doc2.jurisdiction || 'General Jurisdiction'}</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Comparison Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-600 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            Semantic comparison engine: Detects monetary, deadline, termination, indemnity, and dispute modifications.
          </span>
        </div>

        <button
          id="run-compare-btn"
          onClick={handleRunComparison}
          disabled={isComparing || doc1Id === doc2Id}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:bg-slate-300 text-white font-semibold text-xs tracking-wide shadow-xs transition-all shrink-0 w-full sm:w-auto justify-center"
        >
          {isComparing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
              <span>Analyzing Semantic Shifts...</span>
            </>
          ) : (
            <>
              <GitCompare className="w-4 h-4 text-purple-200" />
              <span>Compare Documents</span>
            </>
          )}
        </button>
      </div>

      {/* Comparison Results Dashboard */}
      {comparison && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Executive Neutral Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 font-serif-legal flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                <span>Executive Comparison & Material Shifts</span>
              </h2>
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                Non-Evaluative Factual Analysis
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-sans">
              {comparison.factualSummary || comparison.executiveComparison}
            </p>

            {/* Material Shifts Bullets */}
            {comparison.materialShiftsSummary && comparison.materialShiftsSummary.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Primary Documentary Shifts:
                </span>
                <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  {comparison.materialShiftsSummary.map((shift, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <ChevronRight className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{shift}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quick Stats Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setChangeTypeFilter('all')}
              className={`p-3 rounded-xl border text-left transition-all ${
                changeTypeFilter === 'all'
                  ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[11px] text-slate-500 block">Total Clauses</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{stats.totalClauses}</span>
            </button>

            <button
              onClick={() => setChangeTypeFilter('modified')}
              className={`p-3 rounded-xl border text-left transition-all ${
                changeTypeFilter === 'modified'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Changed</span>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              </div>
              <span className="text-lg font-bold text-blue-700 font-mono">{stats.modifiedCount}</span>
            </button>

            <button
              onClick={() => setChangeTypeFilter('added')}
              className={`p-3 rounded-xl border text-left transition-all ${
                changeTypeFilter === 'added'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Added</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-lg font-bold text-emerald-700 font-mono">{stats.addedCount}</span>
            </button>

            <button
              onClick={() => setChangeTypeFilter('removed')}
              className={`p-3 rounded-xl border text-left transition-all ${
                changeTypeFilter === 'removed'
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Removed</span>
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              </div>
              <span className="text-lg font-bold text-rose-700 font-mono">{stats.removedCount}</span>
            </button>

            <button
              onClick={() => setChangeTypeFilter('unchanged')}
              className={`p-3 rounded-xl border text-left transition-all ${
                changeTypeFilter === 'unchanged'
                  ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Unchanged</span>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              </div>
              <span className="text-lg font-bold text-slate-700 font-mono">{stats.unchangedCount}</span>
            </button>

            <button
              onClick={() => setChangeTypeFilter('needs_review')}
              className={`p-3 rounded-xl border text-left transition-all ${
                changeTypeFilter === 'needs_review'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-700 font-semibold">Needs Review</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-lg font-bold text-amber-700 font-mono">{stats.needsReviewCount}</span>
            </button>
          </div>

          {/* Filters & Search Control Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Change Type Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All Clauses', count: stats.totalClauses },
                  { id: 'modified', label: 'Changed Clauses', count: stats.modifiedCount },
                  { id: 'added', label: 'Added Clauses', count: stats.addedCount },
                  { id: 'removed', label: 'Removed Clauses', count: stats.removedCount },
                  { id: 'unchanged', label: 'Unchanged Important', count: stats.unchangedCount },
                  { id: 'needs_review', label: 'Needs Review', count: stats.needsReviewCount }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setChangeTypeFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      changeTypeFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      changeTypeFilter === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Text Search Input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search aligned clauses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

            </div>

            {/* Category Sub-filter pills */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Filter Category:
              </span>
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-purple-100 text-purple-800 border border-purple-300 font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aligned Clauses Listing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                Displaying {filteredItems.length} of {items.length} Aligned Provisions
              </span>
              <span className="text-[11px] text-slate-400">
                Click any clause card to open side-by-side locations in both documents
              </span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No matching clauses found</p>
                <p className="text-[11px] text-slate-500">Try adjusting your change type filter or search keywords.</p>
                <button
                  onClick={() => {
                    setChangeTypeFilter('all');
                    setCategoryFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs text-purple-700 hover:underline font-medium"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredItems.map((item) => {
                  const getBadgeColor = () => {
                    switch (item.changeType) {
                      case 'added':
                        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
                      case 'removed':
                        return 'bg-rose-50 text-rose-800 border-rose-300';
                      case 'unchanged':
                        return 'bg-slate-100 text-slate-800 border-slate-300';
                      default:
                        return 'bg-blue-50 text-blue-800 border-blue-300';
                    }
                  };

                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveInspectingItem(item)}
                      className="bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all p-5 space-y-3.5 cursor-pointer group"
                    >
                      {/* Top Meta Line */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getBadgeColor()}`}>
                            {item.changeType.toUpperCase()} CLAUSE
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {item.categoryLabel}
                          </span>
                          {item.matchConfidence === 'needs_review' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Needs Review
                            </span>
                          )}
                        </div>

                        {/* Open Locations in Both Documents Callout */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 group-hover:text-purple-900 transition-colors">
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>Inspect Locations in Both Documents</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Clause Title */}
                      <h3 className="text-sm font-bold text-slate-900 font-serif-legal group-hover:text-purple-900 transition-colors">
                        {item.clauseTitle}
                      </h3>

                      {/* Side-by-Side Excerpt Boxes */}
                      <div className="grid md:grid-cols-2 gap-3.5 text-xs">
                        
                        {/* Document A Excerpt */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span className="truncate max-w-[180px] uppercase">DOC A: {doc1.title}</span>
                            {item.docACitation && (
                              <span className="font-mono-legal text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">
                                Page {item.docACitation.page}, {item.docACitation.section}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 leading-relaxed font-mono-legal text-[11px]">
                            {item.docASummary || (item.changeType === 'added' ? 'Clause omitted / not present in Document A' : 'No summary recorded')}
                          </p>
                        </div>

                        {/* Document B Excerpt */}
                        <div className="p-3 bg-purple-50/40 rounded-lg border border-purple-200/90 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-purple-900">
                            <span className="truncate max-w-[180px] uppercase">DOC B: {doc2.title}</span>
                            {item.docBCitation && (
                              <span className="font-mono-legal text-purple-700 bg-purple-100 border border-purple-300 px-1 py-0.5 rounded">
                                Page {item.docBCitation.page}, {item.docBCitation.section}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 leading-relaxed font-mono-legal text-[11px]">
                            {item.docBSummary || (item.changeType === 'removed' ? 'Clause struck / omitted from Document B' : 'No summary recorded')}
                          </p>
                        </div>

                      </div>

                      {/* Plain English Explanation & Practical Difference */}
                      <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/70 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900">Plain English: </span>
                            <span className="text-slate-700 leading-relaxed">{item.plainEnglishExplanation}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 pt-1 border-t border-slate-200/50">
                          <Scale className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900">Practical & Documentary Difference: </span>
                            <span className="text-slate-700 leading-relaxed">{item.practicalDifference}</span>
                          </div>
                        </div>

                        {item.matchConfidence === 'needs_review' && item.needsReviewReason && (
                          <div className="flex items-start gap-2 pt-1 border-t border-amber-200/70 text-amber-900">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Uncertain Alignment: </span>
                              <span className="text-amber-800">{item.needsReviewReason}</span>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Dual Document Location Inspector Modal */}
      {activeInspectingItem && (
        <DualDocumentLocationViewer
          item={activeInspectingItem}
          docA={doc1}
          docB={doc2}
          onClose={() => setActiveInspectingItem(null)}
          onNavigateToReviewPage={onNavigateToReviewPage}
          onSelectPrevItem={handleSelectPrevInspectItem}
          onSelectNextItem={handleSelectNextInspectItem}
          hasPrev={currentInspectIndex > 0}
          hasNext={currentInspectIndex >= 0 && currentInspectIndex < filteredItems.length - 1}
        />
      )}

    </div>
  );
};
