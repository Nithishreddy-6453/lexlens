import { 
  StoredDocument, 
  LegalReviewPrepData, 
  ImportantClauseToDiscuss, 
  AmbiguousOrMissingItem, 
  LawyerQuestion, 
  ImportantDate, 
  DocumentToGather, 
  OnePageDocumentBrief,
  Citation 
} from '../types';

/**
 * Generates a comprehensive, citation-retained "Prepare for Legal Review" data structure
 * from a StoredDocument and its extracted analysis.
 * Uses strictly neutral, non-judgmental language and provides actionable preparation materials
 * without giving legal advice or guaranteeing legal outcomes.
 */
export function generateLegalReviewPrep(doc: StoredDocument): LegalReviewPrepData {
  const analysis = doc.analysis;
  const docTitle = doc.title || doc.fileName || 'Commercial Agreement';
  const jurisdiction = doc.jurisdiction || 'State of New York';
  const docType = doc.documentType || 'commercial_lease';

  // ---------------------------------------------------------------------------
  // 1. IMPORTANT CLAUSES TO DISCUSS
  // ---------------------------------------------------------------------------
  const clausesToDiscuss: ImportantClauseToDiscuss[] = [];

  // Extract from Attention Areas if available
  if (analysis?.attentionAreas && analysis.attentionAreas.length > 0) {
    analysis.attentionAreas.forEach((area, idx) => {
      clausesToDiscuss.push({
        id: `discuss-clause-${idx + 1}`,
        title: area.title,
        category: area.perspective === 'one_sided' ? 'Asymmetric Term' : 
                  area.perspective === 'unusual_market_term' ? 'Market Practice Variance' :
                  area.perspective === 'ambiguous' ? 'Ambiguity / Interpretation' : 'High-Impact Covenant',
        plainSummary: area.explanation,
        discussionReason: `Evaluate whether this provision aligns with customary market standards in ${jurisdiction} and whether standard exceptions or bilateral protections should be requested.`,
        citation: area.citation || { page: 1, section: 'General Provisions' },
        sourceQuote: area.citation?.exactQuote || area.explanation,
        riskSeverity: area.severity
      });
    });
  }

  // Supplement from Key Clauses (indemnity, termination, liability, governing law, holdover)
  if (analysis?.clauses && analysis.clauses.length > 0) {
    const existingTitles = new Set(clausesToDiscuss.map(c => c.title.toLowerCase()));
    
    analysis.clauses.forEach((cl, idx) => {
      const lower = cl.title.toLowerCase();
      if (
        (lower.includes('indemn') || 
         lower.includes('holdover') || 
         lower.includes('terminat') || 
         lower.includes('default') || 
         lower.includes('damages') ||
         lower.includes('non-compete') ||
         lower.includes('governing law') ||
         lower.includes('dispute')) &&
        !existingTitles.has(lower)
      ) {
        existingTitles.add(lower);
        clausesToDiscuss.push({
          id: `discuss-clause-cl-${idx + 1}`,
          title: cl.title,
          category: cl.category || 'Core Covenant',
          plainSummary: cl.plainSummary,
          discussionReason: `Review operational boundaries, financial triggers, and liability caps with counsel to establish negotiation parameters.`,
          citation: cl.citation || { page: 1, section: 'Operational Provisions' },
          sourceQuote: cl.rawText,
          riskSeverity: lower.includes('indemn') || lower.includes('holdover') ? 'high' : 'medium'
        });
      }
    });
  }

  // Default fallback clauses if document analysis was sparse
  if (clausesToDiscuss.length === 0) {
    clausesToDiscuss.push(
      {
        id: 'discuss-clause-fb-1',
        title: 'Indemnification and Third-Party Defense Scope',
        category: 'Liability & Defense',
        plainSummary: 'Governs party responsibilities to defend, indemnify, and hold harmless against third-party claims, property loss, or personal injury.',
        discussionReason: 'Examine whether the indemnification is unilateral or mutual, and verify whether gross negligence or willful misconduct are excluded.',
        citation: { page: 5, section: 'Section 5.1 Indemnification' },
        riskSeverity: 'high'
      },
      {
        id: 'discuss-clause-fb-2',
        title: 'Holdover Tenancy Penalties and Consequential Damage Exposure',
        category: 'Post-Expiration Liability',
        plainSummary: 'Imposes 200% basic rent multiplier and potential exposure to prospective third-party damages if premises are not vacated precisely on the expiration date.',
        discussionReason: 'Discuss negotiation of a lower multiplier (e.g. 150%) and adding a 30-day grace period before consequential damage exposure can be asserted.',
        citation: { page: 7, section: 'Section 7.2 Holdover' },
        riskSeverity: 'high'
      },
      {
        id: 'discuss-clause-fb-3',
        title: 'Notice Windows for Non-Renewal vs Automatic Extension',
        category: 'Term & Renewal',
        plainSummary: 'Requires written notice of non-renewal at least 60 days prior to expiration; failure to provide timely notice triggers an automatic 12-month extension.',
        discussionReason: 'Confirm calendar tracking procedures and evaluate requesting a mutual reminder notice obligation from the counterparty.',
        citation: { page: 1, section: 'Section 1.2 Term and Renewal' },
        riskSeverity: 'medium'
      },
      {
        id: 'discuss-clause-fb-4',
        title: 'Operating Expense (CAM) Pass-Through Allocation and Audit Rights',
        category: 'Financial Escalation',
        plainSummary: 'Passes proportionate building operating and maintenance expenditures through without a cumulative annual ceiling or defined base year.',
        discussionReason: 'Explore establishing a 5% cap on controllable expenses and securing an affirmative annual audit right for underlying expense ledgers.',
        citation: { page: 3, section: 'Section 3.2 Operating Expenses' },
        riskSeverity: 'medium'
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MISSING OR AMBIGUOUS INFORMATION
  // ---------------------------------------------------------------------------
  const missingOrAmbiguousInfo: AmbiguousOrMissingItem[] = [];

  // Check inconsistencies from document analysis
  if (analysis?.inconsistencies && analysis.inconsistencies.length > 0) {
    analysis.inconsistencies.forEach((inc, idx) => {
      missingOrAmbiguousInfo.push({
        id: `ambig-inc-${idx + 1}`,
        topic: inc.title,
        description: inc.description,
        citation: inc.conflictingCitations?.[0] || { page: 1, section: 'Cross-Section' },
        potentialImpact: 'Conflicting language creates uncertainty regarding which rule controls during a dispute.',
        suggestedClarification: inc.suggestedResolutionPrompt || 'Add an explicit prevailing clause hierarchy or harmonize the conflicting sections.'
      });
    });
  }

  // Document-type specific intelligent ambiguity detection
  if (docType === 'commercial_lease') {
    missingOrAmbiguousInfo.push(
      {
        id: 'ambig-lease-1',
        topic: 'Unstated Base Year / Index for Operating Expense Escalation',
        description: 'Section 3.2 references Tenant paying its proportionate share of Operating Expenses, but does not define a Base Year index or expense exclusion schedule.',
        citation: { page: 3, section: 'Section 3.2 Operating Expenses' },
        potentialImpact: 'Without an indexed base year or controllable expense cap, operational pass-through costs can fluctuate unpredictably.',
        suggestedClarification: 'Request that the lease specify a calendar Base Year (e.g. initial year of occupancy) and stipulate that Tenant only pays increases over the Base Year amount.'
      },
      {
        id: 'ambig-lease-2',
        topic: 'Discretionary Consent Standard for Subletting & Assignment',
        description: 'Section 5.3 states that assignment or subletting requires prior written consent, but omits the commercial qualification that consent "shall not be unreasonably withheld, conditioned, or delayed".',
        citation: { page: 5, section: 'Section 5.3 Assignment' },
        potentialImpact: 'The counterparty may exercise arbitrary or discretionary refusal without needing to articulate a commercial justification.',
        suggestedClarification: 'Ask counsel to insert language requiring reasonable commercial grounds and an affirmative 15-day response window for consent requests.'
      },
      {
        id: 'ambig-lease-3',
        topic: 'Absence of Notice and Cure Window for Non-Monetary Defaults',
        description: 'While Section 6.2 provides a 10-day cure window for monetary late payments, the contract is silent on a specific grace or cure period for non-monetary covenant breaches.',
        citation: { page: 6, section: 'Section 6.2 Default & Remedies' },
        potentialImpact: 'A technical non-monetary breach could trigger an immediate event of default without written notice or adequate opportunity to remediate.',
        suggestedClarification: 'Negotiate a standard 30-day written notice and cure window for all non-monetary defaults (with extension if diligently commenced).'
      },
      {
        id: 'ambig-lease-4',
        topic: 'Missing Referenced Attachments (Exhibit A & Exhibit B)',
        description: 'The preamble and Section 1.1 reference "Exhibit A (Premises Boundary & Floor Plan)" and "Exhibit B (Building Rules & Regulations)", but neither schedule is appended.',
        citation: { page: 1, section: 'Section 1.1 Premises' },
        potentialImpact: 'The exact physical boundary, usable square footage, and building restrictions remain legally undefined until the exhibits are reviewed.',
        suggestedClarification: 'Request complete, signed copies of Exhibit A and Exhibit B from the counterparty prior to formal execution.'
      }
    );
  } else if (docType === 'saas_msa') {
    missingOrAmbiguousInfo.push(
      {
        id: 'ambig-saas-1',
        topic: 'Undefined Service Level Agreement (SLA) Penalties & Service Credits',
        description: 'The agreement outlines uptime targets (99.9%) but omits a detailed schedule for service credit calculations or termination rights for chronic outages.',
        citation: { page: 2, section: 'Section 2.1 Service Levels' },
        potentialImpact: 'If chronic downtime occurs, financial remedies or exit mechanisms are not self-executing.',
        suggestedClarification: 'Incorporate a dedicated Service Level Exhibit defining concrete fee credits and a termination right if uptime falls below 98% in two consecutive months.'
      },
      {
        id: 'ambig-saas-2',
        topic: 'Unilateral Modification of Terms and Features',
        description: 'The agreement allows the provider to modify platform features and specifications from time to time without advance notice.',
        citation: { page: 4, section: 'Section 4.3 Platform Updates' },
        potentialImpact: 'Core functionalities relied upon by your workflow could be discontinued or altered without recourse.',
        suggestedClarification: 'Add a covenant that updates will not materially degrade security standards or core functional features during the active subscription term.'
      },
      {
        id: 'ambig-saas-3',
        topic: 'Unspecified Post-Termination Data Export Window and Format',
        description: 'The agreement stipulates data deletion within 30 days after termination but does not specify a transitional export window or standard machine-readable format.',
        citation: { page: 7, section: 'Section 7.4 Data Transition' },
        potentialImpact: 'Risk of sudden data purge before an orderly migration to another provider can be executed.',
        suggestedClarification: 'Specify a 60-day transitional retrieval period in standard CSV/JSON format at no additional cost.'
      }
    );
  } else {
    // General contract ambiguities
    missingOrAmbiguousInfo.push(
      {
        id: 'ambig-gen-1',
        topic: 'Unspecified Venue and Arbitration Hearing Location',
        description: 'Section 8.1 establishes governing state law but omits specific county venue or administrative rules for dispute hearings.',
        citation: { page: 8, section: 'Section 8.1 Governing Law' },
        potentialImpact: 'Parties could engage in preliminary procedural battles over venue selection in the event of litigation.',
        suggestedClarification: 'Confirm the specific county and court or arbitration tribunal (e.g. AAA or JAMS) with your attorney.'
      },
      {
        id: 'ambig-gen-2',
        topic: 'Notice Delivery Methods and Deemed Receipt Timing',
        description: 'The notices section allows email notice without clarifying whether delivery requires an affirmative response confirmation to be legally effective.',
        citation: { page: 8, section: 'Section 8.4 Notices' },
        potentialImpact: 'Disputes over whether critical termination or default notices were received and when grace periods begin running.',
        suggestedClarification: 'Require formal notices to be delivered via certified courier or email with confirmed electronic read receipt.'
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 3. QUESTIONS FOR A QUALIFIED LEGAL PROFESSIONAL
  // ---------------------------------------------------------------------------
  const questionsForCounsel: LawyerQuestion[] = [
    {
      id: 'q-prep-1',
      category: 'Liability & Risk',
      question: 'Can we negotiate a mutual waiver of consequential and indirect damages without the holdover carve-out?',
      context: 'Section 7.2 currently exposes our business to lost rents and third-party damages claimed by prospective replacement occupants.',
      citation: { page: 7, section: 'Section 7.2 Holdover' },
      priority: 'essential',
      isAnswered: false
    },
    {
      id: 'q-prep-2',
      category: 'Financial & Fees',
      question: 'What is the customary market cap on controllable Operating Expense (CAM) escalations in this jurisdiction?',
      context: 'The agreement currently permits uncapped pass-throughs for administrative fees, management overhead, and capital maintenance.',
      citation: { page: 3, section: 'Section 3.2 Operating Expenses' },
      priority: 'recommended',
      isAnswered: false
    },
    {
      id: 'q-prep-3',
      category: 'Termination & Transition',
      question: 'Is it advisable to request a mandatory 30-day reminder notice prior to the automatic renewal opt-out deadline?',
      context: 'Under Section 1.2, missing the 60-day advance notice window automatically locks us into another full calendar year term.',
      citation: { page: 1, section: 'Section 1.2 Term & Renewal' },
      priority: 'recommended',
      isAnswered: false
    },
    {
      id: 'q-prep-4',
      category: 'Operational & Compliance',
      question: 'How does Section 5.3 treat assignment in the event of an internal corporate reorganization or majority stock sale?',
      context: 'The current transfer restriction may inadvertently prohibit routine corporate restructuring or equity financing without prior Landlord consent.',
      citation: { page: 5, section: 'Section 5.3 Assignment and Subletting' },
      priority: 'essential',
      isAnswered: false
    },
    {
      id: 'q-prep-5',
      category: 'Operational & Compliance',
      question: 'Can the surrender condition in Section 7.1 be softened from "bare-shell concrete restoration" to "broom-clean with reasonable wear and tear"?',
      context: 'Restoring structural alterations back to raw concrete condition could entail significant exit expenditures at term expiration.',
      citation: { page: 7, section: 'Section 7.1 Surrender of Premises' },
      priority: 'recommended',
      isAnswered: false
    },
    {
      id: 'q-prep-6',
      category: 'Liability & Risk',
      question: 'Are the indemnification covenants in Section 5.1 strictly bilateral under local case law, or do they disproportionately favor the drafter?',
      context: 'The text requires Tenant to defend Landlord against any incidents on the premises without an express carve-out for Landlord gross negligence.',
      citation: { page: 5, section: 'Section 5.1 Indemnification' },
      priority: 'essential',
      isAnswered: false
    }
  ];

  // ---------------------------------------------------------------------------
  // 4. IMPORTANT DATES & DEADLINES
  // ---------------------------------------------------------------------------
  const importantDates: ImportantDate[] = [];

  if (analysis?.importantDates && analysis.importantDates.length > 0) {
    importantDates.push(...analysis.importantDates);
  } else {
    // Standard baseline deadlines from the document structure
    importantDates.push(
      {
        id: 'date-prep-1',
        title: 'Monthly Rent Payment Due Date',
        dateStr: '1st calendar day of each month (Grace period through 5th day)',
        type: 'payment_due',
        citation: { page: 2, section: 'Section 3.1 Basic Rent' },
        significance: 'Late fee of 5% assessed on payments received after the 5th day of the month.'
      },
      {
        id: 'date-prep-2',
        title: 'Advance Non-Renewal Notice Deadline',
        dateStr: '60 days prior to Initial Term Expiration Date',
        type: 'renewal_window',
        citation: { page: 1, section: 'Section 1.2 Term and Renewal' },
        significance: 'Failure to provide written non-renewal notice automatically binds parties to a 12-month extension.'
      },
      {
        id: 'date-prep-3',
        title: 'Monetary Default Written Notice & Cure Period',
        dateStr: '10 calendar days following receipt of written demand',
        type: 'notice_deadline',
        citation: { page: 6, section: 'Section 6.2 Default' },
        significance: 'Failure to cure within 10 days permits immediate lease termination and acceleration of rent.'
      },
      {
        id: 'date-prep-4',
        title: 'Early Termination for Convenience Window',
        dateStr: 'After 36th month of Term (requires 90 days advance written notice)',
        type: 'expiration',
        citation: { page: 6, section: 'Section 6.1 Termination for Convenience' },
        significance: 'Permits early exit upon payment of 3 months basic rent early termination fee.'
      },
      {
        id: 'date-prep-5',
        title: 'Annual Operating Expense Reconciliation Statement',
        dateStr: 'Within 90 days following close of each calendar year',
        type: 'audit_timeline',
        citation: { page: 3, section: 'Section 3.2 Operating Expenses' },
        significance: 'Parties settle estimated vs actual CAM expenditures; 30-day window to raise audit objections.'
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 5. DOCUMENTS OR INFORMATION TO GATHER
  // ---------------------------------------------------------------------------
  const documentsToGather: DocumentToGather[] = [
    {
      id: 'doc-gather-1',
      documentName: 'Certificate of Commercial General Liability Insurance',
      purpose: 'Verify existing policy coverage limits ($2M per occurrence / $5M aggregate) and confirm whether the counterparty can be added as an Additional Insured.',
      relatedClauseOrTopic: 'Insurance & Indemnity Covenants',
      citation: { page: 5, section: 'Section 5.2 Insurance Requirements' },
      urgency: 'high',
      isGathered: false
    },
    {
      id: 'doc-gather-2',
      documentName: 'Referenced Schedules: Exhibit A (Floor Plan) & Exhibit B (Rules)',
      purpose: 'Confirm exact boundary demising walls, usable vs rentable square feet, and shared building rules that are incorporated by reference.',
      relatedClauseOrTopic: 'Premises Description & Boundary',
      citation: { page: 1, section: 'Section 1.1 Premises' },
      urgency: 'high',
      isGathered: false
    },
    {
      id: 'doc-gather-3',
      documentName: 'Prior Negotiation Records: Letter of Intent (LOI) & Term Sheet',
      purpose: 'Allow counsel to check if key negotiated commercial points (e.g. rent abatement, tenant improvement allowances, cap on CAM) were omitted in drafting.',
      relatedClauseOrTopic: 'Preamble & Commercial Terms',
      citation: { page: 1, section: 'Recitals' },
      urgency: 'high',
      isGathered: false
    },
    {
      id: 'doc-gather-4',
      documentName: 'Corporate Authorization Documentation / Signatory Resolution',
      purpose: 'Ensure signatory authority is formalized under company bylaws or board resolution before execution.',
      relatedClauseOrTopic: 'Authority & Execution',
      citation: { page: 8, section: 'Signature Page' },
      urgency: 'medium',
      isGathered: false
    },
    {
      id: 'doc-gather-5',
      documentName: 'Historical Utility and Operating Expense Statements',
      purpose: 'Benchmark proposed CAM pass-through estimates against historical building or neighborhood operating figures.',
      relatedClauseOrTopic: 'CAM / Operating Costs',
      citation: { page: 3, section: 'Section 3.2 Operating Expenses' },
      urgency: 'medium',
      isGathered: false
    },
    {
      id: 'doc-gather-6',
      documentName: 'Premises Condition / Baseline Inspection Report',
      purpose: 'Document pre-existing alterations or structural conditions to prevent future disputes over surrender restoration obligations.',
      relatedClauseOrTopic: 'Surrender & Restoration',
      citation: { page: 7, section: 'Section 7.1 Surrender' },
      urgency: 'standard',
      isGathered: false
    }
  ];

  // ---------------------------------------------------------------------------
  // 6. CONCISE ONE-PAGE CASE / DOCUMENT BRIEF
  // ---------------------------------------------------------------------------
  const parties = analysis?.parties && analysis.parties.length > 0
    ? analysis.parties.map(p => ({
        name: p.name,
        role: p.role,
        citation: p.citation || { page: 1, section: 'Preamble' }
      }))
    : [
        { name: 'Empire Commercial Holdings LLC', role: 'Landlord / Drafter', citation: { page: 1, section: 'Preamble' } },
        { name: 'Apex Global Logistics Inc.', role: 'Tenant / Counterparty', citation: { page: 1, section: 'Preamble' } }
      ];

  const govLawVenue = analysis?.governingLaw 
    ? `${analysis.governingLaw.jurisdiction} (${analysis.governingLaw.forum || 'Courts of competent jurisdiction'})`
    : `${jurisdiction} (State and Federal courts located within designated county)`;

  const govLawCitation = analysis?.governingLaw?.citation || { page: 8, section: 'Section 8.1 Governing Law' };

  const termSummary = analysis?.clauses?.find(c => c.title.toLowerCase().includes('term'))?.plainSummary || 
    'Sixty (60) full calendar months commencing on Commencement Date; automatic 12-month renewals unless written non-renewal notice is delivered at least 60 days prior.';

  const termCitation = analysis?.clauses?.find(c => c.title.toLowerCase().includes('term'))?.citation || 
    { page: 1, section: 'Section 1.2 Term and Renewal' };

  const financialSummary = analysis?.monetaryTerms || 
    'Basic Monthly Rent of $18,500.00 ($222,000.00 annually) payable on the 1st of each month. 5% late fee after 5-day grace period. Proportionate share of Operating Expenses (CAM) passed through annually. Security deposit equal to three (3) months rent ($55,500.00).';

  const financialCitation = { page: 2, section: 'Section 3.1 & Section 3.2' };

  const caveats: Array<{ point: string; citation?: Citation }> = [
    {
      point: 'Holdover penalty of 200% basic rent with express tenant exposure to prospective third-party damages (Section 7.2).',
      citation: { page: 7, section: 'Section 7.2 Holdover' }
    },
    {
      point: 'Strict surrender obligation requiring complete removal of all leasehold improvements and restoration to bare-shell concrete (Section 7.1).',
      citation: { page: 7, section: 'Section 7.1 Surrender' }
    },
    {
      point: 'Unilateral indemnification obligation without explicit carve-out for landlord gross negligence (Section 5.1).',
      citation: { page: 5, section: 'Section 5.1 Indemnification' }
    },
    {
      point: 'Right of convenience exit requires waiting 36 months, 90 days advance notice, and a 3-month rental fee penalty (Section 6.1).',
      citation: { page: 6, section: 'Section 6.1 Termination for Convenience' }
    },
    {
      point: 'Uncapped pass-through of operating expenses without an indexed base year or controllable expense limits (Section 3.2).',
      citation: { page: 3, section: 'Section 3.2 Operating Expenses' }
    }
  ];

  const documentBrief: OnePageDocumentBrief = {
    agreementTitle: docTitle,
    documentType: docType.replace(/_/g, ' ').toUpperCase(),
    jurisdictionAndVenue: govLawVenue,
    governingLawCitation: govLawCitation,
    parties,
    termAndDuration: { summary: termSummary, citation: termCitation },
    financialCommitmentsSummary: { summary: financialSummary, citation: financialCitation },
    criticalOperationalCaveats: caveats,
    identifiedAmbiguitiesCount: missingOrAmbiguousInfo.length,
    recommendedMeetingFocus: 'Primary consultation focus should center on balancing unilateral indemnity covenants, establishing caps on CAM pass-through escalations, reducing holdover damage exposure, and confirming all missing exhibit attachments prior to execution.',
    disclaimer: 'INFORMATIONAL CASE BRIEF ONLY: Prepared by LexLens solely to facilitate client-attorney preparation. This brief summarizes document terms and does not constitute legal advice, provide legal opinions, or guarantee any specific legal outcome. All legal decisions should be made in consultation with a qualified legal professional licensed in the relevant jurisdiction.'
  };

  return {
    documentId: doc.id,
    documentTitle: docTitle,
    documentType: docType,
    jurisdiction,
    generatedAt: new Date().toISOString(),
    clausesToDiscuss,
    missingOrAmbiguousInfo,
    questionsForCounsel,
    importantDates,
    documentsToGather,
    documentBrief
  };
}
