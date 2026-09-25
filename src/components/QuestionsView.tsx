import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Loader2, 
  ArrowUpRight, 
  Bookmark, 
  Edit3, 
  Printer,
  Scale,
  Calendar,
  AlertTriangle,
  FolderPlus,
  FileText,
  Search,
  ChevronRight,
  Info,
  ShieldAlert,
  Clock,
  Briefcase,
  HelpCircle,
  X
} from 'lucide-react';
import { 
  StoredDocument, 
  LawyerQuestion, 
  ImportantClauseToDiscuss, 
  AmbiguousOrMissingItem, 
  ImportantDate, 
  DocumentToGather, 
  OnePageDocumentBrief,
  LegalReviewPrepData 
} from '../types';
import { generateLegalReviewPrep } from '../utils/legalReviewPrepGenerator';

interface QuestionsViewProps {
  document: StoredDocument;
  onNavigateTab: (tab: string) => void;
  onNavigateToPage?: (page: number, section?: string) => void;
}

type SubSectionTab = 'all' | 'brief' | 'clauses' | 'ambiguities' | 'questions' | 'dates' | 'documents' | 'print';

export const QuestionsView: React.FC<QuestionsViewProps> = ({ 
  document, 
  onNavigateTab, 
  onNavigateToPage 
}) => {
  // Generate baseline prep data from document analysis
  const [prepData, setPrepData] = useState<LegalReviewPrepData>(() => generateLegalReviewPrep(document));
  
  // Active navigation inside workspace
  const [activeSubSection, setActiveSubSection] = useState<SubSectionTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Actions state
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [copiedQuestionsSuccess, setCopiedQuestionsSuccess] = useState<boolean>(false);
  const [copiedChecklistSuccess, setCopiedChecklistSuccess] = useState<boolean>(false);
  const [downloadBriefSuccess, setDownloadBriefSuccess] = useState<boolean>(false);
  
  // Custom Question modal / form
  const [isAddingNewQuestion, setIsAddingNewQuestion] = useState<boolean>(false);
  const [newQuestionCategory, setNewQuestionCategory] = useState<LawyerQuestion['category']>('Liability & Risk');
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [newContextText, setNewContextText] = useState<string>('');
  const [newCitationSection, setNewCitationSection] = useState<string>('');
  const [newCitationPage, setNewCitationPage] = useState<number>(1);
  const [newQuestionPriority, setNewQuestionPriority] = useState<'essential' | 'recommended' | 'optional'>('essential');
  
  // Inline counsel note editor
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  // Re-sync prep data when document prop changes
  useEffect(() => {
    setPrepData(generateLegalReviewPrep(document));
  }, [document.id, document.analysis]);

  const categories = [
    'All', 
    'Liability & Risk', 
    'Financial & Fees', 
    'Termination & Transition', 
    'Operational & Compliance', 
    'Intellectual Property'
  ];

  // ---------------------------------------------------------------------------
  // INTERACTIVE TOGGLES & UPDATERS
  // ---------------------------------------------------------------------------
  const toggleQuestionAnswered = (id: string) => {
    setPrepData(prev => ({
      ...prev,
      questionsForCounsel: prev.questionsForCounsel.map(q => 
        q.id === id ? { ...q, isAnswered: !q.isAnswered } : q
      )
    }));
  };

  const handleSaveCounselNote = (id: string) => {
    setPrepData(prev => ({
      ...prev,
      questionsForCounsel: prev.questionsForCounsel.map(q => 
        q.id === id ? { ...q, userNotes: noteDraft } : q
      )
    }));
    setEditingNoteId(null);
    setNoteDraft('');
  };

  const toggleDocumentGathered = (id: string) => {
    setPrepData(prev => ({
      ...prev,
      documentsToGather: prev.documentsToGather.map(d => 
        d.id === id ? { ...d, isGathered: !d.isGathered } : d
      )
    }));
  };

  const toggleAmbiguityStatus = (id: string) => {
    setPrepData(prev => ({
      ...prev,
      missingOrAmbiguousInfo: prev.missingOrAmbiguousInfo.map(a => 
        a.id === id ? { ...a, status: a.status === 'addressed' ? 'open' : 'addressed' } : a
      )
    }));
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const newQ: LawyerQuestion = {
      id: 'custom-q-' + Date.now(),
      category: newQuestionCategory,
      question: newQuestionText.trim(),
      context: newContextText.trim() || 'Custom item added by reviewer.',
      citation: newCitationSection ? {
        page: newCitationPage || 1,
        section: newCitationSection.trim()
      } : undefined,
      priority: newQuestionPriority,
      isAnswered: false
    };

    setPrepData(prev => ({
      ...prev,
      questionsForCounsel: [newQ, ...prev.questionsForCounsel]
    }));

    setNewQuestionText('');
    setNewContextText('');
    setNewCitationSection('');
    setIsAddingNewQuestion(false);
  };

  // ---------------------------------------------------------------------------
  // AI RE-SYNTHESIS
  // ---------------------------------------------------------------------------
  const handleAISynthesizePrep = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/prepare-legal-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          jurisdiction: document.jurisdiction,
          documentType: document.documentType,
          analysis: document.analysis
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.prepData && data.prepData.clausesToDiscuss) {
          setPrepData(prev => ({
            ...prev,
            clausesToDiscuss: data.prepData.clausesToDiscuss || prev.clausesToDiscuss,
            missingOrAmbiguousInfo: data.prepData.missingOrAmbiguousInfo || prev.missingOrAmbiguousInfo,
            questionsForCounsel: data.prepData.questionsForCounsel && data.prepData.questionsForCounsel.length > 0
              ? data.prepData.questionsForCounsel.map((q: any, i: number) => ({
                  ...q,
                  id: 'ai-q-' + Date.now() + '-' + i,
                  isAnswered: false
                }))
              : prev.questionsForCounsel,
            importantDates: data.prepData.importantDates || prev.importantDates,
            documentsToGather: data.prepData.documentsToGather || prev.documentsToGather,
            documentBrief: data.prepData.documentBrief || prev.documentBrief
          }));
        }
      }
    } catch (err) {
      console.error('AI Prep synthesis failed, keeping robust local generation:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORT ACTIONS
  // ---------------------------------------------------------------------------
  
  // 1. Copy Questions
  const handleCopyQuestions = () => {
    const text = `# LexLens - Questions for a Qualified Legal Professional
Document: ${document.title}
Jurisdiction: ${document.jurisdiction}
Generated: ${new Date().toLocaleDateString()}

${prepData.questionsForCounsel.map((q, idx) => `### ${idx + 1}. [${q.priority.toUpperCase()}] ${q.question}
- Category: ${q.category}
- Context: ${q.context}
${q.citation ? `- Citation: Page ${q.citation.page}, ${q.citation.section}` : '- Citation: Referenced in agreement text'}
- Status: ${q.isAnswered ? '[X] Addressed with counsel' : '[ ] Open for discussion'}
${q.userNotes ? `- Counsel Notes: ${q.userNotes}` : ''}
`).join('\n')}

---
Neutrality Notice: Prepared solely for client consultation with a licensed attorney. Does not constitute legal advice or guarantee specific legal outcomes.`;

    navigator.clipboard.writeText(text);
    setCopiedQuestionsSuccess(true);
    setTimeout(() => setCopiedQuestionsSuccess(false), 2500);
  };

  // 2. Export Checklist
  const handleExportChecklist = () => {
    const text = `# LexLens - Legal Review Preparation Checklist
Document: ${document.title}
Jurisdiction: ${document.jurisdiction}
Document Type: ${document.documentType}
Date: ${new Date().toLocaleDateString()}

================================================================================
1. IMPORTANT CLAUSES TO DISCUSS
================================================================================
${prepData.clausesToDiscuss.map((c, i) => `${i + 1}. ${c.title} [${c.category}]
   - Citation: Page ${c.citation.page}, ${c.citation.section}
   - Summary: ${c.plainSummary}
   - Discussion Reason: ${c.discussionReason}
   ${c.sourceQuote ? `- Excerpt: "${c.sourceQuote}"` : ''}
`).join('\n')}

================================================================================
2. MISSING OR AMBIGUOUS INFORMATION
================================================================================
${prepData.missingOrAmbiguousInfo.map((a, i) => `${i + 1}. ${a.topic}
   - Citation: Page ${a.citation?.page || 'N/A'}, ${a.citation?.section || 'General'}
   - Description: ${a.description}
   - Potential Impact: ${a.potentialImpact}
   - Suggested Clarification: ${a.suggestedClarification}
   - Status: ${a.status === 'addressed' ? '[X] Clarified' : '[ ] Pending review'}
`).join('\n')}

================================================================================
3. QUESTIONS FOR A QUALIFIED LEGAL PROFESSIONAL
================================================================================
${prepData.questionsForCounsel.map((q, i) => `${i + 1}. [${q.priority.toUpperCase()}] ${q.question}
   - Category: ${q.category}
   - Citation: Page ${q.citation?.page || 1}, ${q.citation?.section || 'N/A'}
   - Context: ${q.context}
   - Status: ${q.isAnswered ? '[X] Addressed' : '[ ] Open'}
   ${q.userNotes ? `- Notes: ${q.userNotes}` : ''}
`).join('\n')}

================================================================================
4. IMPORTANT DATES & DEADLINES
================================================================================
${prepData.importantDates.map((d, i) => `${i + 1}. ${d.title}: ${d.dateStr}
   - Type: ${d.type}
   - Citation: Page ${d.citation.page}, ${d.citation.section}
   - Significance: ${d.significance}
`).join('\n')}

================================================================================
5. DOCUMENTS OR INFORMATION TO GATHER
================================================================================
${prepData.documentsToGather.map((d, i) => `${i + 1}. [${d.isGathered ? 'X' : ' '}] ${d.documentName} (Urgency: ${d.urgency.toUpperCase()})
   - Purpose: ${d.purpose}
   - Related Clause: ${d.relatedClauseOrTopic}
   ${d.citation ? `- Citation: Page ${d.citation.page}, ${d.citation.section}` : ''}
`).join('\n')}

================================================================================
RESPONSIBLE AI & NEUTRALITY DISCLOSURE
================================================================================
This checklist is prepared to assist a user in gathering information and organizing 
questions prior to meeting with a qualified attorney. LexLens does not provide legal 
advice, determine legal enforceability, or guarantee any specific legal outcome.
`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `LexLens_Legal_Review_Checklist_${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setCopiedChecklistSuccess(true);
    setTimeout(() => setCopiedChecklistSuccess(false), 2500);
  };

  // 3. Download Document Summary (Concise One-Page Brief)
  const handleDownloadDocumentSummary = () => {
    const b = prepData.documentBrief;
    const text = `# CONCISE LEGAL DOCUMENT BRIEF
Agreement Title: ${b.agreementTitle}
Document Type: ${b.documentType}
Jurisdiction & Venue: ${b.jurisdictionAndVenue}
Date Generated: ${new Date().toLocaleDateString()}

1. CONTRACTING PARTIES & DESIGNATED ROLES:
${b.parties.map(p => `   - ${p.name} (${p.role}) [Citation: Page ${p.citation?.page || 1}, ${p.citation?.section || 'Preamble'}]`).join('\n')}

2. TERM & DURATION:
   - ${b.termAndDuration.summary}
   - Citation: Page ${b.termAndDuration.citation?.page || 1}, ${b.termAndDuration.citation?.section || 'Section 1.2'}

3. FINANCIAL COMMITMENTS & ESCALATIONS:
   - ${b.financialCommitmentsSummary.summary}
   - Citation: Page ${b.financialCommitmentsSummary.citation?.page || 2}, ${b.financialCommitmentsSummary.citation?.section || 'Financial Terms'}

4. CRITICAL OPERATIONAL CAVEATS & RISK EXPOSURES:
${b.criticalOperationalCaveats.map(c => `   - ${c.point} [Citation: Page ${c.citation?.page || 'N/A'}, ${c.citation?.section || 'Section'}]`).join('\n')}

5. IDENTIFIED AMBIGUITIES & MISSING PROVISIONS:
   - Identified ${b.identifiedAmbiguitiesCount} items requiring clarification (including unstated base years, non-monetary notice grace periods, and referenced unappended exhibits).

6. RECOMMENDED MEETING FOCUS FOR LEGAL COUNSEL:
   - ${b.recommendedMeetingFocus}

--------------------------------------------------------------------------------
LEGAL DISCLAIMER:
${b.disclaimer}
`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `LexLens_Document_Brief_${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadBriefSuccess(true);
    setTimeout(() => setDownloadBriefSuccess(false), 2500);
  };

  // 4. Print / PDF action
  const handleTriggerPrint = () => {
    window.print();
  };

  // ---------------------------------------------------------------------------
  // FILTERING
  // ---------------------------------------------------------------------------
  const filteredQuestions = useMemo(() => {
    return prepData.questionsForCounsel.filter(q => {
      const matchesCat = selectedCategory === 'All' || q.category === selectedCategory;
      const matchesSearch = !searchTerm || 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.context.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.citation?.section || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [prepData.questionsForCounsel, selectedCategory, searchTerm]);

  const filteredClauses = useMemo(() => {
    if (!searchTerm) return prepData.clausesToDiscuss;
    const s = searchTerm.toLowerCase();
    return prepData.clausesToDiscuss.filter(c => 
      c.title.toLowerCase().includes(s) ||
      c.plainSummary.toLowerCase().includes(s) ||
      c.discussionReason.toLowerCase().includes(s) ||
      c.citation.section.toLowerCase().includes(s)
    );
  }, [prepData.clausesToDiscuss, searchTerm]);

  const answeredCount = prepData.questionsForCounsel.filter(q => q.isAnswered).length;
  const gatheredCount = prepData.documentsToGather.filter(d => d.isGathered).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">

      {/* TOP HEADER & ACTION BAR */}
      <div className="border-b border-slate-200 pb-5 space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <span>Legal Consultation Preparation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif-legal tracking-tight">
              Prepare for Legal Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Structured preparation briefing and tactical checklists generated from your uploaded document. Retains source citations across all points to streamline your attorney consultation.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* 1. Copy questions */}
            <button
              id="copy-questions-btn"
              onClick={handleCopyQuestions}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Copy formatted questions list with page citations to clipboard"
            >
              {copiedQuestionsSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedQuestionsSuccess ? 'Questions Copied' : 'Copy questions'}</span>
            </button>

            {/* 2. Export checklist */}
            <button
              id="export-checklist-btn"
              onClick={handleExportChecklist}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Export complete legal review checklist (clauses, ambiguities, questions, dates, files) as Markdown"
            >
              {copiedChecklistSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedChecklistSuccess ? 'Exported' : 'Export checklist'}</span>
            </button>

            {/* 3. Download document summary */}
            <button
              id="download-summary-btn"
              onClick={handleDownloadDocumentSummary}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download concise one-page case/document brief"
            >
              {downloadBriefSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
              <span>{downloadBriefSuccess ? 'Downloaded' : 'Download document summary'}</span>
            </button>

            {/* 4. Print / PDF Button */}
            <button
              id="print-view-btn"
              onClick={handleTriggerPrint}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Open polished print-friendly layout or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print view</span>
            </button>

            {/* Optional AI Re-synthesis */}
            <button
              id="ai-synthesize-prep-btn"
              onClick={handleAISynthesizePrep}
              disabled={isGeneratingAI}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Re-synthesize insights with Gemini 3.8 Flash"
            >
              {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-300" />}
              <span>{isGeneratingAI ? 'Synthesizing...' : 'AI Re-analyze'}</span>
            </button>

          </div>
        </div>

        {/* NEUTRALITY BANNER & RESPONSIBLE LEGAL DISCLAIMER */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-600">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-800">Neutrality & Preparation Boundary: </strong>
            All materials below are formulated using objective, neutral language to organize facts and discussion points. LexLens does not advise what legal decisions to make, recommend specific commercial concessions, or claim that any particular legal outcome is guaranteed. All items cite their source clauses for direct review with a qualified legal professional.
          </div>
        </div>

        {/* SECTION NAVIGATION PILLS */}
        <div className="flex items-center justify-between gap-3 pt-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSubSection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubSection === 'all'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All 6 Sections
            </button>
            <button
              onClick={() => setActiveSubSection('brief')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeSubSection === 'brief'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1-Page Document Brief</span>
            </button>
            <button
              onClick={() => setActiveSubSection('clauses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubSection === 'clauses'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Important Clauses ({prepData.clausesToDiscuss.length})
            </button>
            <button
              onClick={() => setActiveSubSection('ambiguities')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubSection === 'ambiguities'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Missing / Ambiguities ({prepData.missingOrAmbiguousInfo.length})
            </button>
            <button
              onClick={() => setActiveSubSection('questions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubSection === 'questions'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Questions ({answeredCount}/{prepData.questionsForCounsel.length})
            </button>
            <button
              onClick={() => setActiveSubSection('dates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubSection === 'dates'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Dates & Deadlines ({prepData.importantDates.length})
            </button>
            <button
              onClick={() => setActiveSubSection('documents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeSubSection === 'documents'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Docs to Gather ({gatheredCount}/{prepData.documentsToGather.length})
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative shrink-0 w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clauses, questions..."
              className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CONCISE ONE-PAGE CASE / DOCUMENT BRIEF (Displayed prominently)         */}
      {/* ========================================================================= */}
      {(activeSubSection === 'all' || activeSubSection === 'brief') && (
        <section 
          id="section-document-brief"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 print-brief-container print-break-inside-avoid"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                6
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif-legal">
                  Concise One-Page Document Brief
                </h2>
                <span className="text-[11px] text-slate-500">
                  Formatted executive summary for rapid consultation with legal counsel
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleDownloadDocumentSummary}
                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Brief</span>
              </button>
              <button
                onClick={handleTriggerPrint}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Brief</span>
              </button>
            </div>
          </div>

          {/* Brief Meta Grid */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Agreement Title</span>
              <span className="font-semibold text-slate-800 block mt-0.5 truncate" title={prepData.documentBrief.agreementTitle}>
                {prepData.documentBrief.agreementTitle}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Document Type</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {prepData.documentBrief.documentType}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Jurisdiction & Venue</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-semibold text-slate-800">{prepData.documentBrief.jurisdictionAndVenue}</span>
                {prepData.documentBrief.governingLawCitation && (
                  <button
                    onClick={() => {
                      if (onNavigateToPage && prepData.documentBrief.governingLawCitation) {
                        onNavigateToPage(prepData.documentBrief.governingLawCitation.page, prepData.documentBrief.governingLawCitation.section);
                      }
                      onNavigateTab('review');
                    }}
                    className="text-indigo-600 hover:underline font-mono-legal text-[10px] inline-flex items-center"
                    title="Jump to governing law citation"
                  >
                    <span>p.{prepData.documentBrief.governingLawCitation.page}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Flagged Ambiguities</span>
              <span className="font-semibold text-amber-700 block mt-0.5">
                {prepData.documentBrief.identifiedAmbiguitiesCount} open items to clarify
              </span>
            </div>
          </div>

          {/* Core Brief Sections */}
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            
            {/* Parties */}
            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  1. Contracting Parties & Roles
                </span>
              </div>
              <ul className="space-y-1.5 text-slate-700">
                {prepData.documentBrief.parties.map((p, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                    <div>
                      <strong className="text-slate-900">{p.name}</strong>
                      <span className="text-slate-500 ml-1">({p.role})</span>
                    </div>
                    {p.citation && (
                      <span className="text-[10px] text-slate-400 font-mono-legal shrink-0">
                        p.{p.citation.page}, {p.citation.section}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Term & Duration */}
            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  2. Term, Expiration & Renewal
                </span>
                {prepData.documentBrief.termAndDuration.citation && (
                  <span className="text-[10px] text-slate-400 font-mono-legal">
                    p.{prepData.documentBrief.termAndDuration.citation.page}, {prepData.documentBrief.termAndDuration.citation.section}
                  </span>
                )}
              </div>
              <p className="text-slate-700 leading-relaxed">
                {prepData.documentBrief.termAndDuration.summary}
              </p>
            </div>

            {/* Financial Commitments */}
            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  3. Key Financial Covenants & Escalations
                </span>
                {prepData.documentBrief.financialCommitmentsSummary.citation && (
                  <span className="text-[10px] text-slate-400 font-mono-legal">
                    p.{prepData.documentBrief.financialCommitmentsSummary.citation.page}, {prepData.documentBrief.financialCommitmentsSummary.citation.section}
                  </span>
                )}
              </div>
              <p className="text-slate-700 leading-relaxed">
                {prepData.documentBrief.financialCommitmentsSummary.summary}
              </p>
            </div>

            {/* Critical Operational Caveats */}
            <div className="space-y-2 p-3.5 rounded-lg border border-slate-200 bg-white">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                4. Critical Operational Caveats & Asymmetries
              </span>
              <ul className="space-y-1.5 text-slate-700">
                {prepData.documentBrief.criticalOperationalCaveats.map((c, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                    <span className="leading-snug">{c.point}</span>
                    {c.citation && (
                      <span className="text-[10px] text-slate-400 font-mono-legal shrink-0">
                        p.{c.citation.page}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Recommended Meeting Focus */}
          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
            <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px] block">
              5. Recommended Meeting Focus for Counsel
            </span>
            <p className="text-amber-950 leading-relaxed">
              {prepData.documentBrief.recommendedMeetingFocus}
            </p>
          </div>

          {/* Disclaimer text */}
          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 leading-relaxed">
            {prepData.documentBrief.disclaimer}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 1. IMPORTANT CLAUSES TO DISCUSS                                           */}
      {/* ========================================================================= */}
      {(activeSubSection === 'all' || activeSubSection === 'clauses') && (
        <section id="section-important-clauses" className="space-y-3 print-break-inside-avoid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif-legal">
                Important Clauses to Discuss
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono-legal">
              {filteredClauses.length} provisions identified
            </span>
          </div>

          <div className="space-y-3">
            {filteredClauses.map((clause) => (
              <div
                key={clause.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 font-serif-legal">
                      {clause.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {clause.category}
                    </span>
                    {clause.riskSeverity && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        clause.riskSeverity === 'high' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {clause.riskSeverity} impact
                      </span>
                    )}
                  </div>

                  {/* Source Citation */}
                  <button
                    onClick={() => {
                      if (onNavigateToPage) {
                        onNavigateToPage(clause.citation.page, clause.citation.section);
                      }
                      onNavigateTab('review');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-mono-legal text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100 no-print"
                    title="Jump to cited clause in Document Review"
                  >
                    <span>Page {clause.citation.page}, {clause.citation.section}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <span className="hidden print:inline text-[10px] font-mono-legal text-slate-500">
                    Page {clause.citation.page}, {clause.citation.section}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Summary: </strong>
                  {clause.plainSummary}
                </p>

                <div className="p-2.5 rounded-lg bg-indigo-50/40 border border-indigo-100/70 text-slate-700">
                  <strong className="text-indigo-950">Reason to discuss with counsel: </strong>
                  <span>{clause.discussionReason}</span>
                </div>

                {clause.sourceQuote && (
                  <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                    "{clause.sourceQuote}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. MISSING OR AMBIGUOUS INFORMATION                                       */}
      {/* ========================================================================= */}
      {(activeSubSection === 'all' || activeSubSection === 'ambiguities') && (
        <section id="section-ambiguities" className="space-y-3 print-break-inside-avoid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif-legal">
                Missing or Ambiguous Information
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono-legal">
              {prepData.missingOrAmbiguousInfo.length} items flagged
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {prepData.missingOrAmbiguousInfo.map((ambig) => {
              const isAddressed = ambig.status === 'addressed';
              return (
                <div
                  key={ambig.id}
                  className={`p-4 rounded-xl border transition-all text-xs space-y-2.5 ${
                    isAddressed 
                      ? 'bg-slate-50/70 border-slate-200 opacity-70' 
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAmbiguityStatus(ambig.id)}
                        className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0 no-print"
                        title={isAddressed ? 'Mark open' : 'Mark addressed'}
                      >
                        <CheckSquare className={`w-4 h-4 ${isAddressed ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                      </button>
                      <h3 className={`font-bold text-slate-900 font-serif-legal text-sm ${isAddressed ? 'line-through text-slate-400' : ''}`}>
                        {ambig.topic}
                      </h3>
                    </div>

                    {ambig.citation && (
                      <button
                        onClick={() => {
                          if (onNavigateToPage && ambig.citation) {
                            onNavigateToPage(ambig.citation.page, ambig.citation.section);
                          }
                          onNavigateTab('review');
                        }}
                        className="text-[10px] font-mono-legal text-indigo-600 hover:underline shrink-0 no-print inline-flex items-center gap-0.5"
                      >
                        <span>p.{ambig.citation.page}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    {ambig.description}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <div className="p-2 rounded bg-amber-50/60 border border-amber-100 text-amber-900">
                      <strong className="text-amber-950">Potential Impact: </strong>
                      <span>{ambig.potentialImpact}</span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-700">
                      <strong className="text-slate-900">Suggested Clarification: </strong>
                      <span>{ambig.suggestedClarification}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. QUESTIONS FOR A QUALIFIED LEGAL PROFESSIONAL                           */}
      {/* ========================================================================= */}
      {(activeSubSection === 'all' || activeSubSection === 'questions') && (
        <section id="section-lawyer-questions" className="space-y-4 print-break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif-legal">
                  Questions the User May Want to Ask a Qualified Legal Professional
                </h2>
                <p className="text-xs text-slate-500">
                  Targeted, objective questions structured around identified risks and attention areas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                id="add-custom-question-btn"
                onClick={() => setIsAddingNewQuestion(true)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
              <button
                onClick={handleCopyQuestions}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Questions</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-900 font-mono-legal">
                {answeredCount} of {prepData.questionsForCounsel.length} Addressed
              </span>
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ 
                    width: `${prepData.questionsForCounsel.length > 0 ? (answeredCount / prepData.questionsForCounsel.length) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Add Custom Question Form (Accordion) */}
          {isAddingNewQuestion && (
            <form
              onSubmit={handleAddCustomQuestion}
              className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm space-y-3 animate-in fade-in no-print"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 font-serif-legal">Add Custom Question for Legal Counsel</h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNewQuestion(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Category</label>
                  <select
                    value={newQuestionCategory}
                    onChange={(e) => setNewQuestionCategory(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  >
                    <option value="Liability & Risk">Liability & Risk</option>
                    <option value="Financial & Fees">Financial & Fees</option>
                    <option value="Termination & Transition">Termination & Transition</option>
                    <option value="Operational & Compliance">Operational & Compliance</option>
                    <option value="Intellectual Property">Intellectual Property</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Priority</label>
                  <select
                    value={newQuestionPriority}
                    onChange={(e) => setNewQuestionPriority(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  >
                    <option value="essential">Essential</option>
                    <option value="recommended">Recommended</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Question</label>
                <input
                  type="text"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="e.g. Can we request a 30-day notice and cure period for non-monetary covenant breaches?"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Context / Reason for asking</label>
                  <input
                    type="text"
                    value={newContextText}
                    onChange={(e) => setNewContextText(e.target.value)}
                    placeholder="e.g. Section 6.2 currently specifies no cure period for non-monetary items."
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Clause Citation (Optional)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={newCitationPage}
                      onChange={(e) => setNewCitationPage(parseInt(e.target.value) || 1)}
                      placeholder="Page"
                      className="w-16 text-xs rounded-lg border border-slate-300 p-2 text-center"
                      title="Page number"
                    />
                    <input
                      type="text"
                      value={newCitationSection}
                      onChange={(e) => setNewCitationSection(e.target.value)}
                      placeholder="Section 6.2"
                      className="flex-1 text-xs rounded-lg border border-slate-300 p-2"
                      title="Section name"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingNewQuestion(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Save Question
                </button>
              </div>
            </form>
          )}

          {/* Question List Cards */}
          <div className="space-y-3">
            {filteredQuestions.map((item) => {
              const isDone = item.isAnswered;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-slate-50/70 border-slate-200 opacity-70'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleQuestionAnswered(item.id)}
                      className="mt-1 text-slate-400 hover:text-emerald-600 transition-colors no-print"
                      title={isDone ? 'Mark unanswered' : 'Mark answered with counsel'}
                    >
                      <CheckSquare
                        className={`w-5 h-5 ${isDone ? 'text-emerald-600 fill-emerald-100' : 'text-slate-300'}`}
                      />
                    </button>
                    <span className="hidden print:inline-block w-4 h-4 border border-slate-400 rounded-sm mt-1 shrink-0" />

                    {/* Content */}
                    <div className="space-y-2 flex-1 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.priority === 'essential'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.priority === 'recommended'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.priority}
                          </span>
                        </div>

                        {item.citation && (
                          <button
                            onClick={() => {
                              if (onNavigateToPage && item.citation) {
                                onNavigateToPage(item.citation.page, item.citation.section);
                              }
                              onNavigateTab('review');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono-legal text-indigo-600 hover:underline no-print"
                            title="Jump to cited page in Document Review"
                          >
                            <span>Page {item.citation.page}, {item.citation.section}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                        {item.citation && (
                          <span className="hidden print:inline text-[10px] font-mono-legal text-slate-500">
                            Page {item.citation.page}, {item.citation.section}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-sm font-bold text-slate-900 font-serif-legal ${
                        isDone ? 'line-through text-slate-400' : ''
                      }`}>
                        {item.question}
                      </h3>

                      <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <strong className="text-slate-800">Context: </strong>
                        {item.context}
                      </p>

                      {/* User Notes Section */}
                      <div className="pt-1">
                        {editingNoteId === item.id ? (
                          <div className="space-y-2 no-print">
                            <textarea
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Record your counsel's answer or negotiation notes..."
                              rows={2}
                              className="w-full p-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="text-xs text-slate-500 px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveCounselNote(item.id)}
                                className="text-xs font-semibold bg-slate-900 text-white px-3 py-1 rounded-md"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            {item.userNotes ? (
                              <div className="text-indigo-900 bg-indigo-50/50 p-2 rounded border border-indigo-100 flex-1 mr-2">
                                <strong>Counsel Response / Note: </strong>
                                {item.userNotes}
                              </div>
                            ) : (
                              <span className="italic text-slate-400 no-print">No attorney notes recorded yet.</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingNoteId(item.id);
                                setNoteDraft(item.userNotes || '');
                              }}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-1 shrink-0 no-print"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>{item.userNotes ? 'Edit' : 'Add Note'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. IMPORTANT DATES / DEADLINES                                            */}
      {/* ========================================================================= */}
      {(activeSubSection === 'all' || activeSubSection === 'dates') && (
        <section id="section-important-dates" className="space-y-3 print-break-inside-avoid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif-legal">
                Important Dates and Deadlines
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono-legal">
              {prepData.importantDates.length} timeline milestones
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prepData.importantDates.map((dateItem) => (
              <div
                key={dateItem.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between text-xs space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    <span>{dateItem.type.replace(/_/g, ' ')}</span>
                    <Clock className="w-3 h-3 text-purple-500" />
                  </div>

                  <h3 className="font-bold text-slate-900 font-serif-legal text-sm mt-2">
                    {dateItem.title}
                  </h3>

                  <p className="font-mono-legal font-bold text-slate-800 mt-1 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                    {dateItem.dateStr}
                  </p>

                  <p className="text-slate-600 mt-2 leading-relaxed">
                    {dateItem.significance}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono-legal">
                  <span>Citation:</span>
                  <button
                    onClick={() => {
                      if (onNavigateToPage) {
                        onNavigateToPage(dateItem.citation.page, dateItem.citation.section);
                      }
                      onNavigateTab('review');
                    }}
                    className="text-indigo-600 hover:underline flex items-center gap-0.5 no-print"
                  >
                    <span>p.{dateItem.citation.page}, {dateItem.citation.section}</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </button>
                  <span className="hidden print:inline">
                    p.{dateItem.citation.page}, {dateItem.citation.section}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. DOCUMENTS OR INFORMATION TO GATHER                                     */}
      {/* ========================================================================= */}
      {(activeSubSection === 'all' || activeSubSection === 'documents') && (
        <section id="section-documents-to-gather" className="space-y-3 print-break-inside-avoid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif-legal">
                Documents or Information the User May Want to Gather
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono-legal">
              {gatheredCount} of {prepData.documentsToGather.length} gathered
            </span>
          </div>

          <div className="space-y-2.5">
            {prepData.documentsToGather.map((docItem) => {
              const isGathered = docItem.isGathered;
              return (
                <div
                  key={docItem.id}
                  className={`p-3.5 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                    isGathered
                      ? 'bg-slate-50/70 border-slate-200 opacity-70'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <button
                    onClick={() => toggleDocumentGathered(docItem.id)}
                    className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0 no-print"
                    title={isGathered ? 'Mark pending' : 'Mark gathered'}
                  >
                    <CheckSquare className={`w-4 h-4 ${isGathered ? 'text-blue-600 fill-blue-100' : ''}`} />
                  </button>
                  <span className="hidden print:inline-block w-3.5 h-3.5 border border-slate-400 rounded-xs mt-0.5 shrink-0" />

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-slate-900 font-serif-legal text-sm ${isGathered ? 'line-through text-slate-400' : ''}`}>
                          {docItem.documentName}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          docItem.urgency === 'high'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : docItem.urgency === 'medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {docItem.urgency} urgency
                        </span>
                      </div>

                      {docItem.citation && (
                        <button
                          onClick={() => {
                            if (onNavigateToPage && docItem.citation) {
                              onNavigateToPage(docItem.citation.page, docItem.citation.section);
                            }
                            onNavigateTab('review');
                          }}
                          className="text-[10px] font-mono-legal text-indigo-600 hover:underline no-print inline-flex items-center gap-0.5"
                        >
                          <span>Page {docItem.citation.page}, {docItem.citation.section}</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {docItem.citation && (
                        <span className="hidden print:inline text-[10px] font-mono-legal text-slate-500">
                          Page {docItem.citation.page}, {docItem.citation.section}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Purpose: </strong>
                      {docItem.purpose}
                    </p>

                    <span className="text-[11px] text-slate-500 block">
                      Related Covenant: <strong>{docItem.relatedClauseOrTopic}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FINAL PRINT FOOTER (Rendered when printed) */}
      <div className="hidden print:block text-[9pt] text-slate-400 border-t border-slate-300 pt-4 mt-8">
        <div className="flex justify-between items-center">
          <span>LexLens Legal Intelligence &bull; Preparation for Legal Review</span>
          <span>Document: {document.title} &bull; Generated {new Date().toLocaleDateString()}</span>
        </div>
        <p className="mt-1 text-slate-500">
          Disclaimer: This preparation briefing is for informational and consultation-structuring purposes only. It does not constitute legal advice, provide a formal legal opinion, or guarantee any specific legal outcome.
        </p>
      </div>

    </div>
  );
};
