import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldAlert, 
  Filter, 
  ArrowUpRight, 
  Scale, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  Calendar,
  Sparkles,
  Bookmark
} from 'lucide-react';
import { StoredDocument, Clause, AttentionArea, Obligation, Citation } from '../types';
import { getSeverityBadgeColor, formatDate } from '../utils/helpers';

interface DocumentReviewViewProps {
  document: StoredDocument;
  onNavigateTab: (tab: string) => void;
  onOpenLegalContextCheck?: (clauseTitle: string, clauseText: string, jurisdiction?: string) => void;
  targetPage?: number;
  targetSection?: string;
}

export const DocumentReviewView: React.FC<DocumentReviewViewProps> = ({ 
  document, 
  onNavigateTab,
  onOpenLegalContextCheck,
  targetPage,
  targetSection 
}) => {
  const analysis = document.analysis;

  // Left Column Viewer State
  const [currentPage, setCurrentPage] = useState<number>(targetPage || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewerSearch, setViewerSearch] = useState<string>('');
  const [viewerMode, setViewerMode] = useState<'text' | 'pdf'>('text');
  const [highlightedCitation, setHighlightedCitation] = useState<Citation | null>(
    targetPage && targetSection ? { page: targetPage, section: targetSection } : null
  );

  useEffect(() => {
    if (targetPage) {
      setCurrentPage(targetPage);
      if (targetSection) {
        setHighlightedCitation({ page: targetPage, section: targetSection });
      }
    }
  }, [targetPage, targetSection]);

  // Center Column Clause State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedClauseIds, setExpandedClauseIds] = useState<Set<string>>(new Set());
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [copiedClauseId, setCopiedClauseId] = useState<string | null>(null);

  // Right Column Tab State
  const [rightTab, setRightTab] = useState<'attention' | 'obligations' | 'parties_dates'>('attention');
  const [obligationPartyFilter, setObligationPartyFilter] = useState<string>('All');
  const [completedObligations, setCompletedObligations] = useState<Set<string>>(new Set());

  const totalPages = document.pages?.length || analysis?.pageCount || 1;

  // Get active page content
  const activePageData = document.pages?.find((p) => p.pageNumber === currentPage) || {
    pageNumber: currentPage,
    content: `Page ${currentPage} content for ${document.title}.\n\nRefer to digital sections for clause analysis.`
  };

  // Expand first two clauses by default on mount
  useEffect(() => {
    if (analysis?.clauses && analysis.clauses.length > 0) {
      setExpandedClauseIds(new Set([analysis.clauses[0].id, analysis.clauses[1]?.id].filter(Boolean) as string[]));
    }
  }, [document.id]);

  // Navigate viewer to a specific citation with highlighted state
  const handleCitationClick = (citation?: Citation, targetClauseId?: string) => {
    if (!citation) return;
    
    if (citation.page && citation.page <= totalPages && citation.page > 0) {
      setCurrentPage(citation.page);
    }
    
    setHighlightedCitation(citation);

    if (targetClauseId) {
      setActiveClauseId(targetClauseId);
      setExpandedClauseIds((prev) => new Set([...prev, targetClauseId]));
      // Scroll to clause card in center column
      const el = window.document.getElementById(`clause-card-${targetClauseId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Clear citation highlight banner after 6 seconds
    setTimeout(() => {
      setHighlightedCitation(null);
    }, 6000);
  };

  // Toggle clause card expansion
  const toggleClauseExpand = (id: string) => {
    setExpandedClauseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy raw clause text
  const handleCopyClause = (clause: Clause) => {
    navigator.clipboard.writeText(clause.rawText);
    setCopiedClauseId(clause.id);
    setTimeout(() => setCopiedClauseId(null), 2000);
  };

  // Categories for filter tabs
  const categories = ['All', ...Array.from(new Set(analysis?.clauses?.map((c) => c.category) || []))];

  const filteredClauses = (analysis?.clauses || []).filter(
    (c) => selectedCategory === 'All' || c.category === selectedCategory
  );

  const toggleObligation = (id: string) => {
    setCompletedObligations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!analysis) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 font-serif-legal">Document Not Yet Analyzed</h3>
        <p className="text-xs text-slate-500">
          This document has not undergone analysis yet. Run the LexLens engine to extract clauses and citations.
        </p>
        <button
          id="analyze-now-fallback-btn"
          onClick={() => onNavigateTab('upload')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500"
        >
          Analyze Document Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      
      {/* Top Document Status Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              {document.documentType.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400 font-mono-legal">
              {totalPages} Pages • {document.jurisdiction}
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 font-serif-legal">{document.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="review-ask-shortcut-btn"
            onClick={() => onNavigateTab('ask')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask This Document</span>
          </button>
          <button
            id="review-checklist-shortcut-btn"
            onClick={() => onNavigateTab('questions')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lawyer Checklist</span>
          </button>
        </div>
      </div>

      {/* THREE-COLUMN DOCUMENT REVIEW LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (Cols 1-4): Document & PDF Viewer with Source Page Navigation
            ========================================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[820px] overflow-hidden">
          
          {/* Viewer Toolbar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Viewer</span>
              </span>

              {/* View Switcher (Text vs Original PDF) */}
              {document.pdfDataUrl && (
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded text-[10px]">
                  <button
                    id="viewer-mode-text-btn"
                    onClick={() => setViewerMode('text')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      viewerMode === 'text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Clean Transcript
                  </button>
                  <button
                    id="viewer-mode-pdf-btn"
                    onClick={() => setViewerMode('pdf')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      viewerMode === 'pdf' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Original PDF
                  </button>
                </div>
              )}
            </div>

            {/* Page Nav */}
            <div className="flex items-center gap-1">
              <button
                id="page-prev-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-mono-legal text-slate-700 px-1.5">
                Page <strong>{currentPage}</strong> of {totalPages}
              </span>

              <button
                id="page-next-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                id="zoom-out-btn"
                onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono-legal text-slate-500">{zoomLevel}%</span>
              <button
                id="zoom-in-btn"
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viewer Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="viewer-search-input"
                type="text"
                value={viewerSearch}
                onChange={(e) => setViewerSearch(e.target.value)}
                placeholder="Search text on page..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Active Citation Notification Banner */}
          {highlightedCitation && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-1.5 truncate">
                <Bookmark className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold">Viewing Citation:</span>
                <span className="truncate">Page {highlightedCitation.page}, {highlightedCitation.section}</span>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono-legal">
                Active
              </span>
            </div>
          )}

          {/* Document Content Canvas or Embedded PDF */}
          {viewerMode === 'pdf' && document.pdfDataUrl ? (
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex flex-col">
              <iframe
                src={`${document.pdfDataUrl}#page=${currentPage}`}
                className="w-full h-full rounded border border-slate-300 bg-white"
                title="Original PDF Document"
              />
            </div>
          ) : (
            <div className="flex-1 p-5 overflow-y-auto bg-slate-100/50">
              <div 
                className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-6 min-h-full font-serif-legal text-slate-800 transition-all"
                style={{ fontSize: `${(zoomLevel / 100) * 0.82}rem`, lineHeight: 1.7 }}
              >
                <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between text-[11px] font-sans text-slate-400">
                  <span>{document.title}</span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>

                {/* Text Body */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {activePageData.content.split('\n\n').map((paragraph, idx) => {
                    const isHighlighted = highlightedCitation && 
                      highlightedCitation.page === currentPage &&
                      highlightedCitation.section &&
                      paragraph.toLowerCase().includes(highlightedCitation.section.toLowerCase().split(' ')[0] || '');

                    const isSearchMatch = viewerSearch && paragraph.toLowerCase().includes(viewerSearch.toLowerCase());

                    return (
                      <p
                        key={idx}
                        className={`mb-4 transition-all duration-500 rounded p-1.5 ${
                          isHighlighted
                            ? 'bg-amber-100/80 border-l-4 border-amber-500 ring-2 ring-amber-300'
                            : isSearchMatch
                            ? 'bg-yellow-100'
                            : ''
                        }`}
                      >
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10px] font-sans text-slate-400">
                  — End of Page {currentPage} —
                </div>
              </div>
            </div>
          )}

          {/* Viewer Footer Status */}
          <div className="p-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <Scale className="w-3 h-3" />
              <span>Verbatim Source Canvas</span>
            </span>
            <span className="font-mono-legal">{document.fileName}</span>
          </div>

        </div>

        {/* =========================================================================
            CENTER COLUMN (Cols 5-8): Plain-Language Summary & Expandable Key Clauses
            ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Executive Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-serif-legal flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Executive Summary (Plain English)</span>
              </h2>
              <span className="text-[10px] font-mono-legal text-slate-400">
                Analyzed {formatDate(analysis.analyzedAt)}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {analysis.executiveSummary}
            </p>

            {/* Quick Parties Pill Bar */}
            {analysis.parties && analysis.parties.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">Parties:</span>
                {analysis.parties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => party.citation && handleCitationClick(party.citation)}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                    title={party.jurisdictionNoticeAddress}
                  >
                    <span className="font-bold">{party.role}:</span>
                    <span className="truncate max-w-[150px]">{party.name}</span>
                    {party.citation && <ArrowUpRight className="w-3 h-3 text-slate-400 ml-0.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Dimensions & Commercial Terms Card */}
          {(analysis.purpose || analysis.monetaryTerms || analysis.disputeResolutionSummary || analysis.penaltiesSummary || analysis.restrictionsSummary || analysis.privacyDataSummary) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 font-serif-legal uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-indigo-600" />
                <span>Commercial & Regulatory Dimensions</span>
              </h3>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                {analysis.purpose && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Document Purpose</span>
                    <p className="text-slate-700 leading-snug">{analysis.purpose}</p>
                  </div>
                )}

                {analysis.monetaryTerms && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monetary Terms & Escalation</span>
                    <p className="text-slate-700 leading-snug">{analysis.monetaryTerms}</p>
                  </div>
                )}

                {analysis.governingLaw && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Governing Law & Forum</span>
                    <p className="text-slate-700 leading-snug">
                      {typeof analysis.governingLaw === 'string'
                        ? analysis.governingLaw
                        : `${analysis.governingLaw.jurisdiction || ''}${analysis.governingLaw.forum ? ` • Forum: ${analysis.governingLaw.forum}` : ''}`}
                    </p>
                  </div>
                )}

                {analysis.disputeResolutionSummary && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dispute Resolution</span>
                    <p className="text-slate-700 leading-snug">{analysis.disputeResolutionSummary}</p>
                  </div>
                )}

                {analysis.penaltiesSummary && (
                  <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Penalties & Default</span>
                    <p className="text-amber-900 leading-snug">{analysis.penaltiesSummary}</p>
                  </div>
                )}

                {analysis.restrictionsSummary && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Restrictions & Covenants</span>
                    <p className="text-slate-700 leading-snug">{analysis.restrictionsSummary}</p>
                  </div>
                )}

                {analysis.privacyDataSummary && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Privacy & Data Governance</span>
                    <p className="text-slate-700 leading-snug">{analysis.privacyDataSummary}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inconsistencies Alert Card (if present) */}
          {analysis.inconsistencies && analysis.inconsistencies.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Potential Document Inconsistency Detected</span>
              </div>
              {analysis.inconsistencies.map((inc) => (
                <div key={inc.id} className="text-xs text-amber-800 space-y-1.5 pl-6">
                  <p className="font-medium">{inc.title}</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">{inc.description}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-amber-600 font-semibold">Citations:</span>
                    {inc.conflictingCitations.map((cit, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCitationClick(cit)}
                        className="text-[10px] px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-mono-legal flex items-center gap-1"
                      >
                        <span>Page {cit.page}, {cit.section}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key Clauses Section with Category Filter Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-serif-legal">
                  Key Clauses ({filteredClauses.length})
                </h2>
                <p className="text-[11px] text-slate-500">
                  Expand cards to view plain summaries and raw verbatim wording.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    id={`clause-filter-${cat.toLowerCase()}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Clauses List */}
            <div className="space-y-3">
              {filteredClauses.map((clause) => {
                const isExpanded = expandedClauseIds.has(clause.id);
                const isActive = activeClauseId === clause.id;
                const severity = getSeverityBadgeColor(clause.attentionScore || 'low');

                return (
                  <div
                    key={clause.id}
                    id={`clause-card-${clause.id}`}
                    className={`bg-white rounded-xl border transition-all ${
                      isActive
                        ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    {/* Clause Header Bar */}
                    <div 
                      onClick={() => toggleClauseExpand(clause.id)}
                      className="p-4 cursor-pointer flex items-start justify-between gap-3 select-none"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {clause.category}
                          </span>
                          
                          {/* Citation Chip with Click Navigation */}
                          <button
                            id={`cite-btn-${clause.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCitationClick(clause.citation, clause.id);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono-legal px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                            title="Click to jump to page in document viewer"
                          >
                            <span>Page {clause.citation.page}, {clause.citation.section}</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 font-serif-legal">{clause.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{clause.plainSummary}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {clause.attentionScore === 'high' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Review
                          </span>
                        )}
                        <ChevronRight 
                          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        />
                      </div>
                    </div>

                    {/* Expandable Verbatim Raw Text */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/50 rounded-b-xl animate-in fade-in">
                        
                        {/* Key Terms Chips */}
                        {clause.keyTerms && clause.keyTerms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-2">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Key Terms:</span>
                            {clause.keyTerms.map((term, i) => (
                              <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono-legal">
                                {term}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Raw Clause Quote Box */}
                        <div className="relative p-3 bg-white rounded-lg border border-slate-200 text-xs font-serif-legal text-slate-800 leading-relaxed">
                          <div className="flex items-center justify-between text-[10px] font-sans text-slate-400 mb-1.5">
                            <span className="font-semibold uppercase tracking-wider">Verbatim Document Text:</span>
                            <button
                              id={`copy-clause-${clause.id}-btn`}
                              onClick={() => handleCopyClause(clause)}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
                              title="Copy verbatim clause"
                            >
                              {copiedClauseId === clause.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="italic text-slate-700 select-text">"{clause.rawText}"</p>
                        </div>

                        {/* Legal Context Check Quick Action */}
                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-500">
                            Want to examine public statutes & judicial tests for this provision?
                          </span>
                          <button
                            id={`check-context-clause-${clause.id}-btn`}
                            onClick={() => {
                              if (onOpenLegalContextCheck) {
                                onOpenLegalContextCheck(clause.title, clause.rawText || clause.plainSummary, document.jurisdiction);
                              } else {
                                onNavigateTab('context_check');
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors shadow-2xs self-start sm:self-auto"
                          >
                            <Scale className="w-3.5 h-3.5 text-purple-600" />
                            <span>Check Legal Context for this Clause</span>
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* =========================================================================
            RIGHT COLUMN (Cols 9-12): Attention Areas, Obligations, & Dates
            ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Tab Selection in Right Column */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center justify-between text-xs font-semibold">
            <button
              id="tab-attention-btn"
              onClick={() => setRightTab('attention')}
              className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                rightTab === 'attention'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attention ({analysis.attentionAreas?.length || 0})
            </button>
            <button
              id="tab-obligations-btn"
              onClick={() => setRightTab('obligations')}
              className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                rightTab === 'obligations'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Obligations ({analysis.obligations?.length || 0})
            </button>
            <button
              id="tab-dates-btn"
              onClick={() => setRightTab('parties_dates')}
              className={`flex-1 py-1.5 text-center rounded-md transition-all ${
                rightTab === 'parties_dates'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dates & Roles
            </button>
          </div>

          {/* TAB 1: ATTENTION AREAS */}
          {rightTab === 'attention' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-slate-500">
                Clicking an attention area automatically navigates to its clause and source page.
              </div>

              {analysis.attentionAreas?.map((area) => {
                const badge = getSeverityBadgeColor(area.severity);

                return (
                  <div
                    key={area.id}
                    id={`attention-card-${area.id}`}
                    onClick={() => handleCitationClick(area.citation, area.clauseId)}
                    className="p-3.5 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 shadow-xs cursor-pointer transition-all hover:border-indigo-300 group space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {area.severity} Attention
                      </span>
                      <span className="text-[10px] font-mono-legal text-indigo-600 group-hover:underline flex items-center gap-0.5">
                        Page {area.citation.page}
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 font-serif-legal group-hover:text-indigo-900">
                      {area.title}
                    </h4>

                    {/* Responsible AI Explanation */}
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {area.explanation}
                    </p>

                    {/* Action Suggestion */}
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-indigo-900 bg-indigo-50/50 p-2 rounded">
                      <span className="font-semibold block mb-0.5 text-indigo-950">Recommended Action:</span>
                      {area.recommendedAction}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: OBLIGATIONS & DEADLINES */}
          {rightTab === 'obligations' && (
            <div className="space-y-3 animate-in fade-in">
              {/* Obligor Filter */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Party covenants & actions:</span>
                <select
                  id="obligor-filter-select"
                  value={obligationPartyFilter}
                  onChange={(e) => setObligationPartyFilter(e.target.value)}
                  className="text-xs rounded border border-slate-200 px-2 py-1 bg-white"
                >
                  <option value="All">All Parties</option>
                  <option value="Tenant">Tenant</option>
                  <option value="Landlord">Landlord</option>
                </select>
              </div>

              {analysis.obligations
                ?.filter((ob) => obligationPartyFilter === 'All' || ob.obligor.toLowerCase().includes(obligationPartyFilter.toLowerCase()))
                .map((ob) => {
                  const isDone = completedObligations.has(ob.id);

                  return (
                    <div
                      key={ob.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isDone ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          id={`check-ob-${ob.id}`}
                          onClick={() => toggleObligation(ob.id)}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600"
                        >
                          <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                        </button>

                        <div className="space-y-1.5 flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {ob.obligor}
                            </span>
                            <button
                              onClick={() => handleCitationClick(ob.citation)}
                              className="text-[10px] text-indigo-600 hover:underline font-mono-legal flex items-center gap-0.5"
                            >
                              Page {ob.citation.page}
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <p className={`text-slate-800 leading-relaxed ${isDone ? 'line-through text-slate-400' : ''}`}>
                            {ob.description}
                          </p>

                          {ob.deadline && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono-legal pt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Deadline: {ob.deadline}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* TAB 3: IMPORTANT DATES & ROLES */}
          {rightTab === 'parties_dates' && (
            <div className="space-y-4 animate-in fade-in">
              
              {/* Important Dates Timeline */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Key Dates & Deadlines
                </span>

                <div className="space-y-2.5">
                  {analysis.importantDates?.map((date) => (
                    <div
                      key={date.id}
                      onClick={() => handleCitationClick(date.citation)}
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/20 cursor-pointer transition-colors text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{date.title}</span>
                        <span className="text-[10px] font-mono-legal text-indigo-600">
                          {date.dateStr}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{date.significance}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parties & Roles */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Parties & Roles
                </span>

                <div className="space-y-2 text-xs">
                  {analysis.parties?.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                          {p.role}
                        </span>
                      </div>
                      {p.jurisdictionNoticeAddress && (
                        <p className="text-[10px] text-slate-500 font-mono-legal truncate">
                          Address: {p.jurisdictionNoticeAddress}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
