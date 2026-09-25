import React from 'react';
import { 
  FileText, 
  Upload, 
  GitCompare, 
  MessageSquare, 
  CheckSquare, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  Calendar,
  AlertCircle,
  FolderOpen,
  Sparkles,
  ChevronRight,
  Globe
} from 'lucide-react';
import { StoredDocument } from '../types';
import { formatFileSize, formatDate } from '../utils/helpers';

interface DashboardViewProps {
  documents: StoredDocument[];
  activeDoc: StoredDocument | null;
  onSelectDoc: (doc: StoredDocument) => void;
  onNavigate: (tab: string) => void;
  onLoadSample: (sampleType: 'lease' | 'amendment') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  activeDoc,
  onSelectDoc,
  onNavigate,
  onLoadSample
}) => {
  // Aggregate summary metrics
  const totalClauses = documents.reduce((acc, d) => acc + (d.analysis?.clauses?.length || 0), 0);
  const totalAttentionAreas = documents.reduce((acc, d) => acc + (d.analysis?.attentionAreas?.length || 0), 0);
  const highRiskAreas = documents.reduce(
    (acc, d) => acc + (d.analysis?.attentionAreas?.filter(a => a.severity === 'high')?.length || 0),
    0
  );
  const totalObligations = documents.reduce((acc, d) => acc + (d.analysis?.obligations?.length || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Welcome & Responsible Positioning */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Document-First Legal Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif-legal">
            Understand contracts before you sign.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            LexLens extracts key clauses, flags asymmetric terms, catalogs obligations, and maps source citations across your legal documents. Prepare informed questions for your legal counsel with full clause grounding.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              id="dash-upload-primary-btn"
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs tracking-wide shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              id="dash-open-sample-btn"
              onClick={() => onLoadSample('lease')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs tracking-wide transition-all"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Open Commercial Lease (Sample)</span>
            </button>
          </div>
        </div>

        {/* Responsible AI Disclaimer Banner inside hero */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-start gap-2 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong>Responsible AI Notice:</strong> LexLens provides document information and navigation assistance. It does not provide legal advice or replace a licensed attorney.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Documents Loaded</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono-legal">{documents.length}</span>
            <FolderOpen className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Full text & page indexed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Key Clauses Extracted</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono-legal">{totalClauses}</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Plain-language summaries</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attention Areas</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 font-mono-legal">{totalAttentionAreas}</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            {highRiskAreas} high priority to review
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Covenants & Obligations</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono-legal">{totalObligations}</span>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Tracked with deadlines</span>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div>
        <h2 className="text-base font-bold text-slate-900 font-serif-legal mb-3">Core Capabilities</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          <button
            id="capability-review-btn"
            onClick={() => onNavigate('review')}
            className="p-4 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Document Review</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                3-column layout: document text, plain summaries, attention areas, and deadlines.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600">
              <span>Open active review</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            id="capability-compare-btn"
            onClick={() => onNavigate('compare')}
            className="p-4 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <GitCompare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Semantic Compare</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Compare original vs proposed redline by clause meaning, risk shifts, and deletions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-purple-600">
              <span>Compare documents</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            id="capability-ask-btn"
            onClick={() => onNavigate('ask')}
            className="p-4 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Ask this Document</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Document-only citations, or toggle "Legal Context Check" to contrast document vs general law.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
              <span>Ask questions</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            id="capability-questions-btn"
            onClick={() => onNavigate('questions')}
            className="p-4 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">Prepare for Legal Review</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Concise 1-page brief, key clauses, ambiguities, dates, documents to gather, and lawyer questions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-emerald-600">
              <span>Open Review Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            id="capability-context-check-btn"
            onClick={() => onNavigate('context_check')}
            className="p-4 bg-white hover:bg-purple-50/30 rounded-xl border border-purple-200/80 hover:border-purple-300 shadow-xs text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900">Legal Context Check</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ground informational context against public statutes and courts without blending into document analysis.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-medium text-purple-700">
              <span>Public sources check</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

        </div>
      </div>

      {/* Document Library / Recent Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-serif-legal">Document Library</h2>
            <p className="text-xs text-slate-500">Available legal documents ready for review and comparison</p>
          </div>
          <button
            id="dash-upload-link-btn"
            onClick={() => onNavigate('upload')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>+ Add New Document</span>
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isSelected = activeDoc?.id === doc.id;
            const attentionCount = doc.analysis?.attentionAreas?.length || 0;
            const clauseCount = doc.analysis?.clauses?.length || 0;

            return (
              <div
                key={doc.id}
                className={`p-5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-indigo-50/30 border-indigo-300 ring-1 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400 font-mono-legal">
                        {doc.pageCount} pages ({formatFileSize(doc.fileSize)})
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 font-serif-legal">{doc.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.jurisdiction}</span>
                    </p>
                  </div>
                  
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-legal font-medium">{clauseCount} clauses</span>
                    {attentionCount > 0 && (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                        {attentionCount} attention areas
                      </span>
                    )}
                  </div>
                  
                  <button
                    id={`open-doc-${doc.id}-btn`}
                    onClick={() => {
                      onSelectDoc(doc);
                      onNavigate('review');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
