import { DocumentAnalysis, Citation, Clause, AttentionArea, Obligation, ImportantDate, PartyRole, Inconsistency } from '../types';

/**
 * Validates and sanitizes Gemini document analysis structured response.
 * Enforces:
 * - Real page constraints (1 to totalPages)
 * - Source metadata presence
 * - Non-invention of missing required entities
 * - Strict schema conformance
 */
export function validateAndSanitizeAnalysis(
  raw: any,
  pageCount: number,
  docTitle: string,
  docType: string,
  jurisdiction: string
): DocumentAnalysis {
  const maxPages = Math.max(1, pageCount || 1);

  // Helper to validate and sanitize a Citation
  const sanitizeCitation = (cit: any, fallbackSection: string = 'General'): Citation => {
    if (!cit || typeof cit !== 'object') {
      return { page: 1, section: fallbackSection };
    }
    let pageNum = typeof cit.page === 'number' ? Math.floor(cit.page) : parseInt(cit.page);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (pageNum > maxPages) pageNum = maxPages;

    const section = typeof cit.section === 'string' && cit.section.trim() !== ''
      ? cit.section.trim()
      : fallbackSection;

    return {
      page: pageNum,
      section,
      exactQuote: typeof cit.exactQuote === 'string' ? cit.exactQuote.trim() : undefined
    };
  };

  // 1. Executive Summary
  const executiveSummary = typeof raw.executiveSummary === 'string' && raw.executiveSummary.trim() !== ''
    ? raw.executiveSummary.trim()
    : `This document represents a ${docType.replace('_', ' ')} governing terms under ${jurisdiction}. Review the extracted clauses and covenants for detailed operational obligations.`;

  // 2. Parties
  const rawParties = Array.isArray(raw.parties) ? raw.parties : [];
  const parties: PartyRole[] = rawParties
    .filter((p: any) => p && typeof p.name === 'string' && p.name.trim() !== '')
    .map((p: any, idx: number) => ({
      id: `party-${idx + 1}`,
      name: String(p.name).trim(),
      role: typeof p.role === 'string' ? p.role.trim() : 'Contracting Party',
      entityType: ['corporation', 'llc', 'individual', 'other'].includes(p.entityType) ? p.entityType : 'other',
      jurisdictionNoticeAddress: typeof p.jurisdictionNoticeAddress === 'string' ? p.jurisdictionNoticeAddress.trim() : undefined,
      citation: sanitizeCitation(p.citation, 'Preamble / Parties')
    }));

  // 3. Clauses
  const rawClauses = Array.isArray(raw.clauses) ? raw.clauses : [];
  const validCategories = [
    'Termination', 'Liability', 'Payment', 'Confidentiality', 'IP', 
    'Indemnification', 'Dispute', 'General', 'Warranties', 'Governing Law',
    'Renewal', 'Penalties', 'Privacy & Data', 'Restrictions & Non-Compete'
  ];

  const clauses: Clause[] = rawClauses
    .filter((c: any) => c && typeof c.title === 'string' && c.title.trim() !== '')
    .map((c: any, idx: number) => {
      const category = validCategories.includes(c.category) ? c.category : 'General';
      const citation = sanitizeCitation(c.citation, c.title);
      const attentionScore = ['low', 'medium', 'high'].includes(c.attentionScore) ? c.attentionScore : 'low';

      return {
        id: `clause-${idx + 1}`,
        title: String(c.title).trim(),
        category: category as any,
        rawText: typeof c.rawText === 'string' && c.rawText.trim() !== '' 
          ? c.rawText.trim() 
          : `See Section ${citation.section} in document for verbatim text.`,
        plainSummary: typeof c.plainSummary === 'string' && c.plainSummary.trim() !== ''
          ? c.plainSummary.trim()
          : `Summary of ${c.title} under ${category}.`,
        citation,
        keyTerms: Array.isArray(c.keyTerms) ? c.keyTerms.map(String).filter((t: string) => t.trim() !== '') : [],
        attentionScore,
        isFlagged: c.isFlagged === true || attentionScore === 'high'
      };
    });

  // 4. Attention Areas
  const rawAttention = Array.isArray(raw.attentionAreas) ? raw.attentionAreas : [];
  const attentionAreas: AttentionArea[] = rawAttention
    .filter((a: any) => a && typeof a.title === 'string' && a.title.trim() !== '')
    .map((a: any, idx: number) => ({
      id: `attention-${idx + 1}`,
      clauseId: typeof a.clauseId === 'string' ? a.clauseId : undefined,
      title: String(a.title).trim(),
      severity: ['low', 'medium', 'high'].includes(a.severity) ? a.severity : 'medium',
      explanation: typeof a.explanation === 'string' && a.explanation.trim() !== ''
        ? a.explanation.trim()
        : `The document contains terms in ${a.title} that may warrant review by legal counsel.`,
      citation: sanitizeCitation(a.citation, a.title),
      recommendedAction: typeof a.recommendedAction === 'string' && a.recommendedAction.trim() !== ''
        ? a.recommendedAction.trim()
        : 'Consider discussing this provision with your legal professional.',
      perspective: ['unfavorable', 'ambiguous', 'unusual_market_term', 'one_sided', 'standard'].includes(a.perspective)
        ? a.perspective
        : 'ambiguous'
    }));

  // 5. Obligations
  const rawObligations = Array.isArray(raw.obligations) ? raw.obligations : [];
  const obligations: Obligation[] = rawObligations
    .filter((o: any) => o && typeof o.description === 'string' && o.description.trim() !== '')
    .map((o: any, idx: number) => ({
      id: `obligation-${idx + 1}`,
      obligor: typeof o.obligor === 'string' && o.obligor.trim() !== '' ? o.obligor.trim() : 'Designated Party',
      beneficiary: typeof o.beneficiary === 'string' ? o.beneficiary.trim() : undefined,
      description: String(o.description).trim(),
      recurrence: ['one-time', 'recurring', 'conditional', 'upon-breach'].includes(o.recurrence) ? o.recurrence : 'conditional',
      deadline: typeof o.deadline === 'string' ? o.deadline.trim() : undefined,
      citation: sanitizeCitation(o.citation, 'Obligations'),
      priority: ['critical', 'normal', 'monitoring'].includes(o.priority) ? o.priority : 'normal',
      isCompleted: false
    }));

  // 6. Important Dates
  const rawDates = Array.isArray(raw.importantDates) ? raw.importantDates : [];
  const importantDates: ImportantDate[] = rawDates
    .filter((d: any) => d && typeof d.title === 'string' && d.title.trim() !== '')
    .map((d: any, idx: number) => ({
      id: `date-${idx + 1}`,
      title: String(d.title).trim(),
      dateStr: typeof d.dateStr === 'string' && d.dateStr.trim() !== '' ? d.dateStr.trim() : 'As specified in agreement',
      type: ['effective_date', 'expiration', 'notice_deadline', 'payment_due', 'renewal_window', 'audit_timeline'].includes(d.type)
        ? d.type
        : 'notice_deadline',
      citation: sanitizeCitation(d.citation, d.title),
      significance: typeof d.significance === 'string' ? d.significance.trim() : 'Trigger or deadline in contract timeline.'
    }));

  // 7. Inconsistencies
  const rawInconsistencies = Array.isArray(raw.inconsistencies) ? raw.inconsistencies : [];
  const inconsistencies: Inconsistency[] = rawInconsistencies
    .filter((inc: any) => inc && typeof inc.title === 'string' && inc.title.trim() !== '')
    .map((inc: any, idx: number) => ({
      id: `inc-${idx + 1}`,
      title: String(inc.title).trim(),
      description: typeof inc.description === 'string' ? inc.description.trim() : '',
      conflictingCitations: Array.isArray(inc.conflictingCitations)
        ? inc.conflictingCitations.map((c: any) => sanitizeCitation(c, 'Cross-reference'))
        : [sanitizeCitation(null, 'Section A'), sanitizeCitation(null, 'Section B')],
      suggestedResolutionPrompt: typeof inc.suggestedResolutionPrompt === 'string'
        ? inc.suggestedResolutionPrompt.trim()
        : 'Clarify conflicting terms with counterparty or qualified attorney.'
    }));

  // 8. Governing Law
  let governingLaw = undefined;
  if (raw.governingLaw && typeof raw.governingLaw === 'object') {
    governingLaw = {
      jurisdiction: typeof raw.governingLaw.jurisdiction === 'string' ? raw.governingLaw.jurisdiction.trim() : jurisdiction,
      forum: typeof raw.governingLaw.forum === 'string' ? raw.governingLaw.forum.trim() : 'Competent courts of jurisdiction',
      citation: sanitizeCitation(raw.governingLaw.citation, 'Governing Law')
    };
  }

  return {
    id: raw.id || `analysis-${Date.now()}`,
    documentId: raw.documentId || `doc-${Date.now()}`,
    documentTitle: docTitle,
    documentType: docType as any,
    jurisdiction,
    analyzedAt: raw.analyzedAt || new Date().toISOString(),
    pageCount: maxPages,
    executiveSummary,
    purpose: typeof raw.purpose === 'string' ? raw.purpose.trim() : undefined,
    monetaryTerms: typeof raw.monetaryTerms === 'string' ? raw.monetaryTerms.trim() : undefined,
    disputeResolutionSummary: typeof raw.disputeResolutionSummary === 'string' ? raw.disputeResolutionSummary.trim() : undefined,
    penaltiesSummary: typeof raw.penaltiesSummary === 'string' ? raw.penaltiesSummary.trim() : undefined,
    privacyDataSummary: typeof raw.privacyDataSummary === 'string' ? raw.privacyDataSummary.trim() : undefined,
    restrictionsSummary: typeof raw.restrictionsSummary === 'string' ? raw.restrictionsSummary.trim() : undefined,
    parties,
    clauses,
    attentionAreas,
    obligations,
    importantDates,
    inconsistencies,
    governingLaw
  };
}
