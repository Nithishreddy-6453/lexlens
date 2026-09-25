/**
 * LexLens - Document-First AI Legal Information Assistant
 * Main Application Entry Point
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ResponsibleAIModal } from './components/ResponsibleAIModal';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { DocumentReviewView } from './components/DocumentReviewView';
import { CompareView } from './components/CompareView';
import { AskView } from './components/AskView';
import { QuestionsView } from './components/QuestionsView';
import { LegalContextCheckView } from './components/LegalContextCheckView';
import { StoredDocument } from './types';
import { SAMPLE_COMMERCIAL_LEASE, SAMPLE_PROPOSED_AMENDMENT } from './data/sampleDocuments';
import { getDocumentsFromFirestore, deleteDocumentFromFirestore } from './lib/firebase';
import { ShieldAlert, Scale, ExternalLink } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<StoredDocument[]>([
    SAMPLE_COMMERCIAL_LEASE,
    SAMPLE_PROPOSED_AMENDMENT
  ]);
  const [activeDoc, setActiveDoc] = useState<StoredDocument | null>(SAMPLE_COMMERCIAL_LEASE);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isResponsibleModalOpen, setIsResponsibleModalOpen] = useState<boolean>(false);

  // Sync documents with Firestore on boot
  useEffect(() => {
    async function loadFirestoreDocs() {
      try {
        const firestoreDocs = await getDocumentsFromFirestore();
        if (firestoreDocs && firestoreDocs.length > 0) {
          setDocuments((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const newDocs = firestoreDocs.filter((d) => !existingIds.has(d.id));
            const combined = [...newDocs, ...prev];
            // If user has persisted uploaded documents, make the latest one active
            if (newDocs.length > 0 && !activeDoc?.id.startsWith('doc-')) {
              setActiveDoc(newDocs[0]);
            }
            return combined;
          });
        }
      } catch (err) {
        console.warn('Firestore initial sync notice:', err);
      }
    }
    loadFirestoreDocs();
  }, []);

  const [targetReviewCitation, setTargetReviewCitation] = useState<{ page: number; section?: string } | null>(null);
  const [compareDocSelection, setCompareDocSelection] = useState<{ doc1Id?: string; doc2Id?: string } | null>(null);
  const [contextCheckParams, setContextCheckParams] = useState<{
    jurisdiction?: string;
    clauseTitle?: string;
    clauseText?: string;
  } | null>(null);

  const handleOpenLegalContextCheck = (clauseTitle?: string, clauseText?: string, jurisdiction?: string) => {
    setContextCheckParams({
      clauseTitle,
      clauseText,
      jurisdiction: jurisdiction || activeDoc?.jurisdiction
    });
    setActiveTab('context_check');
  };

  const handleNavigateToReviewPage = (page: number, section?: string, doc?: StoredDocument) => {
    if (doc) {
      setActiveDoc(doc);
    }
    setTargetReviewCitation({ page, section });
    setActiveTab('review');
  };

  const handleSelectDoc = (doc: StoredDocument) => {
    setActiveDoc(doc);
  };

  const handleAnalysisComplete = (newDoc: StoredDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDoc(newDoc);
    setActiveTab('review');
  };

  const handleBatchAnalysisComplete = (newDocs: StoredDocument[], autoNavigateToCompare?: boolean, docAId?: string, docBId?: string) => {
    if (newDocs.length === 0) return;
    setDocuments((prev) => {
      const existingIds = new Set(prev.map(d => d.id));
      const fresh = newDocs.filter(d => !existingIds.has(d.id));
      return [...fresh, ...prev];
    });

    if (autoNavigateToCompare && docAId && docBId) {
      setCompareDocSelection({ doc1Id: docAId, doc2Id: docBId });
      setActiveTab('compare');
    } else {
      setActiveDoc(newDocs[0]);
      setActiveTab('review');
    }
  };

  const handleLoadSample = (sampleType: 'lease' | 'amendment') => {
    const target = sampleType === 'lease' ? SAMPLE_COMMERCIAL_LEASE : SAMPLE_PROPOSED_AMENDMENT;
    setActiveDoc(target);
    setActiveTab('review');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDoc={activeDoc}
        onOpenResponsibleModal={() => setIsResponsibleModalOpen(true)}
        onSelectSample={() => handleLoadSample('lease')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardView
            documents={documents}
            activeDoc={activeDoc}
            onSelectDoc={handleSelectDoc}
            onNavigate={setActiveTab}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTab === 'upload' && (
          <UploadView
            onAnalysisComplete={handleAnalysisComplete}
            onBatchAnalysisComplete={handleBatchAnalysisComplete}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'review' && activeDoc && (
          <DocumentReviewView
            document={activeDoc}
            onNavigateTab={setActiveTab}
            onOpenLegalContextCheck={handleOpenLegalContextCheck}
            targetPage={targetReviewCitation?.page}
            targetSection={targetReviewCitation?.section}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            documents={documents}
            onNavigateTab={setActiveTab}
            onSelectDoc={handleSelectDoc}
            onNavigateToReviewPage={handleNavigateToReviewPage}
            initialDoc1Id={compareDocSelection?.doc1Id}
            initialDoc2Id={compareDocSelection?.doc2Id}
            onAddDocument={(newDoc) => {
              setDocuments((prev) => [newDoc, ...prev]);
              setActiveDoc(newDoc);
            }}
          />
        )}

        {activeTab === 'ask' && activeDoc && (
          <AskView
            document={activeDoc}
            onNavigateToPage={handleNavigateToReviewPage}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'context_check' && (
          <LegalContextCheckView
            activeDoc={activeDoc}
            initialJurisdiction={contextCheckParams?.jurisdiction}
            initialClauseTitle={contextCheckParams?.clauseTitle}
            initialClauseText={contextCheckParams?.clauseText}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'questions' && activeDoc && (
          <QuestionsView
            document={activeDoc}
            onNavigateTab={setActiveTab}
            onNavigateToPage={handleNavigateToReviewPage}
          />
        )}
      </main>

      {/* Persistent Responsible AI Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-700 font-serif-legal">LexLens Legal Intelligence</span>
            <span className="text-slate-300">|</span>
            <span>Document-First Legal Assistant</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsResponsibleModalOpen(true)}
              className="text-amber-800 hover:text-amber-900 font-medium underline decoration-amber-300 hover:decoration-amber-600 transition-colors flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Responsible AI Disclosure (Not Legal Advice)</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Responsible AI Principles Modal */}
      <ResponsibleAIModal
        isOpen={isResponsibleModalOpen}
        onClose={() => setIsResponsibleModalOpen(false)}
      />

    </div>
  );
}
