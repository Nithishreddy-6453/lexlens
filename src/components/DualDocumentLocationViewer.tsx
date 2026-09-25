import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { StoredDocument, ComparisonClauseItem } from '../types';

interface DualDocumentLocationViewerProps {
  item: ComparisonClauseItem;
  docA: StoredDocument;
  docB: StoredDocument;
  onClose: () => void;
  onNavigateToReviewPage?: (page: number, section?: string, doc?: StoredDocument) => void;
  onSelectPrevItem?: () => void;
  onSelectNextItem?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const DualDocumentLocationViewer: React.FC<DualDocumentLocationViewerProps> = ({
  item,
  docA,
  docB,
  onClose,
  onNavigateToReviewPage,
  onSelectPrevItem,
  onSelectNextItem,
  hasPrev = false,
  hasNext = false,
}) => {
  const [docAPageIndex, setDocAPageIndex] = useState<number>(
    (item.docACitation?.page || 1) - 1
  );
  const [docBPageIndex, setDocBPageIndex] = useState<number>(
    (item.docBCitation?.page || 1) - 1
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync pages when item changes
  useEffect(() => {
    if (item.docACitation?.page) {
      setDocAPageIndex(Math.max(0, item.docACitation.page - 1));
    }
    if (item.docBCitation?.page) {
      setDocBPageIndex(Math.max(0, item.docBCitation.page - 1));
    }
  }, [item]);

  const docAPages = docA.pages || [{ pageNumber: 1, content: docA.rawText || 'No text content available for Document A.' }];
  const docBPages = docB.pages || [{ pageNumber: 1, content: docB.rawText || 'No text content available for Document B.' }];

  const currentDocAPage = docAPages[Math.min(docAPageIndex, docAPages.length - 1)];
  const currentDocBPage = docBPages[Math.min(docBPageIndex, docBPages.length - 1)];

  // Helper to render text with highlighted excerpts
  const renderHighlightedContent = (
    content: string, 
    excerpt?: string, 
    highlightClass: string = 'bg-amber-100 text-amber-950 font-semibold px-1 rounded border border-amber-300'
  ) => {
    if (!excerpt || !content) {
      return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
    }

    // Try exact or case-insensitive match
    const normalizedContent = content;
    const cleanExcerpt = excerpt.trim();
    const index = normalizedContent.toLowerCase().indexOf(cleanExcerpt.toLowerCase());

    if (index === -1) {
      // If exact excerpt is not found on this page, highlight keywords or show callout
      return (
        <div className="space-y-3">
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="font-semibold shrink-0">Cited Excerpt:</span>
            <span className="italic font-mono-legal">"{cleanExcerpt}"</span>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        </div>
      );
    }

    const before = normalizedContent.slice(0, index);
    const match = normalizedContent.slice(index, index + cleanExcerpt.length);
    const after = normalizedContent.slice(index + cleanExcerpt.length);

    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        {before}
        <mark className={highlightClass}>
          {match}
        </mark>
        {after}
      </div>
    );
  };

  const getBadgeStyle = () => {
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
    <div className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200`}>
      <div 
        id="dual-document-location-modal"
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden w-full transition-all ${
          isFullscreen ? 'h-full max-w-full' : 'max-w-6xl max-h-[92vh] h-[92vh]'
        }`}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getBadgeStyle()}`}>
                  {item.changeType.toUpperCase()} CLAUSE
                </span>
                <span className="text-[11px] font-medium text-slate-300">
                  {item.categoryLabel}
                </span>
                {item.matchConfidence === 'needs_review' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Needs Review
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white truncate font-serif-legal">
                {item.clauseTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cycle through clauses */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                id="modal-prev-clause-btn"
                onClick={onSelectPrevItem}
                disabled={!hasPrev}
                title="Previous Clause"
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-slate-400 px-2 font-mono">
                Clause Jump
              </span>
              <button
                id="modal-next-clause-btn"
                onClick={onSelectNextItem}
                disabled={!hasNext}
                title="Next Clause"
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              id="modal-toggle-fullscreen-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              id="modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 transition-colors"
              title="Close Dual Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-banner: Plain English & Practical Explanation */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 text-xs shrink-0 grid sm:grid-cols-2 gap-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Plain English Explanation</span>
            </span>
            <p className="text-slate-700 leading-relaxed">
              {item.plainEnglishExplanation}
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              <span>Practical & Documentary Difference (Neutral Analysis)</span>
            </span>
            <p className="text-slate-700 leading-relaxed">
              {item.practicalDifference}
            </p>
          </div>
        </div>

        {/* Uncertain match callout */}
        {item.matchConfidence === 'needs_review' && item.needsReviewReason && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Needs Review:</strong> {item.needsReviewReason}
            </span>
          </div>
        )}

        {/* Side-by-Side Dual Source Reader */}
        <div className="flex-1 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden min-h-0">
          
          {/* Document A Location Column */}
          <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Column Header */}
            <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    DOCUMENT A (BASE)
                  </span>
                  {item.docACitation && (
                    <span className="font-mono-legal text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                      Page {item.docACitation.page}, {item.docACitation.section}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-800 truncate" title={docA.title}>
                  {docA.title}
                </h3>
              </div>

              {/* Page Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="docA-prev-page"
                  onClick={() => setDocAPageIndex(Math.max(0, docAPageIndex - 1))}
                  disabled={docAPageIndex === 0}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <span className="text-[11px] font-mono text-slate-600 whitespace-nowrap">
                  p. {docAPageIndex + 1} / {docAPages.length}
                </span>
                <button
                  id="docA-next-page"
                  onClick={() => setDocAPageIndex(Math.min(docAPages.length - 1, docAPageIndex + 1))}
                  disabled={docAPageIndex >= docAPages.length - 1}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                </button>

                {onNavigateToReviewPage && (
                  <button
                    id="docA-open-review-btn"
                    onClick={() => onNavigateToReviewPage(docAPageIndex + 1, item.docACitation?.section, docA)}
                    className="ml-1 p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Open Document A in Full Review"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Document A Summary Box */}
            <div className="p-3 bg-slate-50/70 border-b border-slate-200 text-xs shrink-0">
              <span className="font-bold text-slate-700 block text-[11px] mb-0.5">
                Document A Term:
              </span>
              <p className="text-slate-800 leading-relaxed font-mono-legal text-[11px]">
                {item.docASummary || (item.changeType === 'added' ? 'Clause omitted / not present in Document A' : 'No summary recorded')}
              </p>
            </div>

            {/* Document A Source Text Transcript */}
            <div className="flex-1 overflow-y-auto p-4 font-mono-legal text-[11px] bg-slate-50/30 text-slate-800">
              {item.changeType === 'added' ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Clause Not Present in Document A</p>
                  <p className="text-[11px] max-w-xs mt-1">
                    This provision was newly introduced in Document B and has no corresponding predecessor in Document A.
                  </p>
                </div>
              ) : (
                renderHighlightedContent(
                  currentDocAPage?.content || 'Page content unavailable.',
                  item.docACitation?.exactQuote || item.docATextExcerpt,
                  'bg-amber-100 text-amber-950 font-semibold px-1 rounded border border-amber-300 shadow-2xs'
                )
              )}
            </div>
          </div>

          {/* Document B Location Column */}
          <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Column Header */}
            <div className="px-4 py-3 bg-purple-50/60 border-b border-purple-200/80 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    DOCUMENT B (COMPARISON / REDLINE)
                  </span>
                  {item.docBCitation && (
                    <span className="font-mono-legal text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded">
                      Page {item.docBCitation.page}, {item.docBCitation.section}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-slate-800 truncate" title={docB.title}>
                  {docB.title}
                </h3>
              </div>

              {/* Page Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="docB-prev-page"
                  onClick={() => setDocBPageIndex(Math.max(0, docBPageIndex - 1))}
                  disabled={docBPageIndex === 0}
                  className="p-1 rounded hover:bg-purple-100 disabled:opacity-30 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-purple-700" />
                </button>
                <span className="text-[11px] font-mono text-purple-800 whitespace-nowrap">
                  p. {docBPageIndex + 1} / {docBPages.length}
                </span>
                <button
                  id="docB-next-page"
                  onClick={() => setDocBPageIndex(Math.min(docBPages.length - 1, docBPageIndex + 1))}
                  disabled={docBPageIndex >= docBPages.length - 1}
                  className="p-1 rounded hover:bg-purple-100 disabled:opacity-30 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-purple-700" />
                </button>

                {onNavigateToReviewPage && (
                  <button
                    id="docB-open-review-btn"
                    onClick={() => onNavigateToReviewPage(docBPageIndex + 1, item.docBCitation?.section, docB)}
                    className="ml-1 p-1 text-purple-700 hover:text-purple-900 hover:bg-purple-200/60 rounded transition-colors"
                    title="Open Document B in Full Review"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Document B Summary Box */}
            <div className="p-3 bg-purple-50/30 border-b border-purple-200/60 text-xs shrink-0">
              <span className="font-bold text-purple-900 block text-[11px] mb-0.5">
                Document B Term:
              </span>
              <p className="text-slate-800 leading-relaxed font-mono-legal text-[11px]">
                {item.docBSummary || (item.changeType === 'removed' ? 'Clause struck / omitted in Document B' : 'No summary recorded')}
              </p>
            </div>

            {/* Document B Source Text Transcript */}
            <div className="flex-1 overflow-y-auto p-4 font-mono-legal text-[11px] bg-slate-50/30 text-slate-800">
              {item.changeType === 'removed' ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <FileText className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Clause Omitted from Document B</p>
                  <p className="text-[11px] max-w-xs mt-1">
                    This obligation was present in Document A but has been completely removed or struck from Document B.
                  </p>
                </div>
              ) : (
                renderHighlightedContent(
                  currentDocBPage?.content || 'Page content unavailable.',
                  item.docBCitation?.exactQuote || item.docBTextExcerpt,
                  'bg-purple-100 text-purple-950 font-semibold px-1 rounded border border-purple-300 shadow-2xs'
                )
              )}
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="font-mono-legal">
              Comparing Page {item.docACitation?.page || 1} (Doc A) with Page {item.docBCitation?.page || 1} (Doc B)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToReviewPage && (
              <>
                <button
                  id="footer-open-docA-btn"
                  onClick={() => onNavigateToReviewPage(item.docACitation?.page || 1, item.docACitation?.section, docA)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Doc A in Review</span>
                </button>
                <button
                  id="footer-open-docB-btn"
                  onClick={() => onNavigateToReviewPage(item.docBCitation?.page || 1, item.docBCitation?.section, docB)}
                  className="px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Doc B in Review</span>
                </button>
              </>
            )}
            <button
              id="footer-close-btn"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Done Inspecting
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
