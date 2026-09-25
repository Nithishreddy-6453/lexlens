/**
 * LexLens Core TypeScript Interfaces & Types
 * Strictly typed schema for legal document intelligence
 */

export interface Citation {
  page: number;
  section: string;
  exactQuote?: string;
  charStart?: number;
  charEnd?: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Clause {
  id: string;
  title: string;
  category: 
    | 'Termination' 
    | 'Liability' 
    | 'Payment' 
    | 'Confidentiality' 
    | 'IP' 
    | 'Indemnification' 
    | 'Dispute' 
    | 'General' 
    | 'Warranties' 
    | 'Governing Law'
    | 'Renewal'
    | 'Penalties'
    | 'Privacy & Data'
    | 'Restrictions & Non-Compete';
  rawText: string;
  plainSummary: string;
  citation: Citation;
  keyTerms: string[];
  attentionScore?: RiskLevel; // Responsible framing: risk/attention flag, not enforceable validity
  isFlagged?: boolean;
}

export interface AttentionArea {
  id: string;
  clauseId?: string;
  title: string;
  severity: RiskLevel;
  explanation: string;
  citation: Citation;
  recommendedAction: string;
  perspective: 'unfavorable' | 'ambiguous' | 'unusual_market_term' | 'one_sided' | 'standard';
}

export interface Obligation {
  id: string;
  obligor: string; // The party responsible
  beneficiary?: string; // The party owed
  description: string;
  recurrence?: 'one-time' | 'recurring' | 'conditional' | 'upon-breach';
  deadline?: string;
  citation: Citation;
  isCompleted?: boolean;
  priority: 'critical' | 'normal' | 'monitoring';
}

export interface ImportantDate {
  id: string;
  title: string;
  dateStr: string; // ISO date or descriptive string like "30 days after Effective Date"
  type: 'effective_date' | 'expiration' | 'notice_deadline' | 'payment_due' | 'renewal_window' | 'audit_timeline';
  citation: Citation;
  significance: string;
}

export interface PartyRole {
  id: string;
  name: string;
  role: string; // e.g. "Landlord", "Tenant", "Client", "Service Provider", "Disclosing Party"
  entityType?: 'corporation' | 'llc' | 'individual' | 'other';
  jurisdictionNoticeAddress?: string;
  citation?: Citation;
}

export interface Inconsistency {
  id: string;
  title: string;
  description: string;
  conflictingCitations: Citation[];
  suggestedResolutionPrompt: string;
}

export interface DocumentAnalysis {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  jurisdiction: string;
  analyzedAt: string;
  pageCount: number;
  executiveSummary: string;
  purpose?: string;
  monetaryTerms?: string;
  disputeResolutionSummary?: string;
  penaltiesSummary?: string;
  privacyDataSummary?: string;
  restrictionsSummary?: string;
  parties: PartyRole[];
  clauses: Clause[];
  attentionAreas: AttentionArea[];
  obligations: Obligation[];
  importantDates: ImportantDate[];
  inconsistencies: Inconsistency[];
  governingLaw?: {
    jurisdiction: string;
    forum: string;
    citation: Citation;
  };
}

export type DocumentType =
  | 'commercial_lease'
  | 'saas_msa'
  | 'employment_agreement'
  | 'non_disclosure_agreement'
  | 'vendor_contract'
  | 'independent_contractor'
  | 'other';

export type ClauseChangeType = 'modified' | 'added' | 'removed' | 'unchanged';

export type DetectedChangeCategory =
  | 'monetary_amount'
  | 'deadline'
  | 'notice_period'
  | 'termination_rights'
  | 'renewal_terms'
  | 'liability_indemnity'
  | 'dispute_resolution'
  | 'confidentiality_ip'
  | 'general_terms';

export interface ComparisonClauseItem {
  id: string;
  changeType: ClauseChangeType;
  category: DetectedChangeCategory | string;
  categoryLabel: string;
  clauseTitle: string;
  
  // Document A location and summary
  docASummary?: string;
  docATextExcerpt?: string;
  docACitation?: {
    page: number;
    section: string;
    exactExcerpt?: string;
    exactQuote?: string;
  };

  // Document B location and summary
  docBSummary?: string;
  docBTextExcerpt?: string;
  docBCitation?: {
    page: number;
    section: string;
    exactExcerpt?: string;
    exactQuote?: string;
  };

  // Plain English & practical explanations (strictly neutral, no legal conclusion)
  plainEnglishExplanation: string;
  practicalDifference: string;

  // Match confidence flag
  matchConfidence: 'high' | 'needs_review';
  needsReviewReason?: string;
}

export interface ComparisonClauseAlignment {
  category: string;
  clauseTitle: string;
  doc1Summary: string;
  doc1Citation?: Citation;
  doc2Summary: string;
  doc2Citation?: Citation;
  semanticDifference: string;
  impactLevel?: 'favorable_to_doc1' | 'favorable_to_doc2' | 'neutral' | 'material_risk';
  explanation: string;
}

export interface ComparisonResult {
  id: string;
  doc1Id: string;
  doc1Title: string;
  doc2Id: string;
  doc2Title: string;
  comparedAt: string;
  executiveComparison: string;
  materialShiftsSummary: string[];
  alignments?: ComparisonClauseAlignment[];
  overallRiskShift?: string;
  // Enhanced Comparison Dashboard Data
  factualSummary?: string;
  stats?: {
    totalClauses: number;
    modifiedCount: number;
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
    needsReviewCount: number;
  };
  items?: ComparisonClauseItem[];
}

export type LegalSourceType = 
  | 'government' 
  | 'legislation_database' 
  | 'court' 
  | 'regulator' 
  | 'official_publication' 
  | 'legal_resource';

export interface LegalSourceItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  sourceType: LegalSourceType;
  isAuthoritative: boolean;
  snippet?: string;
}

export interface LegalContextCheckResult {
  id: string;
  jurisdiction: string;
  queryType: 'clause' | 'question';
  clauseTitle?: string;
  clauseExcerpt?: string;
  question?: string;
  documentTitle?: string;
  dateChecked: string;
  timestamp: string;
  label: "External legal information";
  summary: string;
  statutoryLandscape: string;
  judicialStandards: string;
  uncertaintyOrDisagreement?: string;
  hasUncertainty: boolean;
  authoritativeCitations: string[];
  questionsForCounsel: string[];
  sources: LegalSourceItem[];
  searchQueriesUsed: string[];
  groundingConfidence?: 'grounded_live_search' | 'authoritative_database';
  prominentDisclaimers: {
    enforceabilityWarning: string;
    contextDependenceNote: string;
    generalNotice: string;
  };
}

export interface ExternalLegalInfo {
  marketStandard?: string;
  statutoryPrinciples?: string;
  attorneyClarifications?: string[];
  disclaimer: string;
  dateChecked?: string;
  label?: string;
  sources?: LegalSourceItem[];
  hasUncertainty?: boolean;
  uncertaintyOrDisagreement?: string;
  enforceabilityWarning?: string;
}

export interface ExplicitDocumentLanguageItem {
  quote: string;
  page?: number;
  section?: string;
}

export interface ChatMessage {
  id: string;
  documentId?: string;
  documentName?: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  mode?: 'document_only' | 'legal_context';
  isUnsupported?: boolean;
  explicitLanguage?: ExplicitDocumentLanguageItem[];
  inference?: string;
  citations?: Citation[];
  externalLegalContext?: ExternalLegalInfo;
  isCheckingExternalContext?: boolean;
  isLoading?: boolean;
}

export interface LawyerQuestion {
  id: string;
  category: 'Financial & Fees' | 'Liability & Risk' | 'Termination & Transition' | 'Operational & Compliance' | 'Intellectual Property';
  question: string;
  context: string;
  citation?: Citation;
  priority: 'essential' | 'recommended' | 'optional';
  isAnswered?: boolean;
  userNotes?: string;
}

export interface ImportantClauseToDiscuss {
  id: string;
  title: string;
  category: string;
  plainSummary: string;
  discussionReason: string;
  citation: Citation;
  sourceQuote?: string;
  riskSeverity?: 'high' | 'medium' | 'low';
}

export interface AmbiguousOrMissingItem {
  id: string;
  topic: string;
  description: string;
  citation?: Citation;
  potentialImpact: string;
  suggestedClarification: string;
  status?: 'open' | 'addressed';
}

export interface DocumentToGather {
  id: string;
  documentName: string;
  purpose: string;
  relatedClauseOrTopic: string;
  citation?: Citation;
  urgency: 'high' | 'medium' | 'standard';
  isGathered?: boolean;
}

export interface OnePageDocumentBrief {
  agreementTitle: string;
  documentType: string;
  jurisdictionAndVenue: string;
  governingLawCitation?: Citation;
  parties: Array<{ name: string; role: string; citation?: Citation }>;
  termAndDuration: { summary: string; citation?: Citation };
  financialCommitmentsSummary: { summary: string; citation?: Citation };
  criticalOperationalCaveats: Array<{ point: string; citation?: Citation }>;
  identifiedAmbiguitiesCount: number;
  recommendedMeetingFocus: string;
  disclaimer: string;
}

export interface LegalReviewPrepData {
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  jurisdiction: string;
  generatedAt: string;
  clausesToDiscuss: ImportantClauseToDiscuss[];
  missingOrAmbiguousInfo: AmbiguousOrMissingItem[];
  questionsForCounsel: LawyerQuestion[];
  importantDates: ImportantDate[];
  documentsToGather: DocumentToGather[];
  documentBrief: OnePageDocumentBrief;
}

export interface BatchUploadFileItem {
  id: string;
  file: File;
  title: string;
  documentType: DocumentType;
  jurisdiction: string;
  pdfBase64?: string;
  rawText?: string;
  status: 'pending' | 'indexing' | 'analyzing' | 'completed' | 'error';
  errorMessage?: string;
  progressMessage?: string;
  resultDoc?: StoredDocument;
}

export interface StoredDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  documentType: DocumentType;
  jurisdiction: string;
  pageCount: number;
  pdfDataUrl?: string;
  rawText?: string;
  pages?: { pageNumber: number; content: string }[];
  analysis?: DocumentAnalysis;
}
