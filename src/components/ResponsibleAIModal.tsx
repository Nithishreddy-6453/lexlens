import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, BookOpen, ExternalLink } from 'lucide-react';

interface ResponsibleAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResponsibleAIModal: React.FC<ResponsibleAIModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
        
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-serif-legal">
                Responsible AI & Legal Information Framework
              </h3>
              <p className="text-xs text-slate-500">
                Ethical boundaries, verified source grounding, and professional preparation
              </p>
            </div>
          </div>
          <button
            id="close-responsible-modal-btn"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-600">
          
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg">
            <h4 className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Not Legal Advice
            </h4>
            <p className="text-amber-800">
              LexLens is a document-first AI legal information assistant designed to help non-lawyers and professionals parse, compare, and navigate agreements. It is <strong>not a law firm</strong>, does not establish an attorney-client relationship, and cannot replace the counsel of a licensed attorney admitted to practice in your jurisdiction.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                What LexLens Does
              </span>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside pl-1">
                <li>Parses raw document text into plain-language summaries.</li>
                <li>Points to <strong>exact page & section citations</strong>.</li>
                <li>Highlights asymmetric, unusual, or ambiguous wording.</li>
                <li>Identifies concrete obligations and critical deadlines.</li>
                <li>Prepares a tactical question checklist for your lawyer.</li>
              </ul>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                What LexLens Explicitly Avoids
              </span>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside pl-1">
                <li>No fake "confidence scores" or enforceability guarantees.</li>
                <li>Never claims a clause is legally invalid without court precedent.</li>
                <li>Refuses to fabricate missing terms or undisclosed facts.</li>
                <li>Strictly isolates "Document says" from "External legal theory".</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1.5">
            <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Objective Finding Language
            </span>
            <p className="text-indigo-900">
              Findings throughout LexLens utilize objective framing standards:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-1 text-[11px] font-mono-legal text-indigo-800">
              <div className="bg-white/80 p-1.5 rounded border border-indigo-100">"The document states..."</div>
              <div className="bg-white/80 p-1.5 rounded border border-indigo-100">"This clause may deserve review because..."</div>
              <div className="bg-white/80 p-1.5 rounded border border-indigo-100">"The available document does not establish..."</div>
              <div className="bg-white/80 p-1.5 rounded border border-indigo-100">"Consider discussing this with qualified counsel."</div>
            </div>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">LexLens Core Guidelines v1.0</span>
          <button
            id="acknowledge-responsible-ai-btn"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
};
