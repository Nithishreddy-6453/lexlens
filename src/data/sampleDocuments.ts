import { StoredDocument, DocumentAnalysis, ComparisonResult, LawyerQuestion } from '../types';

export const SAMPLE_COMMERCIAL_LEASE: StoredDocument = {
  id: 'sample-lease-01',
  title: 'Standard Commercial Office Lease Agreement',
  fileName: 'commercial_office_lease_2026.pdf',
  fileSize: 428000,
  uploadedAt: '2026-09-18T14:30:00Z',
  documentType: 'commercial_lease',
  jurisdiction: 'State of New York, USA',
  pageCount: 8,
  pages: [
    {
      pageNumber: 1,
      content: `COMMERCIAL LEASE AGREEMENT
This Commercial Lease Agreement (the "Lease") is entered into as of October 1, 2026 (the "Effective Date"), by and between METROPOLITAN REALTY HOLDINGS LLC, a Delaware limited liability company having an address at 450 Lexington Avenue, New York, NY 10017 ("Landlord"), and NEXUSTECH SOLUTIONS INC., a Delaware corporation having an address at 120 Wall Street, New York, NY 10005 ("Tenant").

1. PREMISES & TERM
1.1 Demised Premises. Landlord hereby leases to Tenant, and Tenant hereby leases from Landlord, Suite 1400 comprising approximately 8,500 rentable square feet (the "Premises") located on the fourteenth floor of the building situated at 350 Hudson Street, New York, NY (the "Building").
1.2 Term. The term of this Lease (the "Term") shall commence on November 1, 2026 (the "Commencement Date") and shall expire on October 31, 2031 (the "Expiration Date"), unless sooner terminated or extended pursuant to the provisions hereof.`
    },
    {
      pageNumber: 2,
      content: `2. RENT & OPERATING EXPENSES
2.1 Base Rent. Tenant shall pay Landlord annual Base Rent in monthly installments payable in advance on the first (1st) day of each calendar month as follows:
(a) Year 1: $467,500.00 per annum ($38,958.33 per month);
(b) Year 2: $481,525.00 per annum ($40,127.08 per month);
(c) Year 3: $495,970.00 per annum ($41,330.83 per month);
(d) Years 4-5: 3.0% cumulative annual step increments.
2.2 Additional Rent & CAM Charges. Tenant shall pay as Additional Rent its proportionate share (4.25%) of Building Operating Expenses and Real Estate Taxes in excess of Base Year 2026. Landlord shall estimate such charges annually, and Tenant shall pay 1/12th of such estimate monthly. Landlord retains the right to revise estimates retroactively within 18 months of calendar year end.`
    },
    {
      pageNumber: 3,
      content: `3. SECURITY DEPOSIT & LETTER OF CREDIT
3.1 Cash Deposit. Tenant shall deposit with Landlord upon execution hereof the sum of $155,833.32 (representing four months of Year 1 Base Rent) as security for the faithful performance of all obligations hereunder.
3.2 Right to Increase. In the event Tenant experiences a material change in credit rating or undergoes a change of control without Landlord's prior written consent, Landlord reserves the absolute right to require an additional two (2) months of Base Rent to be deposited within ten (10) business days of written notice.`
    },
    {
      pageNumber: 4,
      content: `4. USE, ALTERATIONS & RESTORATION
4.1 Permitted Use. The Premises shall be used solely for general commercial executive offices and software engineering laboratories, and for no other purpose without Landlord's prior written consent.
4.2 Alterations. Tenant shall not make any alterations, installations, or improvements ("Alterations") without Landlord's prior written approval. All structural alterations shall become property of Landlord upon completion.
4.3 End of Term Restoration. Upon expiration or earlier termination of the Term, Tenant shall, at Landlord's sole election and at Tenant's sole expense, remove any and all cabling, partitions, server room HVAC units, and specialized trade fixtures, and restore the Premises to bare shell condition within fourteen (14) days.`
    },
    {
      pageNumber: 5,
      content: `5. REPAIRS & MAINTENANCE
5.1 Landlord Obligations. Landlord shall maintain and repair the roof, exterior walls, and foundational structures, subject to pass-through in Operating Expenses.
5.2 Tenant Obligations. Tenant shall keep and maintain the interior of the Premises in first-class good order, condition, and repair at Tenant's sole cost, including HVAC distribution ductwork, plumbing fixtures within the demised space, lighting ballasts, and interior glass partition walls.`
    },
    {
      pageNumber: 6,
      content: `6. INDEMNIFICATION & INSURANCE
6.1 Mutual Indemnity Disparity. Tenant shall defend, indemnify, and hold harmless Landlord, its managing agents, partners, and mortgagees from and against any and all claims, liabilities, losses, damages, costs, and attorneys' fees arising from Tenant's use or occupancy of the Premises or any negligence of Tenant's agents or visitors. Landlord's liability to Tenant shall be strictly limited to Landlord's equity interest in the Building, with no personal liability attaching to any partner, member, or officer of Landlord.
6.2 Subrogation Waiver. Each party hereby waives any claims against the other for damage to property to the extent covered by valid and collectible fire and extended coverage insurance.`
    },
    {
      pageNumber: 7,
      content: `7. DEFAULT & REMEDIES
7.1 Events of Default. It shall constitute an Event of Default if Tenant fails to pay any Base Rent or Additional Rent within five (5) days after written notice, or fails to cure any non-monetary default within twenty (20) days following notice.
7.2 Holdover Penalty. If Tenant remains in possession of the Premises after the Expiration Date without executing a written extension, Tenant shall be deemed a tenant-at-sufferance and shall pay holdover rent equal to two hundred percent (200%) of the Base Rent and Additional Rent payable in the final month of the Term, calculated on a per diem basis, plus all consequential damages incurred by Landlord resulting from delayed delivery to incoming tenants.`
    },
    {
      pageNumber: 8,
      content: `8. MISCELLANEOUS & GOVERNING LAW
8.1 Entire Agreement. This Lease contains the entire understanding of the parties and supersedes all prior proposals, negotiations, and representations.
8.2 Governing Law & Jurisdiction. This Lease shall be governed by, interpreted, and enforced in accordance with the internal laws of the State of New York, without regard to principles of conflicts of law. The parties submit to the exclusive jurisdiction of the Supreme Court of the State of New York, County of New York.
8.3 Notice Period for Non-Renewal. If Tenant does not intend to negotiate a renewal, Tenant must provide written notice to Landlord at least nine (9) months prior to the Expiration Date.

IN WITNESS WHEREOF, Landlord and Tenant have executed this Commercial Lease Agreement as of the date first above written.`
    }
  ],
  analysis: {
    id: 'analysis-lease-01',
    documentId: 'sample-lease-01',
    documentTitle: 'Standard Commercial Office Lease Agreement',
    documentType: 'commercial_lease',
    jurisdiction: 'State of New York, USA',
    analyzedAt: '2026-09-18T14:32:10Z',
    pageCount: 8,
    executiveSummary: 'This is an 8-page commercial office lease between Metropolitan Realty Holdings LLC (Landlord) and NexusTech Solutions Inc. (Tenant) for Suite 1400 (8,500 sq ft) at 350 Hudson St, New York. The 5-year lease runs from Nov 1, 2026 to Oct 31, 2031, starting at $38,958.33/mo with annual escalations and 4.25% pass-through CAM. Key exposure areas for the tenant include a 200% holdover rent penalty with consequential damages, unilateral restoration mandates at lease-end, an asymmetrical indemnification clause, and Landlord discretion to demand an increased security deposit upon change of control.',
    parties: [
      {
        id: 'p1',
        name: 'Metropolitan Realty Holdings LLC',
        role: 'Landlord',
        entityType: 'llc',
        jurisdictionNoticeAddress: '450 Lexington Avenue, New York, NY 10017',
        citation: { page: 1, section: 'Preamble' }
      },
      {
        id: 'p2',
        name: 'NexusTech Solutions Inc.',
        role: 'Tenant',
        entityType: 'corporation',
        jurisdictionNoticeAddress: '120 Wall Street, New York, NY 10005',
        citation: { page: 1, section: 'Preamble' }
      }
    ],
    clauses: [
      {
        id: 'cl-1',
        title: 'Premises & Lease Term',
        category: 'General',
        rawText: 'Suite 1400 comprising approximately 8,500 rentable square feet... from November 1, 2026 to October 31, 2031.',
        plainSummary: 'Leases 8,500 sq ft on the 14th floor for exactly 5 years starting Nov 1, 2026.',
        citation: { page: 1, section: 'Section 1.1 & 1.2' },
        keyTerms: ['8,500 RSF', '5-year term', 'Suite 1400'],
        attentionScore: 'low'
      },
      {
        id: 'cl-2',
        title: 'Rent & Operating Expenses (CAM Escalation)',
        category: 'Payment',
        rawText: 'Year 1: $467,500.00 ($38,958.33/mo)... Tenant pays 4.25% share of Operating Expenses and Real Estate Taxes in excess of Base Year 2026. Landlord retains right to revise estimates retroactively within 18 months.',
        plainSummary: 'Base rent steps up annually. Tenant pays 4.25% of building cost increases above 2026 baseline. Landlord can retroactively adjust estimates up to 18 months later.',
        citation: { page: 2, section: 'Section 2.1 & 2.2' },
        keyTerms: ['$38,958.33/mo base', '4.25% proportionate share', '18-month retroactive audit window'],
        attentionScore: 'medium'
      },
      {
        id: 'cl-3',
        title: 'Security Deposit & Change of Control Adjustment',
        category: 'Payment',
        rawText: 'Tenant shall deposit $155,833.32 (4 months)... Landlord reserves absolute right to require additional two (2) months of Base Rent upon change of control or rating change.',
        plainSummary: 'Tenant posts 4 months cash deposit ($155.8k). Landlord may unilaterally demand 2 additional months if Tenant undergoes an acquisition, merger, or credit shift.',
        citation: { page: 3, section: 'Section 3.1 & 3.2' },
        keyTerms: ['4-month deposit ($155,833)', 'Unilateral right to increase by 2 months'],
        attentionScore: 'high'
      },
      {
        id: 'cl-4',
        title: 'End of Term Restoration to Bare Shell',
        category: 'General',
        rawText: 'Tenant shall, at Landlord\'s sole election and at Tenant\'s sole expense, remove any and all cabling, partitions, server room HVAC units... restore to bare shell within 14 days.',
        plainSummary: 'Tenant could be forced to demolish interior cabling, partitions, and server AC units back to concrete shell within only 14 days at huge out-of-pocket expense.',
        citation: { page: 4, section: 'Section 4.3' },
        keyTerms: ['Bare shell restoration', '14-day timeline', 'Tenant sole expense'],
        attentionScore: 'high'
      },
      {
        id: 'cl-5',
        title: 'Tenant Maintenance & HVAC Duct Distribution',
        category: 'Obligations' as any,
        rawText: 'Tenant shall keep and maintain the interior in first-class good order... including HVAC distribution ductwork and plumbing fixtures within demised space.',
        plainSummary: 'Tenant is legally responsible for servicing HVAC ductwork and internal plumbing inside the space, not just standard janitorial tasks.',
        citation: { page: 5, section: 'Section 5.2' },
        keyTerms: ['HVAC duct maintenance', 'Internal plumbing', 'First-class repair'],
        attentionScore: 'medium'
      },
      {
        id: 'cl-6',
        title: 'Indemnification & Limitation of Landlord Liability',
        category: 'Indemnification',
        rawText: 'Tenant shall defend, indemnify, and hold harmless Landlord... Landlord\'s liability to Tenant shall be strictly limited to Landlord\'s equity interest in the Building.',
        plainSummary: 'Broad one-sided indemnity benefiting Landlord. If Landlord breaches or causes damage, Tenant\'s recovery is strictly capped at Landlord\'s equity in the building.',
        citation: { page: 6, section: 'Section 6.1' },
        keyTerms: ['One-sided indemnity', 'Equity cap on Landlord liability'],
        attentionScore: 'high'
      },
      {
        id: 'cl-7',
        title: 'Holdover Penalty & Consequential Damages',
        category: 'Liability',
        rawText: 'Holdover rent equal to two hundred percent (200%) of Base Rent and Additional Rent... plus all consequential damages incurred by Landlord resulting from delayed delivery.',
        plainSummary: 'If Tenant stays even one day past expiry, rent doubles (200%), and Tenant must pay all lost profits/consequential claims from future incoming tenants.',
        citation: { page: 7, section: 'Section 7.2' },
        keyTerms: ['200% holdover rent', 'Consequential damages pass-through', 'Tenant-at-sufferance'],
        attentionScore: 'high'
      },
      {
        id: 'cl-8',
        title: 'Non-Renewal Notice & Governing Law',
        category: 'Governing Law',
        rawText: 'Tenant must provide written notice to Landlord at least nine (9) months prior to Expiration Date... internal laws of State of New York, Supreme Court New York County.',
        plainSummary: 'Tenant must give at least 9 months advance written notice if not renewing. Governed exclusively by New York State law.',
        citation: { page: 8, section: 'Section 8.2 & 8.3' },
        keyTerms: ['9-month non-renewal notice', 'New York Supreme Court forum'],
        attentionScore: 'medium'
      }
    ],
    attentionAreas: [
      {
        id: 'att-1',
        clauseId: 'cl-7',
        title: '200% Holdover Penalty with Consequential Damages',
        severity: 'high',
        explanation: 'The document states that any holdover occupancy incurs a 200% rent surcharge plus full consequential damages if a prospective tenant cancels. Market standard is typically 150% without consequential damages.',
        citation: { page: 7, section: 'Section 7.2' },
        recommendedAction: 'Consider requesting counsel to negotiate 125-150% holdover rate and explicitly strike liability for Landlord\'s consequential damages or lost prospective leases.',
        perspective: 'unfavorable'
      },
      {
        id: 'att-2',
        clauseId: 'cl-4',
        title: 'Unilateral Bare Shell Restoration Mandate',
        severity: 'high',
        explanation: 'Section 4.3 allows Landlord sole election to require Tenant to remove all cabling and specialized HVAC to bare concrete within 14 days, creating unpredictable decommissioning liability.',
        citation: { page: 4, section: 'Section 4.3' },
        recommendedAction: 'Ask for language confirming Tenant is only required to remove initial unapproved alterations, with normal office cabling surrendered in place.',
        perspective: 'one_sided'
      },
      {
        id: 'att-3',
        clauseId: 'cl-3',
        title: 'Right to Increase Security Deposit on Change of Control',
        severity: 'medium',
        explanation: 'If Tenant completes an equity financing, merger, or reorganization, Landlord can demand two additional months of cash deposit within 10 business days.',
        citation: { page: 3, section: 'Section 3.2' },
        recommendedAction: 'Seek a carve-out for bona fide corporate reorganizations, venture financing rounds, or public offerings where net worth is maintained.',
        perspective: 'unfavorable'
      },
      {
        id: 'att-4',
        clauseId: 'cl-6',
        title: 'One-Sided Indemnification & Equity Liability Shield',
        severity: 'medium',
        explanation: 'Tenant must indemnify Landlord broadly, but Landlord provides no reciprocal indemnity for its own gross negligence, and Landlord\'s liability is capped at equity interest.',
        citation: { page: 6, section: 'Section 6.1' },
        recommendedAction: 'Request mutual indemnification and mutual limitation of liability standards.',
        perspective: 'one_sided'
      },
      {
        id: 'att-5',
        clauseId: 'cl-8',
        title: 'Strict 9-Month Advance Notice for Non-Renewal',
        severity: 'low',
        explanation: 'Failing to give written notice 9 months prior to October 31, 2031 may restrict Tenant\'s exit flexibility or trigger operational friction.',
        citation: { page: 8, section: 'Section 8.3' },
        recommendedAction: 'Calendar January 31, 2031 as the non-renewal notice deadline; discuss reducing notice requirement to 180 days (6 months).',
        perspective: 'standard'
      }
    ],
    obligations: [
      {
        id: 'ob-1',
        obligor: 'Tenant',
        beneficiary: 'Landlord',
        description: 'Pay Base Rent of $38,958.33 monthly on the 1st of each calendar month in advance.',
        recurrence: 'recurring',
        deadline: '1st of each month',
        citation: { page: 2, section: 'Section 2.1' },
        priority: 'critical'
      },
      {
        id: 'ob-2',
        obligor: 'Tenant',
        beneficiary: 'Landlord',
        description: 'Deposit $155,833.32 security deposit upon lease execution.',
        recurrence: 'one-time',
        deadline: 'Upon execution (October 1, 2026)',
        citation: { page: 3, section: 'Section 3.1' },
        priority: 'critical'
      },
      {
        id: 'ob-3',
        obligor: 'Tenant',
        beneficiary: 'Landlord',
        description: 'Maintain and repair internal HVAC ductwork and dedicated plumbing in Suite 1400.',
        recurrence: 'recurring',
        deadline: 'Ongoing throughout Term',
        citation: { page: 5, section: 'Section 5.2' },
        priority: 'normal'
      },
      {
        id: 'ob-4',
        obligor: 'Tenant',
        beneficiary: 'Landlord',
        description: 'Deliver written non-renewal notice at least 9 months prior to October 31, 2031.',
        recurrence: 'conditional',
        deadline: 'January 31, 2031',
        citation: { page: 8, section: 'Section 8.3' },
        priority: 'critical'
      },
      {
        id: 'ob-5',
        obligor: 'Landlord',
        beneficiary: 'Tenant',
        description: 'Maintain structural building components including roof, exterior walls, and foundation.',
        recurrence: 'recurring',
        deadline: 'Ongoing',
        citation: { page: 5, section: 'Section 5.1' },
        priority: 'normal'
      }
    ],
    importantDates: [
      {
        id: 'dt-1',
        title: 'Lease Effective Date',
        dateStr: '2026-10-01',
        type: 'effective_date',
        citation: { page: 1, section: 'Preamble' },
        significance: 'Date the agreement was signed and security deposit obligation triggered.'
      },
      {
        id: 'dt-2',
        title: 'Commencement Date',
        dateStr: '2026-11-01',
        type: 'effective_date',
        citation: { page: 1, section: 'Section 1.2' },
        significance: 'Date Tenant receives occupancy and monthly Base Rent starts accruing.'
      },
      {
        id: 'dt-3',
        title: 'Non-Renewal Notice Deadline',
        dateStr: '2031-01-31',
        type: 'notice_deadline',
        citation: { page: 8, section: 'Section 8.3' },
        significance: 'Must provide written non-renewal notice at least 9 months before expiration.'
      },
      {
        id: 'dt-4',
        title: 'Lease Expiration Date',
        dateStr: '2031-10-31',
        type: 'expiration',
        citation: { page: 1, section: 'Section 1.2' },
        significance: 'End of primary 5-year term. Holdover penalties apply after this date.'
      }
    ],
    inconsistencies: [
      {
        id: 'inc-1',
        title: 'Restoration Timeline Ambiguity vs Surrender Standard',
        description: 'Section 4.3 mandates complete restoration to bare shell within 14 days of expiration, whereas Section 7.2 immediately triggers 200% holdover status upon the expiration date, creating a potential trap if restoration occurs after October 31.',
        conflictingCitations: [
          { page: 4, section: 'Section 4.3' },
          { page: 7, section: 'Section 7.2' }
        ],
        suggestedResolutionPrompt: 'Clarify whether restoration must occur prior to expiration, or if a pre-agreed 14-day decommission period is permitted without holdover rent.'
      }
    ],
    governingLaw: {
      jurisdiction: 'New York, USA',
      forum: 'New York County Supreme Court',
      citation: { page: 8, section: 'Section 8.2' }
    }
  }
};

export const SAMPLE_PROPOSED_AMENDMENT: StoredDocument = {
  id: 'sample-amendment-02',
  title: 'Proposed Lease Amendment & Extension (Draft)',
  fileName: 'proposed_lease_amendment_2026.pdf',
  fileSize: 284000,
  uploadedAt: '2026-09-19T10:15:00Z',
  documentType: 'commercial_lease',
  jurisdiction: 'State of New York, USA',
  pageCount: 4,
  pages: [
    {
      pageNumber: 1,
      content: `FIRST AMENDMENT TO COMMERCIAL LEASE AGREEMENT
This First Amendment to Commercial Lease Agreement ("Amendment") is dated as of December 15, 2026, by and between METROPOLITAN REALTY HOLDINGS LLC ("Landlord") and NEXUSTECH SOLUTIONS INC. ("Tenant").

RECITALS
WHEREAS, Landlord and Tenant entered into that certain Commercial Lease Agreement dated October 1, 2026 (the "Original Lease");
WHEREAS, Tenant desires to expand the Demised Premises to include Suite 1450 (additional 3,200 RSF) and modify certain operational covenants.

1. EXPANDED PREMISES & TERM EXTENSION
1.1 Total Space. Commencing January 1, 2027, the Premises shall total 11,700 RSF (Suite 1400 + Suite 1450).
1.2 Term. The Expiration Date is hereby extended through October 31, 2034 (additional 3 years).`
    },
    {
      pageNumber: 2,
      content: `2. RENT ADJUSTMENTS & CAP ON OPERATING EXPENSES
2.1 Consolidated Rent. Annual Base Rent for the combined space shall be $643,500.00 ($53,625.00/month).
2.2 Controllable Operating Expense Cap. Notwithstanding Section 2.2 of the Original Lease, Tenant's share of Controllable Operating Expenses shall not increase by more than five percent (5.0%) per annum on a cumulative basis. Non-controllable costs (Taxes and Utilities) remain uncapped.`
    },
    {
      pageNumber: 3,
      content: `3. MODIFICATIONS TO RESTORATION & HOLDOVER
3.1 Cable & Partition Surrender. Section 4.3 of the Original Lease is hereby deleted in its entirety. Tenant shall surrender the Premises in broom-clean condition with all cabling, standard walls, and tenant improvements in place, with no requirement to revert to bare shell.
3.2 Holdover Fee Revision. Section 7.2 of the Original Lease is modified such that holdover rent for the first sixty (60) days shall be 150% of the final month's rent, and Landlord waives consequential damages for any delay under 30 days.`
    },
    {
      pageNumber: 4,
      content: `4. ASSIGNMENT & PERMITTED TRANSFERS
4.1 Affiliate Transfers. Tenant may assign this Lease or sublet the Premises without Landlord's consent to any parent, subsidiary, or entity acquiring substantially all of Tenant's equity or assets, and Section 3.2 (security deposit increase upon change of control) shall not apply to Permitted Transfers.
4.2 Reaffirmation. Except as expressly modified herein, all terms and covenants of the Original Lease remain in full force and effect.`
    }
  ]
};

export const SAMPLE_COMPARISON_RESULT: ComparisonResult = {
  id: 'comp-lease-vs-amendment',
  doc1Id: 'sample-lease-01',
  doc1Title: 'Original Commercial Office Lease',
  doc2Id: 'sample-amendment-02',
  doc2Title: 'Proposed First Amendment & Extension',
  comparedAt: '2026-09-19T10:18:00Z',
  factualSummary: 'Comparative analysis of the Original Commercial Office Lease and Proposed First Amendment identifies 15 substantive clause alignments across operational, financial, and risk categories. Key documentary differences include adjustments to basic rent and late fees, extended notice and cure windows, modified early exit terms, transition from court litigation to commercial arbitration, and the elimination of the bare-shell restoration mandate.',
  executiveComparison: 'Comparative analysis of the Original Commercial Office Lease and Proposed First Amendment identifies 15 substantive clause alignments across operational, financial, and risk categories. Key documentary differences include adjustments to basic rent and late fees, extended notice and cure windows, modified early exit terms, transition from court litigation to commercial arbitration, and the elimination of the bare-shell restoration mandate.',
  materialShiftsSummary: [
    'Basic monthly rent increases from $18,500.00 to $22,000.00 (+18.9%).',
    'Late fee drops from 5% to 3% and the grace period extends from 5 to 10 days.',
    'Rent default cure period expands from 10 calendar days to 15 business days.',
    'Non-renewal notice window lengthens from 60 days to 90 days prior to expiration.',
    'Convenience termination eligibility accelerates from month 36 to month 24, with fee reduced from 3 months to 1 month.',
    'Indemnification converts from unilateral tenant defense to bilateral mutual indemnity with mutual waiver of consequential damages.',
    'Dispute resolution forum changes from New York state court litigation to binding AAA commercial arbitration.',
    'Bare-shell concrete restoration requirement is removed in favor of broom-clean surrender.'
  ],
  stats: {
    totalClauses: 15,
    modifiedCount: 10,
    addedCount: 2,
    removedCount: 1,
    unchangedCount: 2,
    needsReviewCount: 1
  },
  items: [
    {
      id: 'cmp-1',
      changeType: 'modified',
      category: 'monetary_amount',
      categoryLabel: 'Changed Monetary Amounts',
      clauseTitle: 'Monthly Basic Rent & Annual Commitment',
      docASummary: 'Basic Rent fixed at $18,500.00 per month ($222,000.00 annually).',
      docATextExcerpt: 'Tenant shall pay to Landlord as Basic Rent the sum of $18,500.00 per month, in advance, on or before the first (1st) day of each calendar month.',
      docACitation: { page: 2, section: 'Section 2.1 Basic Rent', exactQuote: '$18,500.00 per month, in advance, on or before the first (1st) day' },
      docBSummary: 'Basic Rent increased to $22,000.00 per month ($264,000.00 annually).',
      docBTextExcerpt: 'Commencing on the Extension Date, Tenant shall pay to Landlord Basic Rent of $22,000.00 per calendar month, payable on the first day of each month.',
      docBCitation: { page: 2, section: 'Section 2.1 Base Rent Adjustment', exactQuote: 'Basic Rent of $22,000.00 per calendar month' },
      plainEnglishExplanation: 'Monthly base rent increases by $3,500.00 per month ($42,000.00 annually), moving from $18,500.00 to $22,000.00.',
      practicalDifference: 'Increases recurring monthly cash expenditure for the premises by 18.9% starting from the amended term commencement date.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-2',
      changeType: 'modified',
      category: 'monetary_amount',
      categoryLabel: 'Changed Monetary Amounts',
      clauseTitle: 'Late Charge Fee Percentage & Grace Period',
      docASummary: '5% late surcharge assessed on payments received after the 5th calendar day.',
      docATextExcerpt: 'A late charge of five percent (5%) shall apply to any payment received after the fifth (5th) calendar day of the month.',
      docACitation: { page: 2, section: 'Section 2.2 Payment Timing and Late Charges', exactQuote: 'late charge of five percent (5%) shall apply to any payment received after the fifth (5th)' },
      docBSummary: '3% late surcharge assessed on payments received after the 10th calendar day.',
      docBTextExcerpt: 'If Rent is not received by the tenth (10th) calendar day, a late charge equal to three percent (3%) of the delinquent amount shall be assessed.',
      docBCitation: { page: 2, section: 'Section 2.2 Late Fee Modification', exactQuote: 'late charge equal to three percent (3%) of the delinquent amount' },
      plainEnglishExplanation: 'The late payment fee percentage decreases from 5% to 3%, and the fee trigger is pushed from the 5th of the month to the 10th.',
      practicalDifference: 'Provides 5 additional calendar days before delinquency penalties accrue and lowers the financial penalty assessed per late payment incident.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-3',
      changeType: 'modified',
      category: 'deadlines',
      categoryLabel: 'Changed Deadlines',
      clauseTitle: 'Monetary Default Cure Window',
      docASummary: 'Tenant receives 10 calendar days following written notice to cure rent arrears before default remedies attach.',
      docATextExcerpt: 'Failure to pay Rent within ten (10) calendar days after written notice shall constitute an Event of Default.',
      docACitation: { page: 6, section: 'Section 6.3 Events of Default', exactQuote: 'within ten (10) calendar days after written notice shall constitute an Event of Default' },
      docBSummary: 'Tenant receives 15 business days following written notice to cure rent arrears.',
      docBTextExcerpt: 'Tenant shall have fifteen (15) business days after receipt of written notice to cure any failure to remit Basic Rent or Operating Expenses.',
      docBCitation: { page: 5, section: 'Section 5.1 Default and Cure Periods', exactQuote: 'fifteen (15) business days after receipt of written notice to cure' },
      plainEnglishExplanation: 'The cure timeline for overdue rent increases from 10 calendar days to 15 business days following written notice.',
      practicalDifference: 'Substantially expands the remediation window before legal default remedies or lease termination actions can be instituted.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-4',
      changeType: 'modified',
      category: 'notice_periods',
      categoryLabel: 'Changed Notice Periods',
      clauseTitle: 'Advance Non-Renewal Notification Window',
      docASummary: 'Requires written notice of non-renewal at least 60 days prior to term expiration.',
      docATextExcerpt: 'unless either party delivers written notice of non-renewal at least sixty (60) days prior to the expiration of the then-current term.',
      docACitation: { page: 1, section: 'Section 1.2 Term and Renewal', exactQuote: 'written notice of non-renewal at least sixty (60) days prior to the expiration' },
      docBSummary: 'Requires written notice of non-renewal at least 90 days prior to term expiration.',
      docBTextExcerpt: 'Either party may elect not to renew by delivering written non-renewal notice at least ninety (90) days prior to the expiration date.',
      docBCitation: { page: 1, section: 'Section 1.2 Notice Timeline', exactQuote: 'written non-renewal notice at least ninety (90) days prior to the expiration date' },
      plainEnglishExplanation: 'The advance notification deadline for opting out of automatic renewal is lengthened from 60 days to 90 days before expiration.',
      practicalDifference: 'Requires parties to calendar and finalize exit or relocation decisions 30 calendar days earlier than under the original agreement.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-5',
      changeType: 'modified',
      category: 'termination_rights',
      categoryLabel: 'Changed Termination Rights',
      clauseTitle: 'Termination for Convenience Eligibility & Penalty',
      docASummary: 'Permitted after month 36 with 90 days notice and a fee equal to 3 months Basic Rent ($55,500.00).',
      docATextExcerpt: 'Tenant may terminate this Lease for convenience after the thirty-sixth (36th) full calendar month by providing at least ninety (90) days prior written notice and paying an Early Termination Fee equal to three (3) months of Basic Rent.',
      docACitation: { page: 6, section: 'Section 6.1 Termination for Convenience', exactQuote: 'after the thirty-sixth (36th) full calendar month ... fee equal to three (3) months of Basic Rent' },
      docBSummary: 'Permitted after month 24 with 60 days notice and a fee equal to 1 month Basic Rent ($22,000.00).',
      docBTextExcerpt: 'Tenant may exercise convenience termination after twenty-four (24) months upon sixty (60) days notice, subject to an early cancellation fee equal to one (1) month of Basic Rent.',
      docBCitation: { page: 5, section: 'Section 4.1 Early Exit Rights', exactQuote: 'after twenty-four (24) months upon sixty (60) days notice ... fee equal to one (1) month' },
      plainEnglishExplanation: 'Convenience termination becomes exercisable 12 months earlier (month 24 vs 36), required advance notice drops from 90 to 60 days, and the fee drops from 3 months rent to 1 month rent.',
      practicalDifference: 'Accelerates the calendar date when convenience exit is possible and reduces the cash penalty required to exit by $33,500.00.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-6',
      changeType: 'modified',
      category: 'renewal_terms',
      categoryLabel: 'Changed Renewal Terms',
      clauseTitle: 'Subsequent Term Extension Mechanism',
      docASummary: 'Automatic rolling 1-year renewals with no cap on rent increases.',
      docATextExcerpt: 'It shall automatically renew for successive one (1) year periods unless either party delivers written notice of non-renewal.',
      docACitation: { page: 1, section: 'Section 1.2 Term and Renewal', exactQuote: 'automatically renew for successive one (1) year periods' },
      docBSummary: 'One (1) affirmative 3-year extension option based on 95% of prevailing Fair Market Rent.',
      docBTextExcerpt: 'Tenant is granted one (1) option to extend the Term for thirty-six (36) months at ninety-five percent (95%) of the then-prevailing Fair Market Rent, exercisable upon six (6) months notice.',
      docBCitation: { page: 1, section: 'Section 1.3 Extension Option', exactQuote: 'one (1) option to extend the Term for thirty-six (36) months at ninety-five percent (95%) of prevailing Fair Market Rent' },
      plainEnglishExplanation: 'Replaces automatic 1-year annual rollovers with an explicit option to extend for 3 years at 95% of market rent upon 6 months notice.',
      practicalDifference: 'Removes the risk of unintentional automatic rollover and requires an active written election to secure a multi-year term.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-7',
      changeType: 'modified',
      category: 'liability_indemnity',
      categoryLabel: 'Changed Liability & Indemnity',
      clauseTitle: 'Indemnification Reciprocity & Consequential Damages',
      docASummary: 'Unilateral Tenant indemnity benefiting Landlord; Landlord liability capped at building equity interest with no reciprocal indemnity.',
      docATextExcerpt: 'Tenant shall defend, indemnify, and hold harmless Landlord ... Landlord liability under this Lease shall be strictly limited to its equity interest in the Building.',
      docACitation: { page: 4, section: 'Section 4.1 Indemnification and Liability', exactQuote: 'Tenant shall defend, indemnify, and hold harmless Landlord ... strictly limited to its equity interest' },
      docBSummary: 'Mutual indemnification covering gross negligence and willful misconduct; mutual waiver of indirect, special, and consequential damages.',
      docBTextExcerpt: 'Each party shall mutually indemnify, defend, and hold harmless the other ... Neither party shall be liable for indirect, punitive, or consequential damages arising hereunder.',
      docBCitation: { page: 4, section: 'Section 3.1 Mutual Indemnity', exactQuote: 'Each party shall mutually indemnify ... Neither party shall be liable for indirect, punitive, or consequential damages' },
      plainEnglishExplanation: 'Converts a one-way tenant defense obligation into bilateral mutual indemnification and adds a mutual waiver of consequential damages.',
      practicalDifference: 'Both parties assume reciprocal defense burdens for operational faults, and claims for lost business profits or consequential harm are barred for both sides.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-8',
      changeType: 'modified',
      category: 'dispute_resolution',
      categoryLabel: 'Changed Dispute Resolution',
      clauseTitle: 'Dispute Forum & Adjudication Method',
      docASummary: 'State and Federal court litigation located in New York County, New York.',
      docATextExcerpt: 'Any legal action or proceeding arising out of or relating to this Lease shall be instituted exclusively in the state or federal courts located in New York County.',
      docACitation: { page: 8, section: 'Section 8.1 Governing Law and Forum', exactQuote: 'instituted exclusively in the state or federal courts located in New York County' },
      docBSummary: 'Mandatory binding commercial arbitration administered by the American Arbitration Association (AAA) in New York, NY.',
      docBTextExcerpt: 'Any controversy or claim shall be determined by binding arbitration administered by the American Arbitration Association in accordance with its Commercial Arbitration Rules.',
      docBCitation: { page: 7, section: 'Section 6.1 Arbitration Covenant', exactQuote: 'determined by binding arbitration administered by the American Arbitration Association' },
      plainEnglishExplanation: 'Changes the dispute resolution mechanism from public court litigation in New York County to private binding AAA commercial arbitration.',
      practicalDifference: 'Substitutes confidential arbitration proceedings and limited appellate rights for standard judicial litigation in civil court.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-9',
      changeType: 'modified',
      category: 'confidentiality_ip',
      categoryLabel: 'Changed Confidentiality & IP Obligations',
      clauseTitle: 'Confidentiality Scope & Post-Termination Survival',
      docASummary: 'Confidentiality applies only to economic lease terms and expires upon lease termination.',
      docATextExcerpt: 'The financial terms of this Lease shall be maintained in confidence by Tenant during the Term hereof.',
      docACitation: { page: 8, section: 'Section 8.2 Confidentiality', exactQuote: 'financial terms of this Lease shall be maintained in confidence by Tenant during the Term' },
      docBSummary: 'Confidentiality extends to proprietary tenant software, customer data, and survives for three (3) years post-termination.',
      docBTextExcerpt: 'All technical specifications, operational data, and economic terms shall remain strictly confidential and this obligation shall survive for three (3) years following lease expiration.',
      docBCitation: { page: 7, section: 'Section 6.2 Nondisclosure Standards', exactQuote: 'shall remain strictly confidential and this obligation shall survive for three (3) years' },
      plainEnglishExplanation: 'Broadens non-disclosure scope to include technical data and extends confidentiality obligations for 3 years beyond lease termination.',
      practicalDifference: 'Maintains ongoing nondisclosure compliance obligations and potential breach exposure well past physical vacation of the property.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-10',
      changeType: 'added',
      category: 'general_terms',
      categoryLabel: 'Added Clause',
      clauseTitle: 'Green Building ESG & Energy Submetering Covenant',
      docASummary: 'No sustainability reporting or energy submetering obligations existed in Document A.',
      docATextExcerpt: 'Not present in Document A.',
      docACitation: { page: 5, section: 'Section 5 (No ESG Provision)' },
      docBSummary: 'Tenant must log monthly kilowatt usage, adhere to LEED Gold conservation protocols, and grant sensor access.',
      docBTextExcerpt: 'Tenant shall record and report monthly utility consumption, comply with Building LEED Gold conservation guidelines, and permit Landlord to install submetering monitoring equipment.',
      docBCitation: { page: 5, section: 'Section 5.4 Sustainability and Energy Reporting', exactQuote: 'record and report monthly utility consumption, comply with Building LEED Gold conservation guidelines' },
      plainEnglishExplanation: 'A new section added in Document B obligating the tenant to measure monthly energy usage and comply with building green standards.',
      practicalDifference: 'Introduces recurring operational reporting tasks and requires granting landlord access for submeter installation.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-11',
      changeType: 'added',
      category: 'general_terms',
      categoryLabel: 'Added Clause',
      clauseTitle: 'Permitted Corporate Affiliate Subleasing Safe Harbor',
      docASummary: 'Document A prohibited any assignment or sublease without Landlord prior written consent and fee.',
      docATextExcerpt: 'Tenant shall not assign this Lease or sublet the Premises without the prior written consent of Landlord in each instance.',
      docACitation: { page: 5, section: 'Section 5.2 Assignment and Subletting', exactQuote: 'without the prior written consent of Landlord in each instance' },
      docBSummary: 'Tenant may assign or sublet without Landlord consent to parent companies, subsidiaries, or corporate acquirers.',
      docBTextExcerpt: 'Tenant may assign this Lease or sublet the Premises without Landlord prior consent to any Affiliate, parent company, or entity resulting from merger or asset acquisition.',
      docBCitation: { page: 6, section: 'Section 4.3 Permitted Transfers', exactQuote: 'without Landlord prior consent to any Affiliate, parent company, or entity resulting from merger' },
      plainEnglishExplanation: 'A new provision added in Document B establishing an exception allowing affiliate transfers and reorganizations without Landlord consent.',
      practicalDifference: 'Enables corporate restructurings, mergers, and internal subsidiary assignments without requiring landlord approval or payment of consent review fees.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-12',
      changeType: 'removed',
      category: 'general_terms',
      categoryLabel: 'Removed Clause',
      clauseTitle: 'Bare-Shell Demolition & Restoration Mandate',
      docASummary: 'Mandated tenant remove all walls, cabling, and floor finishes down to bare concrete within 14 days of surrender at tenant cost.',
      docATextExcerpt: 'Tenant shall, prior to the Expiration Date, remove all interior alterations, partitions, and telecommunication cabling, restoring the Premises to a raw, bare-shell concrete condition.',
      docACitation: { page: 7, section: 'Section 7.1 Surrender and Restoration', exactQuote: 'restoring the Premises to a raw, bare-shell concrete condition' },
      docBSummary: 'Removed from Document B; replaced with standard broom-clean surrender with existing office improvements retained.',
      docBTextExcerpt: 'Surrender in broom-clean condition with all existing partitions, fixtures, and cabling surrendered in place.',
      docBCitation: { page: 6, section: 'Section 5.2 Surrender Condition', exactQuote: 'broom-clean condition with all existing partitions, fixtures, and cabling surrendered in place' },
      plainEnglishExplanation: 'The requirement to demolish internal walls and restore the suite to bare concrete has been eliminated in Document B.',
      practicalDifference: 'Removes the physical demolition obligation upon move-out; improvements may remain in place without demolition expense.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-13',
      changeType: 'unchanged',
      category: 'general_terms',
      categoryLabel: 'Unchanged Important Clause',
      clauseTitle: 'Security Deposit Sum & Segregated Escrow',
      docASummary: 'Security Deposit remains fixed at $55,500.00 in a segregated non-interest bearing account.',
      docATextExcerpt: 'Tenant has deposited with Landlord the sum of $55,500.00 as security for the faithful performance by Tenant of all terms of this Lease.',
      docACitation: { page: 3, section: 'Section 3.1 Security Deposit', exactQuote: 'deposited with Landlord the sum of $55,500.00 as security' },
      docBSummary: 'Security Deposit continues at $55,500.00 without increase.',
      docBTextExcerpt: 'The Security Deposit currently held by Landlord in the amount of $55,500.00 shall continue to be held pursuant to the Lease.',
      docBCitation: { page: 3, section: 'Section 2.3 Existing Security Deposit', exactQuote: 'held by Landlord in the amount of $55,500.00 shall continue to be held' },
      plainEnglishExplanation: 'The security deposit amount of $55,500.00 is carried forward without change.',
      practicalDifference: 'Neither party is required to inject additional deposit funds or remit a return of capital upon execution.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-14',
      changeType: 'unchanged',
      category: 'general_terms',
      categoryLabel: 'Unchanged Important Clause',
      clauseTitle: 'Interior Dedicated Mechanical Maintenance Burden',
      docASummary: 'Tenant remains responsible for routine upkeep and repair of dedicated interior HVAC units and plumbing.',
      docATextExcerpt: 'Tenant shall, at Tenant\'s sole expense, keep the Premises, interior fixtures, and dedicated mechanical and HVAC systems in good order, condition, and repair.',
      docACitation: { page: 5, section: 'Section 5.3 Maintenance and Repairs', exactQuote: 'keep the Premises, interior fixtures, and dedicated mechanical and HVAC systems in good order' },
      docBSummary: 'Tenant continues routine repair obligations for interior systems.',
      docBTextExcerpt: 'Tenant maintenance obligations under Section 5.3 of the Original Lease remain in full force and effect.',
      docBCitation: { page: 4, section: 'Section 3.4 Operational Upkeep', exactQuote: 'obligations under Section 5.3 of the Original Lease remain in full force and effect' },
      plainEnglishExplanation: 'The operational division of maintenance responsibility for interior dedicated systems is unchanged.',
      practicalDifference: 'Day-to-day servicing costs for dedicated internal units remain allocated to the occupant.',
      matchConfidence: 'high'
    },
    {
      id: 'cmp-15',
      changeType: 'modified',
      category: 'liability_indemnity',
      categoryLabel: 'Changed Liability & Indemnity',
      clauseTitle: 'Consolidated Environmental and Casualty Obligations',
      docASummary: 'Document A contained separate clauses for hazardous substances (Section 5.5) and fire/casualty restoration (Section 6.4).',
      docATextExcerpt: 'Section 5.5 Hazardous Materials: Tenant shall not generate or discharge toxic substances ... Section 6.4 Casualty: If damage exceeds 50%, Landlord may terminate.',
      docACitation: { page: 5, section: 'Section 5.5 & Section 6.4', exactQuote: 'Tenant shall not generate or discharge toxic substances' },
      docBSummary: 'Document B combines casualty restoration and environmental liability into a single unified covenant with altered phrasing.',
      docBTextExcerpt: 'Section 4.4 Comprehensive Environmental and Physical Casualty: In the event of environmental incident or casualty damage, restoration obligations shall be prorated according to fault.',
      docBCitation: { page: 4, section: 'Section 4.4 Comprehensive Environmental and Physical Casualty', exactQuote: 'restoration obligations shall be prorated according to fault' },
      plainEnglishExplanation: 'Document B merges two previously separate topics (hazardous chemicals and building fire/casualty repair) into a single restructured clause.',
      practicalDifference: 'Because casualty and environmental rules have been consolidated, determining how cleanup costs and rebuilding timelines interact requires detailed cross-sectional review.',
      matchConfidence: 'needs_review',
      needsReviewReason: 'Uncertain match: Document B merges two previously distinct operational articles (toxic substances and structural casualty destruction) into a unified provision with altered legal syntax.'
    }
  ],
  alignments: [
    {
      category: 'Restoration & Surrender',
      clauseTitle: 'End of Term Condition',
      doc1Summary: 'Original Lease Section 7.1: Landlord could force complete removal of cabling and partitions to bare concrete within 14 days at Tenant cost.',
      doc1Citation: { page: 7, section: 'Section 7.1' },
      doc2Summary: 'Amendment Section 5.2: Bare-shell demolition deleted. Premises surrendered broom-clean with cabling and partitions retained.',
      doc2Citation: { page: 6, section: 'Section 5.2' },
      semanticDifference: 'Removal of bare-shell demolition mandate, permitting broom-clean surrender.',
      explanation: 'Tenant is not required to expend capital or labor tearing out non-structural walls and office cabling upon lease expiration.'
    }
  ]
};

export const SAMPLE_LAWYER_QUESTIONS: LawyerQuestion[] = [
  {
    id: 'q-1',
    category: 'Liability & Risk',
    question: 'Can we strike the phrase "and all consequential damages" from the holdover clause (Section 7.2) or negotiate a 30-day cure buffer?',
    context: 'The document states Tenant is liable for all consequential damages incurred by Landlord if incoming tenants delay occupancy, which could exceed millions of dollars.',
    citation: { page: 7, section: 'Section 7.2' },
    priority: 'essential',
    isAnswered: false,
    userNotes: 'Prioritize this in first round of redlines.'
  },
  {
    id: 'q-2',
    category: 'Operational & Compliance',
    question: 'How can we amend Section 4.3 so that standard office cabling and partition walls can remain in place without bare-shell restoration?',
    context: 'Section 4.3 gives Landlord sole discretion to force full decommissioning down to bare concrete within 14 days, creating immense demolition expense.',
    citation: { page: 4, section: 'Section 4.3' },
    priority: 'essential',
    isAnswered: false
  },
  {
    id: 'q-3',
    category: 'Financial & Fees',
    question: 'What is the standard market cap on Controllable Operating Expenses in Midtown/Downtown Manhattan commercial leases for 2026?',
    context: 'Section 2.2 currently leaves operating expenses uncapped and gives Landlord an 18-month retroactive adjustment period.',
    citation: { page: 2, section: 'Section 2.2' },
    priority: 'recommended',
    isAnswered: false
  },
  {
    id: 'q-4',
    category: 'Liability & Risk',
    question: 'Should we insist on reciprocal indemnification from the Landlord for claims arising from Landlord\'s negligence in common areas?',
    context: 'Section 6.1 currently creates a one-sided indemnity benefiting only Landlord and caps Landlord\'s liability to its equity interest in the building.',
    citation: { page: 6, section: 'Section 6.1' },
    priority: 'recommended',
    isAnswered: false
  },
  {
    id: 'q-5',
    category: 'Operational & Compliance',
    question: 'Can we add an express "Permitted Transfer" carveout to Section 3.2 for venture financings, mergers, and internal reorganizations?',
    context: 'Section 3.2 allows Landlord to demand two additional months of cash deposit ($77.9k) upon any change of control or rating change.',
    citation: { page: 3, section: 'Section 3.2' },
    priority: 'essential',
    isAnswered: false
  }
];
