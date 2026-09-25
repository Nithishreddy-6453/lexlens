import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Sparkles,
  Building,
  Globe,
  Database,
  Layers,
  GitCompare,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  CheckSquare,
  FileCheck
} from 'lucide-react';
import { DocumentType, StoredDocument, DocumentAnalysis, BatchUploadFileItem } from '../types';
import { formatFileSize } from '../utils/helpers';
import { SAMPLE_COMMERCIAL_LEASE, SAMPLE_PROPOSED_AMENDMENT } from '../data/sampleDocuments';
import { saveDocumentToFirestore } from '../lib/firebase';

interface UploadViewProps {
  onAnalysisComplete: (newDoc: StoredDocument) => void;
  onBatchAnalysisComplete?: (newDocs: StoredDocument[], autoNavigateToCompare?: boolean, docAId?: string, docBId?: string) => void;
  onNavigate: (tab: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ 
  onAnalysisComplete, 
  onBatchAnalysisComplete, 
  onNavigate 
}) => {
  // Mode: 'batch' (multi-document indexing & comparison) vs 'single'
  const [uploadMode, setUploadMode] = useState<'batch' | 'single'>('batch');

  // Single file state
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singlePdfBase64, setSinglePdfBase64] = useState<string | null>(null);
  const [singleDocTitle, setSingleDocTitle] = useState<string>('');
  const [singleDocType, setSingleDocType] = useState<DocumentType>('commercial_lease');
  const [singleJurisdiction, setSingleJurisdiction] = useState<string>('State of New York, USA');
  const [singleRawText, setSingleRawText] = useState<string>('');

  // Batch files state
  const [batchItems, setBatchItems] = useState<BatchUploadFileItem[]>([]);
  const [batchGlobalJurisdiction, setBatchGlobalJurisdiction] = useState<string>('State of New York, USA');
  const [batchGlobalDocType, setBatchGlobalDocType] = useState<DocumentType>('commercial_lease');
  const [autoComparePair, setAutoComparePair] = useState<boolean>(true);
  const [compareDocAId, setCompareDocAId] = useState<string>('');
  const [compareDocBId, setCompareDocBId] = useState<string>('');

  // Execution states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [overallStep, setOverallStep] = useState<string>('');
  const [batchOverallProgress, setBatchOverallProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchCompletedDocs, setBatchCompletedDocs] = useState<StoredDocument[]>([]);

  // File input refs
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes: { id: DocumentType; label: string; desc: string }[] = [
    { id: 'commercial_lease', label: 'Commercial Lease', desc: 'Rent, CAM escalation, restoration, holdover liabilities' },
    { id: 'saas_msa', label: 'SaaS / Master Services (MSA)', desc: 'Service levels, IP rights, warranties, indemnities' },
    { id: 'employment_agreement', label: 'Employment Agreement', desc: 'Compensation, IP assignment, non-compete, severance' },
    { id: 'non_disclosure_agreement', label: 'NDA / Confidentiality', desc: 'Protected data scope, exclusions, survival terms' },
    { id: 'vendor_contract', label: 'Vendor / Supply Contract', desc: 'Deliverables, milestones, payment triggers, audit rights' },
    { id: 'independent_contractor', label: 'Contractor Agreement', desc: 'Work-for-hire, independent status, liability limits' },
    { id: 'other', label: 'Custom / Other Agreement', desc: 'General commercial contract analysis' },
  ];

  const jurisdictions = [
    'State of New York, USA',
    'State of Delaware, USA',
    'State of California, USA',
    'State of Texas, USA',
    'US Federal Jurisdiction',
    'United Kingdom (England & Wales)',
    'European Union / GDPR Compliant',
    'Canada (Ontario)',
    'Australia (New South Wales)',
    'General / Not Specified'
  ];

  // Helper to infer document type from file name
  const inferDocTypeFromName = (name: string): DocumentType => {
    const lower = name.toLowerCase();
    if (lower.includes('lease') || lower.includes('amendment') || lower.includes('rent') || lower.includes('sublease') || lower.includes('premises')) {
      return 'commercial_lease';
    }
    if (lower.includes('saas') || lower.includes('msa') || lower.includes('service') || lower.includes('sla')) {
      return 'saas_msa';
    }
    if (lower.includes('employ') || lower.includes('offer') || lower.includes('compensation') || lower.includes('severance')) {
      return 'employment_agreement';
    }
    if (lower.includes('nda') || lower.includes('confidential') || lower.includes('secrecy') || lower.includes('proprietary')) {
      return 'non_disclosure_agreement';
    }
    if (lower.includes('vendor') || lower.includes('supply') || lower.includes('procurement')) {
      return 'vendor_contract';
    }
    if (lower.includes('contractor') || lower.includes('consulting') || lower.includes('freelance') || lower.includes('sow')) {
      return 'independent_contractor';
    }
    return batchGlobalDocType || 'other';
  };

  // Process a file into base64 or text
  const readFileData = (file: File): Promise<{ pdfBase64?: string; rawText?: string }> => {
    return new Promise((resolve) => {
      const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({ pdfBase64: e.target?.result as string });
        };
        reader.onerror = () => resolve({});
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({ rawText: (e.target?.result as string) || '' });
        };
        reader.onerror = () => resolve({});
        reader.readAsText(file);
      }
    });
  };

  // Validate file
  const isValidFile = (file: File): boolean => {
    if (file.size === 0) return false;
    const validExtensions = ['.pdf', '.txt', '.md', '.doc', '.docx', '.json'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext)) || file.type.includes('pdf') || file.type.includes('text');
  };

  // Add multiple files to batch
  const handleBatchFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    const newItems: BatchUploadFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!isValidFile(file)) {
        continue;
      }

      const id = 'batch-item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const docType = inferDocTypeFromName(file.name);

      newItems.push({
        id,
        file,
        title: cleanTitle,
        documentType: docType,
        jurisdiction: batchGlobalJurisdiction,
        status: 'pending'
      });
    }

    if (newItems.length === 0) {
      setErrorMessage('No valid documents found. Supported formats: PDF, Word, TXT, Markdown (non-empty files).');
      return;
    }

    setBatchItems(prev => {
      const combined = [...prev, ...newItems];
      if (combined.length >= 2 && !compareDocAId) {
        setCompareDocAId(combined[0].id);
        setCompareDocBId(combined[1].id);
      }
      return combined;
    });

    // Read files in background
    for (const item of newItems) {
      readFileData(item.file).then(({ pdfBase64, rawText }) => {
        setBatchItems(current => 
          current.map(it => it.id === item.id ? { ...it, pdfBase64, rawText } : it)
        );
      });
    }
  };

  // Remove batch item
  const removeBatchItem = (id: string) => {
    setBatchItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (compareDocAId === id) setCompareDocAId(updated[0]?.id || '');
      if (compareDocBId === id) setCompareDocBId(updated[1]?.id || '');
      return updated;
    });
  };

  // Update batch item parameter
  const updateBatchItem = (id: string, updates: Partial<BatchUploadFileItem>) => {
    setBatchItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  // Apply global jurisdiction to all pending batch items
  const handleApplyGlobalJurisdiction = (jur: string) => {
    setBatchGlobalJurisdiction(jur);
    setBatchItems(prev => prev.map(it => it.status === 'pending' ? { ...it, jurisdiction: jur } : it));
  };

  // Apply global doc type to all pending batch items
  const handleApplyGlobalDocType = (dt: DocumentType) => {
    setBatchGlobalDocType(dt);
    setBatchItems(prev => prev.map(it => it.status === 'pending' ? { ...it, documentType: dt } : it));
  };

  // Load standard Sample Batch (Commercial Lease + Proposed Amendment)
  const handleLoadSampleBatch = () => {
    setErrorMessage(null);
    const item1: BatchUploadFileItem = {
      id: 'sample-lease-batch',
      file: new File(['Base Commercial Lease Content'], SAMPLE_COMMERCIAL_LEASE.fileName, { type: 'application/pdf' }),
      title: SAMPLE_COMMERCIAL_LEASE.title,
      documentType: SAMPLE_COMMERCIAL_LEASE.documentType,
      jurisdiction: SAMPLE_COMMERCIAL_LEASE.jurisdiction,
      rawText: SAMPLE_COMMERCIAL_LEASE.pages?.map(p => p.content).join('\n\n') || '',
      status: 'pending'
    };

    const item2: BatchUploadFileItem = {
      id: 'sample-amendment-batch',
      file: new File(['Proposed Amendment Content'], SAMPLE_PROPOSED_AMENDMENT.fileName, { type: 'application/pdf' }),
      title: SAMPLE_PROPOSED_AMENDMENT.title,
      documentType: SAMPLE_PROPOSED_AMENDMENT.documentType,
      jurisdiction: SAMPLE_PROPOSED_AMENDMENT.jurisdiction,
      rawText: SAMPLE_PROPOSED_AMENDMENT.pages?.map(p => p.content).join('\n\n') || '',
      status: 'pending'
    };

    setBatchItems([item1, item2]);
    setCompareDocAId(item1.id);
    setCompareDocBId(item2.id);
  };

  // Analyze single document through Gemini API
  const analyzeDocumentItem = async (
    title: string,
    file: File,
    docType: DocumentType,
    jurisdiction: string,
    rawText?: string,
    pdfBase64?: string,
    onStatusUpdate?: (msg: string) => void
  ): Promise<StoredDocument> => {
    onStatusUpdate?.('Processing document pages & binary contents...');

    // If PDF base64 isn't ready yet, read it on the fly
    let finalPdfBase64 = pdfBase64;
    let finalRawText = rawText;
    if (!finalPdfBase64 && !finalRawText) {
      const readResult = await readFileData(file);
      finalPdfBase64 = readResult.pdfBase64;
      finalRawText = readResult.rawText;
    }

    const simulatedPages = finalRawText
      ? [
          { pageNumber: 1, content: finalRawText.slice(0, 3000) },
          ...(finalRawText.length > 3000 ? [{ pageNumber: 2, content: finalRawText.slice(3000, 6000) }] : []),
          ...(finalRawText.length > 6000 ? [{ pageNumber: 3, content: finalRawText.slice(6000, 9000) }] : [])
        ]
      : [];

    onStatusUpdate?.('Running Gemini contract indexing & risk analysis...');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentTitle: title || file.name,
        documentType: docType,
        jurisdiction,
        rawText: finalRawText || '',
        pages: simulatedPages.length > 0 ? simulatedPages : undefined,
        pdfBase64: finalPdfBase64 || undefined,
        fileName: file.name
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Document indexing failed.');
    }

    onStatusUpdate?.('Parsing clauses, obligations, and citations...');
    const data = await response.json();

    const finalPages = data.pages && data.pages.length > 0
      ? data.pages
      : (simulatedPages.length > 0 ? simulatedPages : [{ pageNumber: 1, content: 'Document verified and indexed.' }]);

    const newDoc: StoredDocument = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      title: title || file.name,
      fileName: file.name,
      fileSize: file.size || 350000,
      uploadedAt: new Date().toISOString(),
      documentType: docType,
      jurisdiction,
      pageCount: finalPages.length,
      pdfDataUrl: finalPdfBase64 || undefined,
      rawText: finalRawText || finalPages.map((p: any) => p.content).join('\n\n'),
      pages: finalPages,
      analysis: data.analysis
    };

    onStatusUpdate?.('Persisting structured analysis to Firestore...');
    try {
      await saveDocumentToFirestore(newDoc);
    } catch (firestoreError) {
      console.warn('Firestore persistence warning (non-fatal):', firestoreError);
    }

    return newDoc;
  };

  // Execute Batch Analysis across all queued files
  const handleStartBatchAnalysis = async () => {
    if (batchItems.length === 0) {
      setErrorMessage('Please add at least one document to the batch queue.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setBatchOverallProgress({ current: 0, total: batchItems.length });
    const completedDocs: StoredDocument[] = [];
    const itemToDocMap = new Map<string, StoredDocument>();

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        
        // Skip already completed items
        if (item.status === 'completed' && item.resultDoc) {
          completedDocs.push(item.resultDoc);
          itemToDocMap.set(item.id, item.resultDoc);
          setBatchOverallProgress({ current: i + 1, total: batchItems.length });
          continue;
        }

        // Set status to indexing
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'indexing', progressMessage: 'Preparing document...' } : it));
        setOverallStep(`Indexing Document ${i + 1} of ${batchItems.length}: "${item.title}"`);

        try {
          const resultDoc = await analyzeDocumentItem(
            item.title,
            item.file,
            item.documentType,
            item.jurisdiction,
            item.rawText,
            item.pdfBase64,
            (statusMsg) => {
              setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, progressMessage: statusMsg } : it));
            }
          );

          completedDocs.push(resultDoc);
          itemToDocMap.set(item.id, resultDoc);

          setBatchItems(prev => prev.map(it => it.id === item.id ? {
            ...it,
            status: 'completed',
            progressMessage: 'Indexed & Analyzed successfully',
            resultDoc
          } : it));

        } catch (itemErr: any) {
          console.error(`Error analyzing ${item.title}:`, itemErr);
          setBatchItems(prev => prev.map(it => it.id === item.id ? {
            ...it,
            status: 'error',
            errorMessage: itemErr.message || 'Analysis error'
          } : it));
        }

        setBatchOverallProgress({ current: i + 1, total: batchItems.length });
      }

      setBatchCompletedDocs(completedDocs);
      setOverallStep('Batch indexing complete!');

      if (completedDocs.length > 0) {
        const docA = itemToDocMap.get(compareDocAId) || completedDocs[0];
        const docB = itemToDocMap.get(compareDocBId) || (completedDocs.length > 1 ? completedDocs[1] : undefined);

        if (onBatchAnalysisComplete) {
          onBatchAnalysisComplete(
            completedDocs,
            autoComparePair && Boolean(docB),
            docA?.id,
            docB?.id
          );
        } else {
          onAnalysisComplete(completedDocs[0]);
        }
      }
    } catch (overallErr: any) {
      setErrorMessage(overallErr.message || 'An error occurred during batch processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Single File Analysis
  const handleAnalyzeSingle = async () => {
    if (!singleFile && !singleRawText) {
      setErrorMessage('Please upload a document or select a sample agreement first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setOverallStep('Analyzing document...');
      const dummyFile = singleFile || new File(['Sample text'], 'sample.txt', { type: 'text/plain' });
      const newDoc = await analyzeDocumentItem(
        singleDocTitle || singleFile?.name || 'Analyzed Agreement',
        dummyFile,
        singleDocType,
        singleJurisdiction,
        singleRawText,
        singlePdfBase64 || undefined,
        (msg) => setOverallStep(msg)
      );

      setOverallStep('Completed!');
      await new Promise(r => setTimeout(r, 300));
      onAnalysisComplete(newDoc);
    } catch (err: any) {
      console.error('Single analysis error:', err);
      setErrorMessage(err.message || 'An error occurred while analyzing the document.');
    } finally {
      setIsProcessing(false);
      setOverallStep('');
    }
  };

  // Load single sample
  const loadSingleSample = (sample: StoredDocument) => {
    setSingleFile(new File(['Sample Content'], sample.fileName, { type: 'application/pdf' }));
    setSingleDocTitle(sample.title);
    setSingleDocType(sample.documentType);
    setSingleJurisdiction(sample.jurisdiction);
    setSingleRawText(sample.pages?.map(p => p.content).join('\n\n') || '');
    setErrorMessage(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Top Header & Mode Switcher */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 font-serif-legal">Document Intake & Indexing</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Batch & Multi-Doc Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload single agreements or batch-upload multiple files simultaneously to index clauses and immediately compare versions.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
          <button
            id="batch-upload-mode-tab"
            type="button"
            onClick={() => setUploadMode('batch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              uploadMode === 'batch'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch Upload & Compare</span>
          </button>
          <button
            id="single-upload-mode-tab"
            type="button"
            onClick={() => setUploadMode('single')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              uploadMode === 'single'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Single Document</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Intake Notice</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH UPLOAD MODE */}
      {/* ========================================================================= */}
      {uploadMode === 'batch' && (
        <div className="space-y-6">
          
          {/* Dropzone & Quick Presets */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Step 1: Select or Drop Multiple Legal Contracts
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Index multiple drafts, amendments, or redlines at once (PDF, Word DOCX, Markdown, Plain Text).
                </p>
              </div>

              {/* Sample Batch Preset */}
              <button
                id="load-sample-batch-btn"
                type="button"
                onClick={handleLoadSampleBatch}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Load Sample Batch (Lease + Amendment)</span>
              </button>
            </div>

            {/* Drag & Drop Multi-file Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleBatchFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => batchFileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer bg-indigo-50/20 hover:bg-indigo-50/40 transition-all"
            >
              <input
                ref={batchFileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.doc,.docx,.json"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleBatchFiles(e.target.files);
                  }
                }}
                className="hidden"
              />

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Choose multiple files or drop them here
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Select 2 or more files to analyze and compare across versions
                  </span>
                </div>
                <span className="inline-block text-[11px] font-mono text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-md">
                  Supports .pdf, .docx, .txt, .md (Up to 15MB each)
                </span>
              </div>
            </div>
          </div>

          {/* Batch Items Queue & Metadata Settings */}
          {batchItems.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {batchItems.length}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 font-serif-legal">
                    Documents in Intake Queue
                  </h3>
                </div>

                {/* Global Jurisdiction & Type Presets */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 text-[11px]">Set all:</span>
                    <select
                      value={batchGlobalJurisdiction}
                      onChange={(e) => handleApplyGlobalJurisdiction(e.target.value)}
                      className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer"
                    >
                      {jurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={batchGlobalDocType}
                      onChange={(e) => handleApplyGlobalDocType(e.target.value as DocumentType)}
                      className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer"
                    >
                      {documentTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBatchItems([])}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 transition-colors"
                  >
                    Clear queue
                  </button>
                </div>
              </div>

              {/* Individual Item Cards */}
              <div className="space-y-3">
                {batchItems.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className={`rounded-xl border p-4 transition-all ${
                      item.status === 'completed'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : item.status === 'indexing'
                        ? 'border-indigo-300 bg-indigo-50/20 shadow-xs'
                        : item.status === 'error'
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      
                      {/* File details & Title input */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                          item.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'indexing'
                            ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : item.status === 'indexing' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">Doc {idx + 1}</span>
                            <span className="text-xs text-slate-500 font-mono">
                              ({formatFileSize(item.file.size)})
                            </span>
                            {item.status === 'completed' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Indexed
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={item.title}
                            disabled={isProcessing || item.status === 'completed'}
                            onChange={(e) => updateBatchItem(item.id, { title: e.target.value })}
                            placeholder="Document title"
                            className="w-full font-semibold text-xs text-slate-900 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />

                          {/* Status/Error message */}
                          {item.progressMessage && (
                            <p className="text-[11px] text-indigo-600 font-mono mt-0.5 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{item.progressMessage}</span>
                            </p>
                          )}
                          {item.errorMessage && (
                            <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                              {item.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dropdowns for DocType and Jurisdiction */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                        <select
                          value={item.documentType}
                          disabled={isProcessing || item.status === 'completed'}
                          onChange={(e) => updateBatchItem(item.id, { documentType: e.target.value as DocumentType })}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                        >
                          {documentTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>

                        <select
                          value={item.jurisdiction}
                          disabled={isProcessing || item.status === 'completed'}
                          onChange={(e) => updateBatchItem(item.id, { jurisdiction: e.target.value })}
                          className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none max-w-[180px] truncate"
                        >
                          {jurisdictions.map(j => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => removeBatchItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors"
                          title="Remove document from queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              {/* Add more button */}
              <button
                type="button"
                onClick={() => batchFileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-2.5 border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add More Documents to Queue</span>
              </button>

              {/* Comparative Alignment Setup (When 2 or more documents exist) */}
              {batchItems.length >= 2 && (
                <div className="bg-purple-50/60 rounded-xl border border-purple-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-purple-700" />
                      <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                        Comparative Alignment Pair
                      </span>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-purple-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoComparePair}
                        onChange={(e) => setAutoComparePair(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-medium">Directly compare these two documents after batch indexing</span>
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold text-purple-900">Document A (Base Agreement):</span>
                      <select
                        value={compareDocAId}
                        onChange={(e) => setCompareDocAId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        {batchItems.map((it, i) => (
                          <option key={it.id} value={it.id}>
                            Doc {i + 1}: {it.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-purple-900">Document B (Comparison / Redline):</span>
                      <select
                        value={compareDocBId}
                        onChange={(e) => setCompareDocBId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        {batchItems.map((it, i) => (
                          <option key={it.id} value={it.id}>
                            Doc {i + 1}: {it.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Action Bar & Batch Execution */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-serif-legal text-white flex items-center gap-2">
                  <span>Batch Intake & Cross-Document Engine</span>
                  {batchItems.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-indigo-300 font-mono">
                      {batchItems.length} {batchItems.length === 1 ? 'file' : 'files'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300">
                  Runs full 16-dimension legal extraction and indexes documents for simultaneous comparison and search.
                </p>
              </div>

              <button
                id="start-batch-analysis-btn"
                type="button"
                onClick={handleStartBatchAnalysis}
                disabled={isProcessing || batchItems.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold text-xs tracking-wide shadow-sm transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Processing Batch ({batchOverallProgress.current}/{batchOverallProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                    <span>
                      {autoComparePair && batchItems.length >= 2
                        ? `Index ${batchItems.length} Documents & Compare`
                        : `Index ${batchItems.length} Documents`}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Live Progress Bar when analyzing */}
            {isProcessing && (
              <div className="pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-mono-legal">
                  <span>{overallStep}</span>
                  <span className="text-slate-400">
                    {Math.round((batchOverallProgress.current / Math.max(batchOverallProgress.total, 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.max(5, (batchOverallProgress.current / Math.max(batchOverallProgress.total, 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE DOCUMENT MODE */}
      {/* ========================================================================= */}
      {uploadMode === 'single' && (
        <div className="space-y-6">
          
          {/* Step 1: Upload File */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 1: Document Upload</span>
              
              {/* Sample Loader shortcut */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Or load ready sample:</span>
                <button
                  id="load-sample-lease-btn"
                  type="button"
                  onClick={() => loadSingleSample(SAMPLE_COMMERCIAL_LEASE)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline decoration-indigo-200 hover:decoration-indigo-600 transition-colors"
                >
                  Commercial Lease
                </button>
                <span className="text-slate-300">|</span>
                <button
                  id="load-sample-amendment-btn"
                  type="button"
                  onClick={() => loadSingleSample(SAMPLE_PROPOSED_AMENDMENT)}
                  className="text-xs text-purple-600 hover:text-purple-800 font-semibold underline decoration-purple-200 hover:decoration-purple-600 transition-colors"
                >
                  Lease Amendment
                </button>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped && isValidFile(dropped)) {
                  setSingleFile(dropped);
                  setSingleDocTitle(dropped.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                  readFileData(dropped).then(({ pdfBase64, rawText }) => {
                    setSinglePdfBase64(pdfBase64 || null);
                    setSingleRawText(rawText || '');
                  });
                }
              }}
              onClick={() => singleFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                singleFile
                  ? 'border-indigo-400 bg-indigo-50/20'
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <input
                ref={singleFileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={(e) => {
                  const sel = e.target.files?.[0];
                  if (sel && isValidFile(sel)) {
                    setSingleFile(sel);
                    setSingleDocTitle(sel.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                    readFileData(sel).then(({ pdfBase64, rawText }) => {
                      setSinglePdfBase64(pdfBase64 || null);
                      setSingleRawText(rawText || '');
                    });
                  }
                }}
                className="hidden"
              />

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
                  {singleFile ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6" />}
                </div>

                {singleFile ? (
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{singleFile.name}</span>
                    <span className="text-xs text-slate-500 font-mono-legal mt-0.5 block">
                      {formatFileSize(singleFile.size)} • Ready for analysis
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSingleFile(null);
                        setSingleRawText('');
                        setSinglePdfBase64(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 underline mt-2 inline-block font-medium"
                    >
                      Choose a different file
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      Click to select or drag & drop your legal document
                    </span>
                    <span className="text-xs text-slate-400 block mt-1">
                      Supported formats: PDF, Microsoft Word, Markdown, Plain Text (Max 15MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Metadata & Classification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 2: Document Context & Parameters
            </span>

            <div className="grid sm:grid-cols-2 gap-4">
              
              {/* Document Title */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Document Title</label>
                <input
                  id="doc-title-input"
                  type="text"
                  value={singleDocTitle}
                  onChange={(e) => setSingleDocTitle(e.target.value)}
                  placeholder="e.g. Master Services Agreement - Acme Corp"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Document Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Document Type
                </label>
                <select
                  id="doc-type-select"
                  value={singleDocType}
                  onChange={(e) => setSingleDocType(e.target.value as DocumentType)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {documentTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jurisdiction Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Primary Jurisdiction
                </label>
                <select
                  id="jurisdiction-select"
                  value={singleJurisdiction}
                  onChange={(e) => setSingleJurisdiction(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {jurisdictions.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Submit Action & Loading Progress */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-serif-legal text-white">Execute Document Analysis</h3>
                <p className="text-xs text-slate-300">
                  Extracts executive summary, key clauses, attention areas, obligations, and page-specific citations.
                </p>
              </div>

              <button
                id="start-single-analysis-btn"
                type="button"
                onClick={handleAnalyzeSingle}
                disabled={isProcessing || (!singleFile && !singleRawText)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold text-xs tracking-wide shadow-sm transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Analyzing Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                    <span>Start LexLens Analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Progress Bar when analyzing */}
            {isProcessing && (
              <div className="pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-indigo-300 font-mono-legal">
                  <span>{overallStep}</span>
                  <span className="text-slate-400">Processing</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
