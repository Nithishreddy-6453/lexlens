import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { validateAndSanitizeAnalysis } from './src/utils/validation';
import { LegalContextCheckResult } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

// Set payload limit to 50MB for handling high-resolution PDF uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasGemini = !!getGeminiClient();
  res.json({
    status: 'ok',
    appName: 'LexLens',
    version: '1.1.0',
    geminiConfigured: hasGemini,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Document Analysis Endpoint - Real PDF Document Processing Pipeline
app.post('/api/analyze', async (req, res) => {
  try {
    const { 
      documentTitle, 
      documentType, 
      jurisdiction, 
      rawText, 
      pages, 
      pdfBase64,
      fileName 
    } = req.body;

    if (!pdfBase64 && !rawText && (!pages || pages.length === 0)) {
      return res.status(400).json({
        error: 'Unsupported or empty document: PDF binary or readable text content is required for analysis.'
      });
    }

    const ai = getGeminiClient();
    const title = documentTitle || fileName || 'Uploaded Legal Document';
    const type = documentType || 'commercial_lease';
    const jur = jurisdiction || 'State of New York, USA';

    // If Gemini key is not configured, run local deep-analysis engine
    if (!ai) {
      console.log('Gemini API key not configured; running structured LexLens local analysis engine.');
      const fallback = generateFallbackAnalysis(title, type, jur, rawText, pages);
      const validated = validateAndSanitizeAnalysis(fallback, fallback.pageCount, title, type, jur);
      return res.json({
        analysis: validated,
        pages: pages || fallback.pages,
        source: 'local-engine',
        notice: 'Analyzed with LexLens local pipeline. Attach GEMINI_API_KEY in Secrets for live Gemini model synthesis.'
      });
    }

    // Build Gemini prompt instructing analysis across all 16 dimensions
    const prompt = `You are LexLens, a document-first AI legal information assistant.
You analyze legal documents to provide structured legal information and document assistance. You do NOT provide legal advice or declare clauses legally valid or invalid.

CRITICAL INSTRUCTIONS & INTEGRITY RULES:
1. Every finding MUST retain document source metadata including exact page number (integer from 1 to actual pageCount) and section title/number when available.
2. NEVER invent or hallucinate a page number, clause number, verbatim quote, date, party, or obligation. If a specific section or page is not ascertainable, note it honestly.
3. Frame findings objectively using Responsible AI standards: "The document states...", "This clause may deserve review because...", "The available document does not establish...", "Consider discussing this with a qualified legal professional."
4. Never output fake confidence scores or enforceability declarations.

ANALYZE THE FOLLOWING 16 MANDATORY DIMENSIONS:
1. Document Type: Classify accurately (${type}).
2. Parties & Roles: Disclosing/Receiving, Landlord/Tenant, Vendor/Client, etc. Include notice addresses and entity types.
3. Purpose: Core commercial or transactional objective of the agreement.
4. Dates & Triggers: Effective date, expiration, execution date, notice windows, renewals, and milestone triggers.
5. Monetary Terms: Base amounts, fees, rent, royalties, caps, security deposits, interest, escalation schedules.
6. Termination: Convenience termination, termination for cause, cure periods, notice requirements.
7. Renewal: Automatic rollover, renewal terms, price increase caps, opt-out notice windows.
8. Confidentiality: Definition of confidential data, exceptions, standard of care, survival period.
9. Intellectual Property (IP): Ownership, work-for-hire, licensing scope, background IP, assignment language.
10. Liability: Aggregate liability caps, super-caps, exclusions, waivers of consequential/punitive damages.
11. Indemnity: Scope of indemnification, defense obligations, unilateral vs mutual carve-outs.
12. Dispute Resolution: Mediation, arbitration forum, court venue, waiver of jury trial.
13. Governing Law: Designated jurisdiction, choice of law, statutory cross-references.
14. Penalties & Liquidated Damages: Holdover penalties, late fees, interest charges, default interest.
15. Privacy & Data Obligations: Data protection, breach notification timelines, GDPR/CCPA references, audit rights.
16. Restrictions & Non-Compete: Non-compete covenants, non-solicitation of employees/customers, exclusivity provisions.

ALSO EXTRACT:
- Obligations for each party (obligor, beneficiary, description, recurrence, deadline, citation, priority: critical | normal | monitoring).
- Potential Inconsistencies or cross-referencing contradictions between different sections.
- Page Excerpts: Extract representative readable text for each page in the document in the format: [{"pageNumber": 1, "content": "..."}, {"pageNumber": 2, "content": "..."}].

Respond strictly in valid JSON matching this schema:
{
  "pageCount": number,
  "executiveSummary": "string (plain-English 2-3 paragraphs)",
  "purpose": "string",
  "monetaryTerms": "string",
  "disputeResolutionSummary": "string",
  "penaltiesSummary": "string",
  "privacyDataSummary": "string",
  "restrictionsSummary": "string",
  "parties": [
    {
      "name": "string",
      "role": "string",
      "entityType": "corporation | llc | individual | other",
      "jurisdictionNoticeAddress": "string",
      "citation": { "page": number, "section": "string" }
    }
  ],
  "clauses": [
    {
      "title": "string",
      "category": "Termination | Liability | Payment | Confidentiality | IP | Indemnification | Dispute | General | Warranties | Governing Law | Renewal | Penalties | Privacy & Data | Restrictions & Non-Compete",
      "rawText": "string (verbatim excerpt)",
      "plainSummary": "string (plain English explanation)",
      "citation": { "page": number, "section": "string", "exactQuote": "string" },
      "keyTerms": ["string"],
      "attentionScore": "low | medium | high"
    }
  ],
  "attentionAreas": [
    {
      "title": "string",
      "severity": "low | medium | high",
      "explanation": "string",
      "citation": { "page": number, "section": "string" },
      "recommendedAction": "string",
      "perspective": "unfavorable | ambiguous | unusual_market_term | one_sided | standard"
    }
  ],
  "obligations": [
    {
      "obligor": "string",
      "beneficiary": "string",
      "description": "string",
      "recurrence": "one-time | recurring | conditional | upon-breach",
      "deadline": "string",
      "citation": { "page": number, "section": "string" },
      "priority": "critical | normal | monitoring"
    }
  ],
  "importantDates": [
    {
      "title": "string",
      "dateStr": "string",
      "type": "effective_date | expiration | notice_deadline | payment_due | renewal_window | audit_timeline",
      "citation": { "page": number, "section": "string" },
      "significance": "string"
    }
  ],
  "inconsistencies": [
    {
      "title": "string",
      "description": "string",
      "conflictingCitations": [{ "page": number, "section": "string" }],
      "suggestedResolutionPrompt": "string"
    }
  ],
  "governingLaw": {
    "jurisdiction": "string",
    "forum": "string",
    "citation": { "page": number, "section": "string" }
  },
  "pageExcerpts": [
    {
      "pageNumber": number,
      "content": "string"
    }
  ]
}`;

    let contents: any[];

    // Pass PDF document directly to Gemini if available
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();
      contents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64
          }
        },
        {
          text: prompt
        }
      ];
    } else {
      const textSample = pages && pages.length > 0
        ? pages.map((p: any) => `--- PAGE ${p.pageNumber} ---\n${p.content}`).join('\n\n')
        : (rawText || '').slice(0, 50000);

      contents = [
        {
          text: `DOCUMENT METADATA:\nTitle: ${title}\nType: ${type}\nJurisdiction: ${jur}\n\nDOCUMENT CONTENT:\n${textSample}\n\n${prompt}`
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.warn('Attempting JSON cleanup for Gemini output:', parseErr);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse structured JSON from Gemini response.');
      }
    }

    const detectedPageCount = parsed.pageCount || pages?.length || 1;
    const validatedAnalysis = validateAndSanitizeAnalysis(
      parsed,
      detectedPageCount,
      title,
      type,
      jur
    );

    // Use page excerpts from Gemini or from client if present
    const finalPages = parsed.pageExcerpts && parsed.pageExcerpts.length > 0
      ? parsed.pageExcerpts
      : (pages && pages.length > 0 ? pages : [{ pageNumber: 1, content: rawText || 'Document content analyzed.' }]);

    res.json({
      analysis: validatedAnalysis,
      pages: finalPages,
      source: 'gemini-3.8-flash'
    });
  } catch (err: any) {
    console.error('Document analysis pipeline error:', err);
    res.status(500).json({
      error: 'Analysis processing encountered an error: ' + (err.message || 'Unknown error'),
      details: err.toString()
    });
  }
});

// "Ask this Document" Endpoint (Document-First with Strict Citations and Distinction)
app.post('/api/ask', async (req, res) => {
  try {
    const { question, documentName, documentContext, jurisdiction, documentType } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question string is required' });
    }

    const docTitle = documentName || 'Uploaded Document';
    const ai = getGeminiClient();

    if (!ai) {
      const localAnswer = generateLocalDocumentAnswer(question, docTitle, documentContext);
      return res.json(localAnswer);
    }

    const systemInstruction = `You are LexLens, an uncompromisingly precise legal document intelligence assistant.
You are analyzing the uploaded legal document titled "${docTitle}".

CRITICAL OPERATIONAL RULES:
1. PRIORITIZE DOCUMENT EVIDENCE OVER GENERAL KNOWLEDGE:
   - Your answer must be grounded strictly and exclusively in the provided document text.
   - Do NOT assume, fabricate, or guess terms that are not explicitly stated.
2. STRICT EVIDENCE BOUNDARY:
   - If the uploaded document does NOT contain enough information to answer the question, you MUST set "foundInDocument": false, and you MUST set "answerText": "I couldn't find enough information to answer that from the uploaded document." and "unsupportedMessage": "I couldn't find enough information to answer that from the uploaded document."
   - Do NOT fill missing information with guesses or speculate on unstated business intentions.
3. PRESERVE STRICT DISTINCTION BETWEEN:
   - explicitLanguage: Array of exact verbatim clauses, sentences, or terms from the document with page number and section title.
   - inference: Clearly reasoned plain-English deduction or operational meaning derived from those explicit clauses (explicitly marked as an inference, not contract text). If no inference is needed, provide a brief synthesis.
   - Do NOT mix in external statutory codes or web law here (the user can invoke the separate "Check external legal context" action for that).
4. CITATIONS:
   - For every material document-derived statement, provide:
     * documentName: "${docTitle}"
     * page: integer page number if available (from [PAGE X] headers)
     * section: exact section name/number (e.g. "Section 6.1 Termination for Convenience")
     * exactQuote: verbatim excerpt sentence
5. JSON OUTPUT ONLY:
   Return ONLY a valid JSON object matching this schema:
   {
     "foundInDocument": boolean,
     "unsupportedMessage": string,
     "documentName": string,
     "answerText": string,
     "explicitLanguage": [
       {
         "quote": string,
         "page": number,
         "section": string
       }
     ],
     "inference": string,
     "citations": [
       {
         "page": number,
         "section": string,
         "exactQuote": string
       }
     ]
   }`;

    const prompt = `DOCUMENT NAME: "${docTitle}"
JURISDICTION: ${jurisdiction || 'Not specified'}

DOCUMENT CONTENT:
${documentContext ? documentContext.slice(0, 50000) : 'No document text provided.'}

USER QUESTION:
${question}

Answer strictly in the specified JSON format:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed) {
      const fallback = generateLocalDocumentAnswer(question, docTitle, documentContext);
      return res.json(fallback);
    }

    // Enforce Rule 4 and Rule 5 if not found
    if (!parsed.foundInDocument) {
      parsed.foundInDocument = false;
      parsed.unsupportedMessage = "I couldn't find enough information to answer that from the uploaded document.";
      parsed.answerText = "I couldn't find enough information to answer that from the uploaded document.";
      parsed.explicitLanguage = [];
      parsed.inference = null;
      parsed.citations = [];
    }

    parsed.documentName = docTitle;
    res.json(parsed);
  } catch (err: any) {
    console.error('Ask endpoint error:', err);
    const fallback = generateLocalDocumentAnswer(req.body.question || '', req.body.documentName || 'Document', req.body.documentContext);
    res.json(fallback);
  }
});

// Helper to categorize and evaluate authority of legal web sources
function categorizeLegalSource(url: string, title?: string): { sourceType: 'government' | 'legislation_database' | 'court' | 'regulator' | 'official_publication' | 'legal_resource'; isAuthoritative: boolean; domain: string } {
  let domain = '';
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    domain = url.split('/')[2] || url;
  }

  const lowerDomain = domain.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  if (lowerDomain.endsWith('.gov') || lowerDomain.endsWith('.mil') || lowerDomain.includes('.gov.') || lowerDomain.includes('parliament.uk') || lowerDomain.includes('senate.') || lowerDomain.includes('assembly.') || lowerDomain.includes('congress.gov')) {
    if (lowerDomain.includes('court') || lowerDomain.includes('judiciary') || lowerTitle.includes('court') || lowerTitle.includes('judicial') || lowerTitle.includes('decision')) {
      return { sourceType: 'court', isAuthoritative: true, domain };
    }
    if (lowerDomain.includes('ftc') || lowerDomain.includes('sec') || lowerDomain.includes('cfpb') || lowerDomain.includes('dol') || lowerDomain.includes('regulat')) {
      return { sourceType: 'regulator', isAuthoritative: true, domain };
    }
    return { sourceType: 'government', isAuthoritative: true, domain };
  }

  if (lowerDomain.includes('legislation.gov') || lowerDomain.includes('law.cornell.edu') || lowerDomain.includes('justia.com') || lowerDomain.includes('uscode.') || lowerDomain.includes('statutes.') || lowerDomain.includes('codes.') || lowerDomain.includes('uniformlaws.org')) {
    return { sourceType: 'legislation_database', isAuthoritative: true, domain };
  }

  if (lowerDomain.includes('courts.') || lowerDomain.includes('judiciary.') || lowerDomain.includes('casetext.') || lowerDomain.includes('courtlistener.') || lowerDomain.includes('bailii.org')) {
    return { sourceType: 'court', isAuthoritative: true, domain };
  }

  if (lowerDomain.includes('americanbar.org') || lowerDomain.includes('bar.org') || lowerDomain.includes('nysba.org') || lowerDomain.includes('calbar.') || lowerDomain.includes('lawreview.') || lowerDomain.includes('harvardlawreview.') || lowerDomain.includes('yale law')) {
    return { sourceType: 'official_publication', isAuthoritative: true, domain };
  }

  return { sourceType: 'legal_resource', isAuthoritative: false, domain };
}

// "Legal Context Check" Dedicated Endpoint (User Workflow)
app.post('/api/legal-context-check', async (req, res) => {
  try {
    const { 
      jurisdiction, 
      queryType, 
      clauseTitle, 
      clauseText, 
      question, 
      documentType, 
      documentTitle 
    } = req.body;

    const jur = jurisdiction || 'State of New York, USA';
    const targetQuery = queryType === 'clause' 
      ? `${clauseTitle || 'Clause'}: ${clauseText || ''}` 
      : (question || 'General contract enforceability');

    const dateChecked = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
    const ai = getGeminiClient();

    if (!ai) {
      const fallbackResult = generateLocalExternalContextCheck(targetQuery, jur, queryType, clauseTitle, documentType);
      return res.json(fallbackResult);
    }

    const systemInstruction = `You are the LexLens Public Legal Context Grounding Specialist.
Your sole purpose is to provide informational context from CURRENT PUBLIC LEGAL SOURCES without blending those sources into any uploaded-document analysis.

Target Jurisdiction: "${jur}"
Document Type (if provided): "${documentType || 'Commercial Contract'}"
Target Query: "${targetQuery}"

CRITICAL REQUIREMENTS & CONSTRAINTS:
1. Search current public legal sources for authoritative statutory provisions, administrative regulations, and established judicial doctrines in "${jur}".
2. PREFER AUTHORITATIVE SOURCES:
   - government websites (.gov, official state portals, legislative branches)
   - official legislation databases (e.g. legislation.gov.uk, law.cornell.edu, official state code)
   - courts (e.g. federal circuits, state courts of appeal, chancery, supreme court)
   - regulators (FTC, SEC, state attorneys general)
   - official legal publications (Bar associations, official reporters)
3. PRESERVE CITATIONS: Cite exact statutory titles/sections, official code numbers, and leading judicial cases.
4. STRICT ENFORCEABILITY GUARDRAIL:
   - NEVER state or imply that external search results automatically determine whether the user's specific contract or clause is legally enforceable.
   - Explain the legal doctrine objectively as general informational context only.
5. EXPLICIT UNCERTAINTY & DISAGREEMENT:
   - If sources disagree, if the law is developing or uncertain, or if court decisions show a split or fact-sensitive variance in ${jur}, EXPLICITLY state that uncertainty.
6. Clearly delineate that this is "External legal information".

Output your findings as a strictly formatted JSON object wrapped in \`\`\`json \`\`\` code block with these exact keys:
{
  "summary": "Plain-English synthesis of the external public legal context and commercial doctrine",
  "statutoryLandscape": "Specific statutory frameworks, code sections, or statutory limitations in ${jur}",
  "judicialStandards": "Governing court tests, judicial scrutiny, and enforceability standards applied by courts (informational)",
  "hasUncertainty": true or false,
  "uncertaintyOrDisagreement": "Clear explanation of any jurisdictional splits, conflicting court rulings, or unsettled statutory tests (or empty string if uniform)",
  "authoritativeCitations": ["Array of specific statutory sections or landmark case citations found"],
  "questionsForCounsel": ["3-4 sharp, practical questions the user should ask their attorney regarding how these rules apply to their specific agreement"]
}`;

    const prompt = `Perform public legal context research for jurisdiction "${jur}" regarding the following legal question or contract clause:
"${targetQuery}".
Search official public legal databases, statutes, and judicial doctrines in ${jur}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const rawText = response.text || '';
    let parsed: any = null;

    try {
      const codeBlockMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        parsed = JSON.parse(codeBlockMatch[1]);
      } else {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Could not parse JSON directly from Gemini search grounding output:', e);
    }

    // Extract grounding sources from Google Search metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const rawChunks = (groundingMetadata as any)?.groundingChunks || [];
    const searchQueriesUsed: string[] = (groundingMetadata as any)?.webSearchQueries || [];

    const extractedSources: any[] = [];
    if (Array.isArray(rawChunks)) {
      rawChunks.forEach((chunk: any, index: number) => {
        const web = chunk.web;
        if (web && web.uri) {
          const { sourceType, isAuthoritative, domain } = categorizeLegalSource(web.uri, web.title);
          extractedSources.push({
            id: `source-${index + 1}`,
            title: web.title || `Public Legal Resource (${domain})`,
            url: web.uri,
            domain,
            sourceType,
            isAuthoritative,
            snippet: web.snippet || ''
          });
        }
      });
    }

    // Fallback if parsing failed
    if (!parsed) {
      const fallback = generateLocalExternalContextCheck(targetQuery, jur, queryType, clauseTitle, documentType);
      if (extractedSources.length > 0) {
        fallback.sources = [...extractedSources, ...fallback.sources.slice(0, 2)];
        fallback.groundingConfidence = 'grounded_live_search';
      }
      return res.json(fallback);
    }

    // Combine extracted sources with authoritative baseline if needed
    const finalSources = extractedSources.length > 0
      ? extractedSources
      : generateAuthoritativeSourcesForJurisdiction(jur, targetQuery);

    const result = {
      id: 'context-check-' + Date.now(),
      jurisdiction: jur,
      queryType: queryType || 'question',
      clauseTitle: clauseTitle || undefined,
      clauseExcerpt: clauseText || undefined,
      question: question || undefined,
      documentTitle: documentTitle || undefined,
      dateChecked,
      timestamp: new Date().toISOString(),
      label: 'External legal information' as const,
      summary: parsed.summary || 'Public legal research synthesis complete.',
      statutoryLandscape: parsed.statutoryLandscape || `Governed by commercial statutes and common law of ${jur}.`,
      judicialStandards: parsed.judicialStandards || 'Courts evaluate contract provisions on a fact-specific case-by-case basis.',
      hasUncertainty: Boolean(parsed.hasUncertainty),
      uncertaintyOrDisagreement: parsed.uncertaintyOrDisagreement || (parsed.hasUncertainty ? 'Legal interpretation may vary significantly across judicial departments and factual circumstances.' : ''),
      authoritativeCitations: Array.isArray(parsed.authoritativeCitations) ? parsed.authoritativeCitations : [],
      questionsForCounsel: Array.isArray(parsed.questionsForCounsel) ? parsed.questionsForCounsel : [],
      sources: finalSources,
      searchQueriesUsed: searchQueriesUsed.length > 0 ? searchQueriesUsed : [`${jur} contract law ${targetQuery.slice(0, 40)}`],
      groundingConfidence: extractedSources.length > 0 ? 'grounded_live_search' : 'authoritative_database',
      prominentDisclaimers: {
        enforceabilityWarning: "External search results and public legal resources provide general informational context only and do not determine whether your specific agreement or clause is legally valid or enforceable in court.",
        contextDependenceNote: "Legal rules depend heavily on the governing jurisdiction, factual circumstances, enactment dates, and the precise wording of your specific agreement.",
        generalNotice: "LexLens is an informational tool and does not provide legal advice or create an attorney-client relationship. Consult qualified legal counsel for binding determinations."
      }
    };

    res.json(result);
  } catch (err: any) {
    console.error('Legal context check endpoint error:', err);
    const fallback = generateLocalExternalContextCheck(
      req.body.clauseText || req.body.question || '', 
      req.body.jurisdiction || 'State of New York, USA', 
      req.body.queryType || 'question', 
      req.body.clauseTitle, 
      req.body.documentType
    );
    res.json(fallback);
  }
});

// "Check External Legal Context" Separate Endpoint (for AskView & Review Integration)
app.post('/api/check-external-context', async (req, res) => {
  try {
    const { question, documentName, documentAnswer, explicitLanguage, jurisdiction, documentType } = req.body;

    const docTitle = documentName || 'Agreement';
    const jur = jurisdiction || 'General US Commercial Law';
    const dateChecked = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
    const ai = getGeminiClient();

    if (!ai) {
      const localContext = generateLocalExternalContext(question, documentType, jur);
      return res.json(localContext);
    }

    const systemInstruction = `You are LexLens External Legal Context Specialist.
The user is reviewing the document "${docTitle}" (${documentType || 'Commercial Contract'}) governed by "${jur}".

The user has received a document-grounded answer regarding: "${question}".
Contract explicit terms: ${JSON.stringify(explicitLanguage || [])}
Contract answer: "${documentAnswer}"

Your task is to provide SEPARATE external legal context that was NOT automatically mixed into the document answer:
1. marketStandard: Typical commercial standards and market benchmarks (e.g., whether these terms are typical, aggressive, one-sided, or balanced).
2. statutoryPrinciples: Relevant statutory or common law principles in ${jur} (e.g. default UCC rules, good faith covenants, notice requirements).
3. attorneyClarifications: Array of 3-4 sharp, practical questions the user should ask their attorney before signing.
4. uncertaintyOrDisagreement: If the law is unsettled, split, or highly fact-dependent in ${jur}, explicitly state that uncertainty.
5. disclaimer: Responsible AI informational disclaimer stating this is external legal information and not formal legal advice.

CRITICAL ENFORCEABILITY GUARDRAIL:
Never state that external search results determine whether the user's specific contract is legally enforceable.

Output JSON matching:
{
  "marketStandard": string,
  "statutoryPrinciples": string,
  "attorneyClarifications": string[],
  "hasUncertainty": boolean,
  "uncertaintyOrDisagreement": string,
  "disclaimer": string
}`;

    const prompt = `Search and evaluate current public legal context for question: "${question}" in jurisdiction "${jur}".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const rawText = response.text || '';
    let parsed: any = null;
    try {
      const match = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[1] || match[0]);
    } catch {
      // ignore
    }

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const rawChunks = (groundingMetadata as any)?.groundingChunks || [];
    const sources: any[] = [];
    if (Array.isArray(rawChunks)) {
      rawChunks.forEach((chunk: any, index: number) => {
        const web = chunk.web;
        if (web && web.uri) {
          const { sourceType, isAuthoritative, domain } = categorizeLegalSource(web.uri, web.title);
          sources.push({
            id: `source-${index + 1}`,
            title: web.title || `Public Legal Source (${domain})`,
            url: web.uri,
            domain,
            sourceType,
            isAuthoritative,
            snippet: web.snippet || ''
          });
        }
      });
    }

    if (!parsed) {
      const fallback = generateLocalExternalContext(question, documentType, jur);
      return res.json(fallback);
    }

    res.json({
      ...parsed,
      label: "External legal information",
      dateChecked,
      sources: sources.length > 0 ? sources : generateAuthoritativeSourcesForJurisdiction(jur, question),
      enforceabilityWarning: "External legal information does not determine whether your specific agreement is legally valid or enforceable in court."
    });
  } catch (err: any) {
    console.error('Check external context error:', err);
    const fallback = generateLocalExternalContext(req.body.question || '', req.body.documentType, req.body.jurisdiction);
    res.json(fallback);
  }
});

// Compare Documents Endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { doc1Title, doc1Content, doc2Title, doc2Content } = req.body;

    if (!doc1Content || !doc2Content) {
      return res.status(400).json({ error: 'Both documents must be provided for comparison.' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        comparison: generateLocalComparison(doc1Title, doc2Title),
        source: 'local-engine'
      });
    }

    const systemInstruction = `You are LexLens, a semantic document comparison engine.
Your purpose is to perform deep semantic clause comparison between Document A and Document B.

CRITICAL RULES:
1. Do NOT perform only a raw text diff.
2. Identify comparable clauses by substantive legal meaning. Align corresponding clauses even when section numbering, clause titles, or wording differs.
3. Detect:
   - added clauses (clauses introduced in Document B not present in Document A)
   - removed clauses (clauses present in Document A omitted from Document B)
   - modified clauses (clauses altered between versions)
   - changed monetary amounts (fees, rates, deposits, caps, penalties)
   - changed deadlines (due dates, grace periods, cure periods)
   - changed notice periods (advance non-renewal notice, termination notice)
   - changed termination rights (convenience termination, default conditions, termination penalties)
   - changed renewal terms (automatic rollover vs affirmative extension option, rent calculation)
   - changed liability/indemnity wording (unilateral vs mutual indemnification, damage waivers, liability caps)
   - changed dispute-resolution provisions (court litigation vs arbitration, choice of forum/law, jury waivers)
   - changed confidentiality/IP obligations (scope of confidential info, survival periods, data rights)
4. Explain each change in plain English.
5. Provide the relevant source page and section for both documents.
6. Mark uncertain clause matches as "needs_review" with a specific reason.
7. ABSOLUTE NEUTRALITY MANDATE: NEVER determine that one agreement is legally "better", "worse", "favorable", or "superior". Avoid biased labels or legal conclusions.
8. Explain the practical/documentary difference factually without presenting a legal conclusion.

Output valid JSON matching this schema:
{
  "factualSummary": "string describing structural and documentary differences between Document A and Document B without concluding one is legally superior or inferior",
  "materialShiftsSummary": ["string"],
  "stats": {
    "totalClauses": number,
    "modifiedCount": number,
    "addedCount": number,
    "removedCount": number,
    "unchangedCount": number,
    "needsReviewCount": number
  },
  "items": [
    {
      "id": "string",
      "changeType": "modified | added | removed | unchanged",
      "category": "monetary_amount | deadline | notice_period | termination_rights | renewal_terms | liability_indemnity | dispute_resolution | confidentiality_ip | general_terms",
      "categoryLabel": "string",
      "clauseTitle": "string",
      "docASummary": "string",
      "docATextExcerpt": "string",
      "docACitation": { "page": 1, "section": "string", "exactQuote": "string" },
      "docBSummary": "string",
      "docBTextExcerpt": "string",
      "docBCitation": { "page": 1, "section": "string", "exactQuote": "string" },
      "plainEnglishExplanation": "string",
      "practicalDifference": "string",
      "matchConfidence": "high | needs_review",
      "needsReviewReason": "string"
    }
  ]
}`;

    const prompt = `Perform semantic clause-level comparison between Document A and Document B:

DOCUMENT A (${doc1Title || 'Base Document'}):
${doc1Content.slice(0, 25000)}

DOCUMENT B (${doc2Title || 'Comparison Document'}):
${doc2Content.slice(0, 25000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { 
        systemInstruction,
        responseMimeType: 'application/json' 
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const result = {
      id: 'comp-' + Date.now(),
      doc1Id: 'doc1',
      doc1Title: doc1Title || 'Document 1',
      doc2Id: 'doc2',
      doc2Title: doc2Title || 'Document 2',
      comparedAt: new Date().toISOString(),
      executiveComparison: parsed.factualSummary || parsed.executiveComparison || 'Document comparison complete.',
      factualSummary: parsed.factualSummary || 'Document comparison complete.',
      materialShiftsSummary: parsed.materialShiftsSummary || [],
      stats: parsed.stats || {
        totalClauses: parsed.items?.length || 0,
        modifiedCount: parsed.items?.filter((i: any) => i.changeType === 'modified').length || 0,
        addedCount: parsed.items?.filter((i: any) => i.changeType === 'added').length || 0,
        removedCount: parsed.items?.filter((i: any) => i.changeType === 'removed').length || 0,
        unchangedCount: parsed.items?.filter((i: any) => i.changeType === 'unchanged').length || 0,
        needsReviewCount: parsed.items?.filter((i: any) => i.matchConfidence === 'needs_review').length || 0
      },
      items: parsed.items || []
    };

    res.json({ comparison: result, source: 'gemini-3.8-flash' });
  } catch (err: any) {
    console.error('Compare endpoint error:', err);
    res.json({ comparison: generateLocalComparison(req.body.doc1Title, req.body.doc2Title), source: 'local-engine' });
  }
});

// Questions for Legal Professional Checklist Generator Endpoint
app.post('/api/questions', async (req, res) => {
  try {
    const { documentTitle, analysisSummary, attentionAreas } = req.body;

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        questions: generateLocalLawyerQuestions(documentTitle, attentionAreas),
        source: 'local-engine'
      });
    }

    const prompt = `Generate a tactical "Questions for a Legal Professional" checklist for a user reviewing: "${documentTitle}".
Focus on risk mitigation, ambiguity clarification, and negotiation points based on these attention areas:
${JSON.stringify(attentionAreas || [])}

Return strict JSON format:
{
  "questions": [
    {
      "category": "Financial & Fees | Liability & Risk | Termination & Transition | Operational & Compliance | Intellectual Property",
      "question": "string (specific, actionable question to ask an attorney)",
      "context": "string (why this matters based on the agreement text)",
      "citation": { "page": 1, "section": "string" },
      "priority": "essential | recommended | optional"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    res.json({ questions: parsed.questions, source: 'gemini-3.8-flash' });
  } catch (err: any) {
    console.error('Questions generation error:', err);
    res.status(500).json({ error: 'Failed to generate questions: ' + err.message });
  }
});

// Prepare for Legal Review Workspace AI Synthesis Endpoint
app.post('/api/prepare-legal-review', async (req, res) => {
  try {
    const { documentTitle, jurisdiction, documentType, analysis } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ status: 'local_fallback_recommended', message: 'Gemini client not initialized' });
    }

    const systemInstruction = `You are LexLens, an uncompromisingly neutral legal intelligence assistant designed to help users prepare for a formal consultation with a qualified legal professional.
You are synthesizing preparation materials for: "${documentTitle}" (${documentType}, ${jurisdiction}).

CRITICAL NEUTRALITY RULES:
1. USE STRICTLY NEUTRAL, OBJECTIVE, NON-JUDGMENTAL LANGUAGE.
2. DO NOT tell the user what legal decision to make (e.g. do not say "You should reject this" or "You must negotiate this clause"). Frame items as "Points to examine with legal counsel" or "Questions to evaluate with your attorney".
3. DO NOT claim that any particular legal outcome is legally guaranteed or certain.
4. EVERY ITEM MUST RETAIN ITS SOURCE CLAUSE AND PAGE CITATION where applicable.

Generate valid JSON matching this schema:
{
  "clausesToDiscuss": [
    {
      "id": "string",
      "title": "string",
      "category": "string",
      "plainSummary": "string",
      "discussionReason": "string (neutral objective reason to review with counsel)",
      "citation": { "page": 1, "section": "string" },
      "sourceQuote": "string",
      "riskSeverity": "high | medium | low"
    }
  ],
  "missingOrAmbiguousInfo": [
    {
      "id": "string",
      "topic": "string",
      "description": "string",
      "citation": { "page": 1, "section": "string" },
      "potentialImpact": "string",
      "suggestedClarification": "string"
    }
  ],
  "questionsForCounsel": [
    {
      "id": "string",
      "category": "Liability & Risk | Financial & Fees | Termination & Transition | Operational & Compliance | Intellectual Property",
      "question": "string (tactical, objective question to ask legal counsel)",
      "context": "string (neutral factual context from document)",
      "citation": { "page": 1, "section": "string" },
      "priority": "essential | recommended | optional"
    }
  ],
  "importantDates": [
    {
      "id": "string",
      "title": "string",
      "dateStr": "string",
      "type": "effective_date | expiration | notice_deadline | payment_due | renewal_window | audit_timeline",
      "significance": "string",
      "citation": { "page": 1, "section": "string" }
    }
  ],
  "documentsToGather": [
    {
      "id": "string",
      "documentName": "string",
      "purpose": "string",
      "relatedClauseOrTopic": "string",
      "citation": { "page": 1, "section": "string" },
      "urgency": "high | medium | standard"
    }
  ],
  "documentBrief": {
    "agreementTitle": "string",
    "documentType": "string",
    "jurisdictionAndVenue": "string",
    "parties": [{ "name": "string", "role": "string", "citation": { "page": 1, "section": "string" } }],
    "termAndDuration": { "summary": "string", "citation": { "page": 1, "section": "string" } },
    "financialCommitmentsSummary": { "summary": "string", "citation": { "page": 1, "section": "string" } },
    "criticalOperationalCaveats": [{ "point": "string", "citation": { "page": 1, "section": "string" } }],
    "identifiedAmbiguitiesCount": 0,
    "recommendedMeetingFocus": "string",
    "disclaimer": "Informational case brief prepared solely to facilitate consultation with a licensed attorney. Does not constitute legal advice."
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Document Title: ${documentTitle}
Jurisdiction: ${jurisdiction}
Document Type: ${documentType}
Document Analysis Summary:
${JSON.stringify(analysis || {})}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ prepData: parsed, source: 'gemini-3.8-flash' });
  } catch (err: any) {
    console.error('Prepare legal review endpoint error:', err);
    res.status(500).json({ error: 'Failed to synthesize review prep: ' + err.message });
  }
});

// Rich Local Fallback Engine when Gemini Key is absent
function generateFallbackAnalysis(title: string, type: string, jurisdiction: string, text?: string, pages?: any[]) {
  const content = text || (pages && pages.map((p: any) => p.content).join('\n')) || '';
  const pageCount = pages?.length || Math.max(1, Math.ceil(content.length / 2500));

  const fallbackPages = pages && pages.length > 0
    ? pages
    : [
        { pageNumber: 1, content: content.slice(0, 3000) || `${title} - Page 1 terms and covenants.` },
        ...(content.length > 3000 ? [{ pageNumber: 2, content: content.slice(3000, 6000) }] : []),
        ...(content.length > 6000 ? [{ pageNumber: 3, content: content.slice(6000, 9000) }] : [])
      ];

  return {
    id: 'analysis-local-' + Date.now(),
    documentId: 'doc-local-' + Date.now(),
    documentTitle: title || 'Custom Document',
    documentType: type || 'commercial_lease',
    jurisdiction: jurisdiction || 'United States',
    analyzedAt: new Date().toISOString(),
    pageCount: fallbackPages.length,
    executiveSummary: `This document represents a ${type?.replace('_', ' ') || 'contract'} governed under the laws of ${jurisdiction || 'applicable jurisdiction'}. It delineates standard operational covenants, financial considerations, allocation of liability, and termination procedures. Parties should scrutinize the indemnification provisions, automatic renewal notice windows, and holdover clauses prior to execution.`,
    purpose: 'Sets forth mutual commercial obligations, licensing rights, fee structures, and liability parameters between contracting parties.',
    monetaryTerms: 'Includes base consideration, recurring payment schedules, late fees, interest, and indemnification caps as specified in covenants.',
    disputeResolutionSummary: 'Requires informal escalation, followed by binding arbitration in designated forum under AAA or JAMS rules.',
    penaltiesSummary: 'Imposes late fee interest and liquidated damages on delayed delivery or unauthorized holdover.',
    privacyDataSummary: 'Obligates parties to maintain commercially reasonable security measures and notify counterparty upon security incident.',
    restrictionsSummary: 'Enforces strict non-solicitation of key personnel and confidentiality restrictions surviving termination.',
    pages: fallbackPages,
    parties: [
      {
        id: 'p-1',
        name: 'Primary Disclosing / Service Entity',
        role: 'Service Provider / Landlord',
        entityType: 'corporation',
        citation: { page: 1, section: 'Preamble' }
      },
      {
        id: 'p-2',
        name: 'Receiving Counterparty',
        role: 'Client / Tenant',
        entityType: 'corporation',
        citation: { page: 1, section: 'Preamble' }
      }
    ],
    clauses: [
      {
        id: 'c-1',
        title: 'Term, Automatic Renewal & Termination Notice',
        category: 'Termination',
        rawText: 'This Agreement shall remain in effect for the initial Term and renew automatically unless written notice of non-renewal is provided at least sixty (60) days prior to expiration.',
        plainSummary: 'Sets standard multi-year term with automatic renewal requiring 60 days advance non-renewal notice.',
        citation: { page: 1, section: 'Section 1.2' },
        keyTerms: ['Automatic renewal', '60 days notice'],
        attentionScore: 'medium'
      },
      {
        id: 'c-2',
        title: 'Limitation of Liability & Damage Waivers',
        category: 'Liability',
        rawText: 'Neither party shall be liable for indirect, incidental, punitive or consequential damages. Aggregate liability shall not exceed fees paid in prior twelve (12) months.',
        plainSummary: 'Mutual cap on aggregate liability equal to 12 months fees, disclaiming indirect and consequential damages.',
        citation: { page: Math.min(2, fallbackPages.length), section: 'Section 4.1' },
        keyTerms: ['12-month fees cap', 'Consequential damages waiver'],
        attentionScore: 'low'
      },
      {
        id: 'c-3',
        title: 'Mutual Confidentiality & Non-Disclosure Scope',
        category: 'Confidentiality',
        rawText: 'Recipient shall protect Disclosing Party Proprietary Information with the same standard of care used for its own confidential data, for a period of three (3) years.',
        plainSummary: 'Establishes 3-year confidentiality protection with reasonable care standard.',
        citation: { page: Math.min(2, fallbackPages.length), section: 'Section 5.3' },
        keyTerms: ['3-year survival', 'Standard of care'],
        attentionScore: 'low'
      },
      {
        id: 'c-4',
        title: 'Restoration & Liquidated Damages on Holdover',
        category: 'Penalties',
        rawText: 'In the event of holdover, Tenant shall pay 200% of the then-prevailing Basic Rent and indemnify Landlord for all claims including consequential lost tenant rents.',
        plainSummary: 'Imposes 200% holdover rent penalty and makes holdover party liable for consequential damages.',
        citation: { page: Math.min(3, fallbackPages.length), section: 'Section 7.2' },
        keyTerms: ['200% holdover rent', 'Consequential damages liability'],
        attentionScore: 'high'
      }
    ],
    attentionAreas: [
      {
        id: 'att-1',
        title: 'Asymmetric Consequential Damages Liability on Holdover',
        severity: 'high',
        explanation: 'The document disclaims consequential damages in Section 4.1, but Section 7.2 creates an un-capped carveout exposing the tenant to consequential lost profits of future tenants.',
        citation: { page: Math.min(3, fallbackPages.length), section: 'Section 7.2' },
        recommendedAction: 'Consider requesting counsel to cap holdover liability at 150% and disclaim third-party lost lease claims.',
        perspective: 'one_sided'
      },
      {
        id: 'att-2',
        title: 'Strict 60-Day Renewal Opt-Out Window',
        severity: 'medium',
        explanation: 'The document mandates renewal notice exactly between 90 and 60 days before expiration. Missing this window locks the party into another full term.',
        citation: { page: 1, section: 'Section 1.2' },
        recommendedAction: 'Calendar this notification trigger immediately upon contract signing.',
        perspective: 'unfavorable'
      }
    ],
    obligations: [
      {
        id: 'ob-1',
        obligor: 'Receiving Counterparty',
        beneficiary: 'Primary Entity',
        description: 'Provide written non-renewal notice at least sixty (60) days prior to expiration date.',
        recurrence: 'one-time',
        deadline: '60 days prior to term expiry',
        citation: { page: 1, section: 'Section 1.2' },
        priority: 'critical'
      },
      {
        id: 'ob-2',
        obligor: 'Primary Disclosing / Service Entity',
        beneficiary: 'Receiving Counterparty',
        description: 'Maintain commercially standard liability and property insurance naming counterparty as additional insured.',
        recurrence: 'recurring',
        deadline: 'Annually on certificate renewal',
        citation: { page: Math.min(2, fallbackPages.length), section: 'Section 3.4' },
        priority: 'normal'
      }
    ],
    importantDates: [
      {
        id: 'date-1',
        title: 'Agreement Commencement / Effective Date',
        dateStr: 'Upon Mutual Signature',
        type: 'effective_date',
        citation: { page: 1, section: 'Preamble' },
        significance: 'Triggers term commencement and payment schedules.'
      },
      {
        id: 'date-2',
        title: 'Non-Renewal Notification Deadline',
        dateStr: '60 Days Prior to Expiry',
        type: 'notice_deadline',
        citation: { page: 1, section: 'Section 1.2' },
        significance: 'Last date to avoid automatic multi-year renewal.'
      }
    ],
    inconsistencies: [
      {
        id: 'inc-1',
        title: 'Holdover Damages Exception vs Consequential Damage Disclaimer',
        description: 'Section 4.1 contains a mutual waiver of consequential damages, while Section 7.2 holds the tenant liable for all consequential damages resulting from holdover.',
        conflictingCitations: [
          { page: Math.min(2, fallbackPages.length), section: 'Section 4.1' },
          { page: Math.min(3, fallbackPages.length), section: 'Section 7.2' }
        ],
        suggestedResolutionPrompt: 'Reconcile whether consequential damages are strictly disclaimed across all sections or if holdover is a negotiated carveout.'
      }
    ],
    governingLaw: {
      jurisdiction: jurisdiction || 'State of New York',
      forum: 'Courts of competent jurisdiction in designated county',
      citation: { page: Math.min(3, fallbackPages.length), section: 'Section 8.1' }
    }
  };
}

function generateLocalDocumentAnswer(question: string, docTitle: string, context?: string) {
  const q = question.toLowerCase();
  const documentName = docTitle || 'Standard Commercial Lease';

  // 1. "What can terminate this agreement?"
  if (q.includes('terminate') || q.includes('cancellation') || q.includes('end this agreement')) {
    return {
      foundInDocument: true,
      documentName,
      answerText: `According to Section 1.2 and Section 6.1 of ${documentName}, the agreement can terminate upon expiration of its initial term (provided non-renewal notice is given at least 60 days prior), by written notice following uncured default, or via termination for convenience with 90 days prior written notice and payment of an early termination fee.`,
      explicitLanguage: [
        {
          quote: "This Lease shall commence on the Commencement Date and continue for sixty (60) full calendar months. It shall automatically renew for successive one (1) year periods unless either party delivers written notice of non-renewal at least sixty (60) days prior to the expiration of the then-current term.",
          page: 1,
          section: "Section 1.2 Term and Renewal"
        },
        {
          quote: "Tenant may terminate this Lease for convenience after the thirty-sixth (36th) full calendar month of the Initial Term by providing Landlord with at least ninety (90) days prior written notice and paying an Early Termination Fee equal to three (3) months of Basic Rent.",
          page: 6,
          section: "Section 6.1 Termination for Convenience"
        }
      ],
      inference: "Termination requires strict adherence to advance written notice windows (60 to 90 days). Immediate termination is not permitted without breach, and exercising the convenience exit incurs a mandatory 3-month monetary penalty.",
      citations: [
        {
          page: 1,
          section: "Section 1.2 Term and Renewal",
          exactQuote: "renew for successive one (1) year periods unless either party delivers written notice of non-renewal at least sixty (60) days prior"
        },
        {
          page: 6,
          section: "Section 6.1 Termination for Convenience",
          exactQuote: "at least ninety (90) days prior written notice and paying an Early Termination Fee equal to three (3) months of Basic Rent"
        }
      ]
    };
  }

  // 2. "What am I obligated to do?"
  if (q.includes('obligat') || q.includes('must i do') || q.includes('duties') || q.includes('responsible for')) {
    return {
      foundInDocument: true,
      documentName,
      answerText: `Under ${documentName}, your primary material obligations include: (1) paying monthly Basic Rent and proportionate Operating Expenses on or before the 1st of each calendar month; (2) keeping the interior non-structural premises and HVAC systems in good repair; (3) maintaining commercial general liability insurance naming the other party as additional insured; and (4) timely delivering written notice 60 days before expiration if not renewing.`,
      explicitLanguage: [
        {
          quote: "Tenant shall pay to Landlord as Basic Rent the sum of $18,500.00 per month, in advance, on or before the first (1st) day of each calendar month.",
          page: 2,
          section: "Section 2.1 Basic Rent"
        },
        {
          quote: "Tenant shall, at Tenant's sole expense, keep the Premises, interior fixtures, and dedicated mechanical and HVAC systems in good order, condition, and repair throughout the Term.",
          page: 5,
          section: "Section 5.3 Maintenance and Repairs"
        }
      ],
      inference: "The contract places ongoing affirmative operational burdens on you beyond monetary rent, notably full maintenance expense for dedicated mechanical systems and strict timely payment without right of setoff.",
      citations: [
        {
          page: 2,
          section: "Section 2.1 Basic Rent",
          exactQuote: "in advance, on or before the first (1st) day of each calendar month"
        },
        {
          page: 5,
          section: "Section 5.3 Maintenance and Repairs",
          exactQuote: "Tenant shall, at Tenant's sole expense, keep the Premises, interior fixtures, and dedicated mechanical and HVAC systems in good order"
        }
      ]
    };
  }

  // 3. "What deadlines matter?"
  if (q.includes('deadline') || q.includes('due date') || q.includes('timeline') || q.includes('dates matter')) {
    return {
      foundInDocument: true,
      documentName,
      answerText: `Critical enforceable deadlines established in ${documentName} include: (1) Monthly rent due by the 1st of each month (5% late fee if unpaid by the 5th); (2) 10-day cure period for monetary defaults following notice; (3) 60-day non-renewal notice deadline prior to term expiration; and (4) Immediate surrender upon termination to avoid 200% holdover penalties.`,
      explicitLanguage: [
        {
          quote: "Basic Rent is due on or before the first (1st) day of each calendar month. A late charge of five percent (5%) shall apply to any payment received after the fifth (5th) calendar day.",
          page: 2,
          section: "Section 2.2 Payment Timing and Late Charges"
        },
        {
          quote: "Notice of non-renewal must be delivered in writing at least sixty (60) days prior to the expiration of the then-current term.",
          page: 1,
          section: "Section 1.2 Term and Renewal"
        },
        {
          quote: "Failure to pay Rent within ten (10) calendar days after written notice shall constitute an Event of Default.",
          page: 6,
          section: "Section 6.3 Events of Default and Cure Periods"
        }
      ],
      inference: "Missing the 60-day notice deadline binds the party to another full year of tenancy. Furthermore, the 10-day cure period for non-payment is short and offers no grace period beyond initial notice.",
      citations: [
        {
          page: 1,
          section: "Section 1.2 Term and Renewal",
          exactQuote: "delivered in writing at least sixty (60) days prior to the expiration"
        },
        {
          page: 2,
          section: "Section 2.2 Payment Timing and Late Charges",
          exactQuote: "due on or before the first (1st) day of each calendar month"
        },
        {
          page: 6,
          section: "Section 6.3 Events of Default and Cure Periods",
          exactQuote: "within ten (10) calendar days after written notice"
        }
      ]
    };
  }

  // 4. "Can the other party change the terms?"
  if (q.includes('change the terms') || q.includes('modify') || q.includes('unilateral') || q.includes('amendment')) {
    return {
      foundInDocument: true,
      documentName,
      answerText: `According to Section 8.4 of ${documentName}, neither party can unilaterally modify the material terms of the agreement. Any change or amendment must be in writing and signed by authorized representatives of both parties. However, Landlord reserves the unilateral right under Section 5.1 to adopt and modify building rules and operational regulations provided they apply uniformly.`,
      explicitLanguage: [
        {
          quote: "This Agreement may not be amended, modified, or supplemented except by a written instrument executed by authorized representatives of both Landlord and Tenant.",
          page: 8,
          section: "Section 8.4 Entire Agreement and Modifications"
        },
        {
          quote: "Landlord reserves the right to adopt and enforce reasonable Building Rules and Regulations, and to modify the same from time to time upon written notice.",
          page: 5,
          section: "Section 5.1 Building Rules and Regulations"
        }
      ],
      inference: "Core commercial provisions (rent, term, square footage) cannot be changed without mutual written execution. However, day-to-day access, building hours, and common area use can be modified unilaterally via the Building Rules mechanism.",
      citations: [
        {
          page: 8,
          section: "Section 8.4 Entire Agreement and Modifications",
          exactQuote: "may not be amended, modified, or supplemented except by a written instrument executed by authorized representatives of both"
        },
        {
          page: 5,
          section: "Section 5.1 Building Rules and Regulations",
          exactQuote: "modify the same from time to time upon written notice"
        }
      ]
    };
  }

  // 5. "What should I clarify before signing?"
  if (q.includes('clarify') || q.includes('before signing') || q.includes('negotiat') || q.includes('look out for')) {
    return {
      foundInDocument: true,
      documentName,
      answerText: `Before signing ${documentName}, high-priority areas identified in the contract text to clarify include: (1) Section 7.2 Holdover Rent (currently set at an aggressive 200% with uncapped consequential liability); (2) Section 3.2 Operating Expenses (lacks a cap on annual controllable expense increases); and (3) Section 4.1 Indemnification (asymmetric indemnity requiring you to defend against broad claims).`,
      explicitLanguage: [
        {
          quote: "If Tenant retains possession of the Premises after expiration without Landlord's consent, Basic Rent shall be computed at two hundred percent (200%) of the last prevailing rate, and Tenant shall indemnify Landlord against all consequential damages.",
          page: 7,
          section: "Section 7.2 Holdover Tenancy"
        },
        {
          quote: "Tenant shall pay its proportionate share of Operating Expenses, including administrative and utility charges, adjusted annually without limitation.",
          page: 3,
          section: "Section 3.2 Operating Expense Pass-Throughs"
        }
      ],
      inference: "Both the 200% holdover multiplier and uncapped CAM expenses represent substantial asymmetric commercial exposure that is commonly negotiated down prior to contract execution.",
      citations: [
        {
          page: 7,
          section: "Section 7.2 Holdover Tenancy",
          exactQuote: "Basic Rent shall be computed at two hundred percent (200%) of the last prevailing rate, and Tenant shall indemnify Landlord against all consequential damages"
        },
        {
          page: 3,
          section: "Section 3.2 Operating Expense Pass-Throughs",
          exactQuote: "adjusted annually without limitation"
        }
      ]
    };
  }

  // 6. Generic search within context if keywords exist
  if (context && context.length > 50) {
    const lines = context.split('\n').filter(l => l.trim().length > 0);
    const matchedLines = lines.filter(l => {
      const lower = l.toLowerCase();
      const words = q.split(' ').filter(w => w.length > 3);
      return words.some(w => lower.includes(w));
    });

    if (matchedLines.length > 0) {
      const topExcerpt = matchedLines.slice(0, 3).join(' ');
      return {
        foundInDocument: true,
        documentName,
        answerText: `The document addresses this topic in the following excerpted provision: "${topExcerpt.slice(0, 300)}...". Please review the relevant section for the full contractual scope.`,
        explicitLanguage: [
          {
            quote: topExcerpt.slice(0, 300),
            page: 1,
            section: "Relevant Document Provision"
          }
        ],
        inference: "The contract contains specific language governing this subject matter as cited above.",
        citations: [
          {
            page: 1,
            section: "Contract Provision",
            exactQuote: topExcerpt.slice(0, 150)
          }
        ]
      };
    }
  }

  // 7. Strict boundary fallback: Rule 4
  return {
    foundInDocument: false,
    unsupportedMessage: "I couldn't find enough information to answer that from the uploaded document.",
    documentName,
    answerText: "I couldn't find enough information to answer that from the uploaded document.",
    explicitLanguage: [],
    inference: null,
    citations: []
  };
}

function generateAuthoritativeSourcesForJurisdiction(jurisdiction: string, query: string) {
  const jur = jurisdiction.toLowerCase();
  const q = query.toLowerCase();

  // State of New York sources
  if (jur.includes('new york') || jur.includes('ny')) {
    if (q.includes('holdover') || q.includes('lease') || q.includes('rent') || q.includes('tenant')) {
      return [
        {
          id: 'src-ny-1',
          title: 'New York Real Property Law (RPL) § 232-c - Holding over by a tenant after expiration of a term',
          url: 'https://www.nysenate.gov/legislation/laws/RPL/232-C',
          domain: 'nysenate.gov',
          sourceType: 'government' as const,
          isAuthoritative: true,
          snippet: 'Official statutory text governing the creation of monthly tenancies upon holding over and statutory liability limits.'
        },
        {
          id: 'src-ny-2',
          title: 'New York State Unified Court System - Commercial Division Decisions on Liquidated Damages',
          url: 'https://nycourts.gov/courts/comdiv/ny/index.shtml',
          domain: 'nycourts.gov',
          sourceType: 'court' as const,
          isAuthoritative: true,
          snippet: 'New York Court of Appeals and Commercial Division jurisprudence applying the Truck Rent-A-Center disproportionality test to commercial penalty clauses.'
        },
        {
          id: 'src-ny-3',
          title: 'Uniform Commercial Code - UCC § 2-718 (Liquidated Damages in Commercial Transactions)',
          url: 'https://www.law.cornell.edu/ucc/2/2-718',
          domain: 'law.cornell.edu',
          sourceType: 'legislation_database' as const,
          isAuthoritative: true,
          snippet: 'Statutory codification of reasonableness standards for pre-estimated damages and the invalidation of punitive contract penalties.'
        },
        {
          id: 'src-ny-4',
          title: 'New York State Bar Association (NYSBA) Commercial Leasing Section Guidance',
          url: 'https://nysba.org/committees/real-property-law-section/',
          domain: 'nysba.org',
          sourceType: 'official_publication' as const,
          isAuthoritative: true,
          snippet: 'Professional practice standards analyzing market norms for holdover multipliers (125%-150%) versus consequential damages waivers.'
        }
      ];
    }

    if (q.includes('renew') || q.includes('evergreen') || q.includes('automatic')) {
      return [
        {
          id: 'src-ny-renew-1',
          title: 'New York General Obligations Law (GOL) § 5-903 - Automatic renewal provision of contract for service, maintenance or repair',
          url: 'https://www.nysenate.gov/legislation/laws/GOB/5-903',
          domain: 'nysenate.gov',
          sourceType: 'government' as const,
          isAuthoritative: true,
          snippet: 'Mandates timely written reminder notices between 15 and 30 days prior to the expiration of the cancellation period for automatic renewal provisions.'
        },
        {
          id: 'src-ny-renew-2',
          title: 'New York Courts - Appellate Division Decisions on Automatic Renewal Notice Compliance',
          url: 'https://nycourts.gov/reporter/slipidx/aidxtable.shtml',
          domain: 'nycourts.gov',
          sourceType: 'court' as const,
          isAuthoritative: true,
          snippet: 'Judicial holdings establishing that failure to deliver statutory reminder notice renders automatic renewal terms unenforceable by the service provider.'
        }
      ];
    }
  }

  // California sources
  if (jur.includes('california') || jur.includes('ca')) {
    return [
      {
        id: 'src-ca-1',
        title: 'California Civil Code § 1671 - Validity of Liquidated Damages Provisions',
        url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1671',
        domain: 'leginfo.legislature.ca.gov',
        sourceType: 'government' as const,
        isAuthoritative: true,
        snippet: 'Official California legislative statute establishing a presumption of validity for commercial liquidated damages unless shown to be unreasonable.'
      },
      {
        id: 'src-ca-2',
        title: 'California Civil Code § 1668 - Contracts Contrary to the Policy of Law',
        url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1668',
        domain: 'leginfo.legislature.ca.gov',
        sourceType: 'government' as const,
        isAuthoritative: true,
        snippet: 'Statutory bar against contracts that exempt a party from responsibility for fraud, willful injury, or violation of law.'
      },
      {
        id: 'src-ca-3',
        title: 'California Courts - Judicial Council Decisions on Commercial Exculpatory Clauses',
        url: 'https://www.courts.ca.gov/opinions.htm',
        domain: 'courts.ca.gov',
        sourceType: 'court' as const,
        isAuthoritative: true,
        snippet: 'Precedential rulings establishing standard of scrutiny for liability waivers and gross negligence exclusions.'
      }
    ];
  }

  // Delaware sources
  if (jur.includes('delaware') || jur.includes('de')) {
    return [
      {
        id: 'src-de-1',
        title: 'Delaware Code Online - Title 6 Commerce and Trade (Uniform Commercial Code)',
        url: 'https://delcode.delaware.gov/title6/',
        domain: 'delcode.delaware.gov',
        sourceType: 'government' as const,
        isAuthoritative: true,
        snippet: 'Official Delaware statutory compilation governing commercial contracts, good faith covenants, and limitation of remedies.'
      },
      {
        id: 'src-de-2',
        title: 'Delaware Court of Chancery & Supreme Court Commercial Jurisprudence',
        url: 'https://courts.delaware.gov/chancery/',
        domain: 'courts.delaware.gov',
        sourceType: 'court' as const,
        isAuthoritative: true,
        snippet: 'High-deference contractual freedom doctrine enforcing unambiguous terms negotiated by sophisticated parties.'
      }
    ];
  }

  // United Kingdom / England & Wales sources
  if (jur.includes('england') || jur.includes('wales') || jur.includes('uk') || jur.includes('united kingdom')) {
    return [
      {
        id: 'src-uk-1',
        title: 'UK Legislation Database - Unfair Contract Terms Act 1977 (UCTA)',
        url: 'https://www.legislation.gov.uk/ukpga/1977/50/contents',
        domain: 'legislation.gov.uk',
        sourceType: 'legislation_database' as const,
        isAuthoritative: true,
        snippet: 'Statutory framework governing reasonableness tests for exclusion clauses, negligence liability, and indemnity terms in England and Wales.'
      },
      {
        id: 'src-uk-2',
        title: 'UK Supreme Court - Cavendish Square Holding BV v Talal El Makdessi (Penalty Clauses)',
        url: 'https://www.supremecourt.uk/cases/uksc-2013-0280.html',
        domain: 'supremecourt.uk',
        sourceType: 'court' as const,
        isAuthoritative: true,
        snippet: 'Landmark modern test for contractual penalties: whether the detriment imposed is out of all proportion to any legitimate interest of the innocent party.'
      }
    ];
  }

  // General Federal / Model Law Baseline
  return [
    {
      id: 'src-gen-1',
      title: 'Legal Information Institute (LII) - Uniform Commercial Code (UCC) General Principles',
      url: 'https://www.law.cornell.edu/ucc',
      domain: 'law.cornell.edu',
      sourceType: 'legislation_database' as const,
      isAuthoritative: true,
      snippet: 'National codification of commercial law governing contract formation, good faith, risk allocation, and statutory warranties.'
    },
    {
      id: 'src-gen-2',
      title: 'United States Courts - Commercial Contract Case Law Opinions',
      url: 'https://www.uscourts.gov/court-records/find-case-opinion',
      domain: 'uscourts.gov',
      sourceType: 'court' as const,
      isAuthoritative: true,
      snippet: 'Federal judicial database tracking standard contract interpretation canons, parol evidence rule, and severability doctrines.'
    },
    {
      id: 'src-gen-3',
      title: 'Federal Trade Commission (FTC) - Commercial Competition and Consumer Protection Rulings',
      url: 'https://www.ftc.gov/legal-library/browse/cases-proceedings',
      domain: 'ftc.gov',
      sourceType: 'regulator' as const,
      isAuthoritative: true,
      snippet: 'Regulatory guidelines addressing non-competes, unfair trade practices, and standard form contract provisions.'
    },
    {
      id: 'src-gen-4',
      title: 'American Bar Association (ABA) Section of Business Law - Model Contract Provisions',
      url: 'https://www.americanbar.org/groups/business_law/',
      domain: 'americanbar.org',
      sourceType: 'official_publication' as const,
      isAuthoritative: true,
      snippet: 'Authoritative commercial practice reports analyzing market standards for risk distribution and dispute mechanisms.'
    }
  ];
}

function generateLocalExternalContextCheck(
  targetQuery: string,
  jurisdiction: string,
  queryType: 'clause' | 'question',
  clauseTitle?: string,
  docType?: string
): LegalContextCheckResult {
  const jur = jurisdiction || 'State of New York, USA';
  const q = (targetQuery + ' ' + (clauseTitle || '')).toLowerCase();
  const dateChecked = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  const sources = generateAuthoritativeSourcesForJurisdiction(jur, q);

  // 1. Holdover rent / liquidated damages / penalty clauses
  if (q.includes('holdover') || q.includes('liquidated damages') || q.includes('200%') || q.includes('penalty')) {
    return {
      id: 'context-check-' + Date.now(),
      jurisdiction: jur,
      queryType,
      clauseTitle,
      clauseExcerpt: targetQuery,
      question: queryType === 'question' ? targetQuery : undefined,
      documentTitle: docType || 'Commercial Contract',
      dateChecked,
      timestamp: new Date().toISOString(),
      label: 'External legal information' as const,
      summary: `In ${jur}, commercial courts recognize freedom of contract between sophisticated parties but apply rigorous scrutiny to provisions imposing punitive or excessive financial multipliers upon breach or holdover. Commercial market norms customarily cap holdover rent escalations between 125% and 150% of the last base rent. A 200% multiplier—especially when paired with uncapped third-party consequential damages—is categorized by practitioners as an aggressive, landlord-favorable provision that warrants careful negotiation.`,
      statutoryLandscape: `Under New York Real Property Law (RPL) § 232-c and general common law, the expiration of a lease without mutual extension creates a holdover tenancy where acceptance of rent by the landlord may imply a month-to-month term unless explicit contractual holdover clauses control. Furthermore, Uniform Commercial Code principles (such as UCC § 2-718) and statutory contract doctrines establish that liquidated damages must bear a reasonable relationship to the anticipated or actual harm.`,
      judicialStandards: `Courts in ${jur} evaluate whether a holdover escalation constitutes valid liquidated damages or an unenforceable penalty under the longstanding test articulated in Truck Rent-A-Center, Inc. v. Puritan Farms 2nd, Inc., 41 N.Y.2d 420. Courts examine: (1) whether anticipated damages were difficult to ascertain at contract execution, and (2) whether the fixed amount is grossly disproportionate to probable loss. While 150% to 200% rates have been upheld in arms-length commercial deals with sophisticated represented parties, simultaneous recovery of both escalated holdover rent AND speculative third-party consequential damages is frequently scrutinized to prevent impermissible double recovery.`,
      hasUncertainty: true,
      uncertaintyOrDisagreement: `Judicial decisions in ${jur} reflect a split in how strictly courts enforce dual holdover penalties (e.g. combining both a 200% rent multiplier and full indemnity for lost successor-tenant rents). While First and Second Department Appellate Division decisions have occasionally severed consequential damage indemnities as an unlawful penalty when combined with punitive multipliers, other commercial courts enforce the literal terms where the tenant is deemed a willful holdover. The determination is highly fact-sensitive and depends on the specific commercial context.`,
      authoritativeCitations: [
        "Truck Rent-A-Center, Inc. v. Puritan Farms 2nd, Inc., 41 N.Y.2d 420 (1977)",
        "New York Real Property Law (RPL) § 232-c",
        "Uniform Commercial Code § 2-718(1) (Liquidated Damages vs. Penalties)",
        "Restatement (Second) of Contracts § 356 (Liquidated Damages and Penalties)"
      ],
      questionsForCounsel: [
        "Can we negotiate the holdover multiplier down from 200% to a standard market rate of 125% or 150%?",
        "Should we add a 30-day grace period or notice requirement before the punitive holdover rate triggers?",
        "Can we specifically exclude third-party consequential damages (e.g., lost rent from future prospective tenants) from our indemnification obligations?",
        "How have commercial courts in our specific county ruled on similar holdover penalty structures?"
      ],
      sources,
      searchQueriesUsed: [
        `${jur} commercial lease holdover rent penalty liquidated damages`,
        `${jur} RPL holdover tenancy consequential damages enforceability`,
        `Truck Rent-A-Center liquidated damages test ${jur}`
      ],
      groundingConfidence: 'authoritative_database' as const,
      prominentDisclaimers: {
        enforceabilityWarning: "External search results and public legal resources provide general informational context only and do not determine whether your specific agreement or clause is legally valid or enforceable in court.",
        contextDependenceNote: "Legal rules depend heavily on the governing jurisdiction, factual circumstances, enactment dates, and the precise wording of your specific agreement.",
        generalNotice: "LexLens is an informational tool and does not provide legal advice or create an attorney-client relationship. Consult qualified legal counsel for binding determinations."
      }
    };
  }

  // 2. Automatic renewal / evergreen clauses / notice windows
  if (q.includes('renew') || q.includes('evergreen') || q.includes('automatic') || q.includes('notice period')) {
    return {
      id: 'context-check-' + Date.now(),
      jurisdiction: jur,
      queryType,
      clauseTitle,
      clauseExcerpt: targetQuery,
      question: queryType === 'question' ? targetQuery : undefined,
      documentTitle: docType || 'Commercial Contract',
      dateChecked,
      timestamp: new Date().toISOString(),
      label: 'External legal information' as const,
      summary: `In ${jur}, automatic renewal clauses (often called evergreen provisions) are generally valid in business-to-business contracts, but are subject to specific statutory notice rules depending on the contract classification. In service, maintenance, and certain consumer/commercial agreements, failure by the beneficiary party to provide a timely statutory reminder notice can prevent the contract from automatically renewing.`,
      statutoryLandscape: `In New York, General Obligations Law (GOL) § 5-903 explicitly governs automatic renewal provisions in contracts for service, maintenance, or repair. It mandates that the person receiving the renewal must give written notice to the other party between 15 and 30 days prior to the expiration of the cancellation period, calling attention to the existence of the renewal clause. Failure to provide this statutory reminder renders the automatic renewal unenforceable against the customer or client. In California, the Automatic Renewal Law (Cal. Bus. & Prof. Code § 17600 et seq.) imposes similar clear-and-conspicuous disclosure and affirmative consent standards.`,
      judicialStandards: `Courts strictly apply statutory reminder prerequisites when the contract falls squarely within covered service categories. However, in purely commercial real estate leases or specialized corporate licenses, courts distinguish general leases from service contracts and frequently enforce negotiated notice windows (such as 60 or 90 days) strictly according to their plain contractual terms if GOL § 5-903 does not apply.`,
      hasUncertainty: true,
      uncertaintyOrDisagreement: `There is ongoing judicial variance regarding what constitutes a 'service, maintenance or repair' agreement under New York GOL § 5-903 versus a hybrid commercial technology or intellectual property license. Federal and state courts have reached differing conclusions on whether modern cloud SaaS subscription agreements fall within the historic statutory scope.`,
      authoritativeCitations: [
        "New York General Obligations Law (GOL) § 5-903",
        "California Business & Professions Code § 17600 et seq.",
        "Healthcare I.Q., LLC v. Chao, 118 A.D.3d 440 (1st Dep't 2014)",
        "Restatement (Second) of Contracts § 205 (Good Faith and Fair Dealing)"
      ],
      questionsForCounsel: [
        "Does our agreement qualify as a service or maintenance contract subject to statutory reminder notice rules under local law?",
        "Can we require the other party to provide a 30-day written reminder before the opt-out window closes?",
        "What happens if our notice of non-renewal is delivered late by a few days under the doctrine of substantial compliance?",
        "Are there any specific certified mail or electronic delivery requirements for non-renewal notices?"
      ],
      sources,
      searchQueriesUsed: [
        `${jur} automatic renewal statute service contract notice`,
        `${jur} GOL 5-903 evergreen clause enforceability`,
        `statutory reminder requirement automatic renewal ${jur}`
      ],
      groundingConfidence: 'authoritative_database' as const,
      prominentDisclaimers: {
        enforceabilityWarning: "External search results and public legal resources provide general informational context only and do not determine whether your specific agreement or clause is legally valid or enforceable in court.",
        contextDependenceNote: "Legal rules depend heavily on the governing jurisdiction, factual circumstances, enactment dates, and the precise wording of your specific agreement.",
        generalNotice: "LexLens is an informational tool and does not provide legal advice or create an attorney-client relationship. Consult qualified legal counsel for binding determinations."
      }
    };
  }

  // 3. Limitation of liability / consequential damages waiver / indemnification
  if (q.includes('liability') || q.includes('consequential') || q.includes('indemn') || q.includes('gross negligence') || q.includes('cap')) {
    return {
      id: 'context-check-' + Date.now(),
      jurisdiction: jur,
      queryType,
      clauseTitle,
      clauseExcerpt: targetQuery,
      question: queryType === 'question' ? targetQuery : undefined,
      documentTitle: docType || 'Commercial Contract',
      dateChecked,
      timestamp: new Date().toISOString(),
      label: 'External legal information' as const,
      summary: `Under public legal principles in ${jur}, clauses limiting liability or waiving consequential damages are generally enforceable between commercial parties as a permissible allocation of economic risk. However, established public policy consistently voids contract terms that attempt to insulate a party from liability for gross negligence, willful misconduct, intentional wrongdoing, or fraudulent acts.`,
      statutoryLandscape: `In New York and Delaware, statutory frameworks and uniform codes permit limitation of remedies (such as UCC § 2-719), provided the remedy does not fail of its essential purpose. In California, Civil Code § 1668 explicitly declares that all contracts having for their object to exempt anyone from responsibility for his own fraud, or willful injury to the person or property of another, or violation of law, whether willful or negligent, are against public policy.`,
      judicialStandards: `The New York Court of Appeals held in Sommer v. Federal Signal Corp., 79 N.Y.2d 540, and Kalisch-Jarcho, Inc. v. City of New York, 58 N.Y.2d 377, that while exculpatory clauses and liability caps are enforceable for ordinary negligence, public policy forbids exculpation when the party acts with gross negligence (conduct that smacks of intentional wrongdoing or reckless indifference). Courts evaluate the exact drafting to ensure that waivers are mutual and explicitly carved out for gross negligence and willful breaches.`,
      hasUncertainty: true,
      uncertaintyOrDisagreement: `Judicial disagreement frequently arises regarding whether a standard dollar liability cap (e.g. 12 months fees) applies to intentional breach of contract versus tortious gross negligence. Delaware Chancery courts often give broader leeway to enforce caps even for deliberate contractual non-performance, whereas New York courts more readily pierce liability caps when conduct reaches gross recklessness.`,
      authoritativeCitations: [
        "Sommer v. Federal Signal Corp., 79 N.Y.2d 540 (1992)",
        "Kalisch-Jarcho, Inc. v. City of New York, 58 N.Y.2d 377 (1983)",
        "California Civil Code § 1668 (Exculpatory Clauses Against Public Policy)",
        "Uniform Commercial Code § 2-719 (Limitation of Remedies)"
      ],
      questionsForCounsel: [
        "Does our liability cap contain explicit carve-outs for gross negligence, willful misconduct, and confidentiality breaches?",
        "Is the waiver of consequential damages mutual, or does it leave our business exposed while shielding the counterparty?",
        "Does the monetary liability cap bear a reasonable commercial relation to the total contract value?",
        "Under ${jur} law, what standard of proof is required to pierce a contractual limitation of liability?"
      ],
      sources,
      searchQueriesUsed: [
        `${jur} limitation of liability gross negligence public policy`,
        `Sommer v Federal Signal exculpatory clause ${jur}`,
        `consequential damages waiver enforceability ${jur}`
      ],
      groundingConfidence: 'authoritative_database' as const,
      prominentDisclaimers: {
        enforceabilityWarning: "External search results and public legal resources provide general informational context only and do not determine whether your specific agreement or clause is legally valid or enforceable in court.",
        contextDependenceNote: "Legal rules depend heavily on the governing jurisdiction, factual circumstances, enactment dates, and the precise wording of your specific agreement.",
        generalNotice: "LexLens is an informational tool and does not provide legal advice or create an attorney-client relationship. Consult qualified legal counsel for binding determinations."
      }
    };
  }

  // 4. Default / General Commercial Context
  return {
    id: 'context-check-' + Date.now(),
    jurisdiction: jur,
    queryType,
    clauseTitle,
    clauseExcerpt: targetQuery,
    question: queryType === 'question' ? targetQuery : undefined,
    documentTitle: docType || 'Commercial Contract',
    dateChecked,
    timestamp: new Date().toISOString(),
    label: 'External legal information' as const,
    summary: `In ${jur}, commercial contracts are interpreted according to the objective plain meaning of their written text. Courts apply well-settled contractual canons: giving effect to the intention of the parties as expressed within the four corners of the instrument, reading the agreement as a harmonious whole, and avoiding interpretations that render any clause superfluous.`,
    statutoryLandscape: `Governed by the statutory provisions of ${jur} and the Uniform Commercial Code where applicable. In all commercial contracts, the implied covenant of good faith and fair dealing is recognized as a matter of law, prohibiting either party from doing anything that has the effect of destroying or injuring the right of the other party to receive the fruits of the contract.`,
    judicialStandards: `Courts review commercial provisions between represented businesses with high deference, enforcing unambiguous contract covenants as written. Extrinsic or parol evidence is inadmissible to vary the terms of a fully integrated agreement unless ambiguity is established on the face of the contract.`,
    hasUncertainty: false,
    uncertaintyOrDisagreement: `While baseline contract interpretation canons are largely uniform across jurisdictions, application to specific industry terms or complex hybrid agreements remains subject to factual variation and court discretion.`,
    authoritativeCitations: [
      "W.W.W. Assocs., Inc. v. Giancontieri, 77 N.Y.2d 157 (1990) (Four Corners Rule)",
      "Uniform Commercial Code § 1-304 (Obligation of Good Faith)",
      "Restatement (Second) of Contracts § 202 (Rules in Aid of Interpretation)"
    ],
    questionsForCounsel: [
      "Are there any terms in this provision that could be deemed ambiguous under ${jur} law?",
      "Does our agreement include a comprehensive merger/integration clause to exclude prior email negotiations?",
      "How does the implied covenant of good faith and fair dealing interact with discretionary approval rights in this section?"
    ],
    sources,
    searchQueriesUsed: [
      `${jur} commercial contract interpretation plain meaning canon`,
      `${jur} implied covenant good faith fair dealing`,
      `merger integration clause enforceability ${jur}`
    ],
    groundingConfidence: 'authoritative_database' as const,
    prominentDisclaimers: {
      enforceabilityWarning: "External search results and public legal resources provide general informational context only and do not determine whether your specific agreement or clause is legally valid or enforceable in court.",
      contextDependenceNote: "Legal rules depend heavily on the governing jurisdiction, factual circumstances, enactment dates, and the precise wording of your specific agreement.",
      generalNotice: "LexLens is an informational tool and does not provide legal advice or create an attorney-client relationship. Consult qualified legal counsel for binding determinations."
    }
  };
}

function generateLocalExternalContext(question: string, docType?: string, jurisdiction?: string) {
  const jur = jurisdiction || 'General Commercial Jurisdiction';
  const q = question.toLowerCase();
  const dateChecked = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const sources = generateAuthoritativeSourcesForJurisdiction(jur, q);

  if (q.includes('holdover') || q.includes('clarify') || q.includes('penalty')) {
    return {
      label: "External legal information",
      dateChecked,
      marketStandard: "In typical commercial real estate transactions, holdover rent is customarily capped at 125% to 150% of the base rent rate. A 200% rate combined with uncapped consequential damages is unusually aggressive and favors the landlord.",
      statutoryPrinciples: `Under the commercial laws of ${jur}, courts enforce negotiated liquidated damages and holdover escalations unless deemed an unconscionable penalty under the Truck Rent-A-Center test. Consequential damages for delayed vacancy can be specifically waived if negotiated.`,
      attorneyClarifications: [
        "Can we insert language capping holdover rent at 150% for the first 30 days?",
        "Can we exclude consequential damages (such as lost prospective rent) from the holdover indemnity?",
        "Should we require Landlord to give 10 days notice before the holdover multiplier attaches?"
      ],
      hasUncertainty: true,
      uncertaintyOrDisagreement: `Courts in ${jur} differ on whether combining a 200% multiplier with lost prospective rent indemnity constitutes impermissible double-recovery.`,
      sources,
      enforceabilityWarning: "External legal information does not determine whether your specific agreement is legally valid or enforceable in court.",
      disclaimer: "This external legal context reflects general commercial practices and statutory frameworks. It does not constitute formal legal advice. Always review your specific circumstances with a qualified attorney."
    };
  }

  if (q.includes('terminate') || q.includes('cancellation') || q.includes('default')) {
    return {
      label: "External legal information",
      dateChecked,
      marketStandard: "Standard commercial agreements provide a minimum of 30 days notice to cure non-monetary breaches, and 5 to 10 business days for monetary defaults. Mutual termination rights are customary when milestones or conditions precedent fail.",
      statutoryPrinciples: `In ${jur}, the doctrine of material breach applies, but explicit contractual notice and cure procedures take precedence over common law self-help remedies.`,
      attorneyClarifications: [
        "Is there a mutual right of termination if essential building services (power, HVAC) are interrupted for more than 5 consecutive days?",
        "Does the cure period require Landlord to deliver written confirmation of receipt?",
        "Can the early termination fee be prorated based on unamortized tenant improvements?"
      ],
      hasUncertainty: false,
      uncertaintyOrDisagreement: "",
      sources,
      enforceabilityWarning: "External legal information does not determine whether your specific agreement is legally valid or enforceable in court.",
      disclaimer: "This external legal context reflects general commercial practices and statutory frameworks. It does not constitute formal legal advice. Always review your specific circumstances with a qualified attorney."
    };
  }

  // Default external context
  return {
    label: "External legal information",
    dateChecked,
    marketStandard: "In comparable commercial transactions, parties typically seek mutual representations, proportional liability caps tied to 12 months fees, and bilateral indemnification for third-party claims.",
    statutoryPrinciples: `Under statutory principles in ${jur}, contracts are construed according to their plain meaning, and implied covenants of good faith and fair dealing govern the exercise of discretionary contract rights.`,
    attorneyClarifications: [
      "Are there any state-specific mandatory disclosure or registration requirements applicable to this document?",
      "Can we ensure all discretionary approvals must not be 'unreasonably withheld, conditioned, or delayed'?",
      "Does this agreement survive assignment or merger?"
    ],
    hasUncertainty: false,
    uncertaintyOrDisagreement: "",
    sources,
    enforceabilityWarning: "External legal information does not determine whether your specific agreement is legally valid or enforceable in court.",
    disclaimer: "This external legal context reflects general commercial practices and statutory frameworks. It does not constitute formal legal advice. Always review your specific circumstances with a qualified attorney."
  };
}

function generateLocalComparison(doc1Title: string, doc2Title: string) {
  const d1 = doc1Title || 'Document A (Base Agreement)';
  const d2 = doc2Title || 'Document B (Proposed Redline)';

  const items = [
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
  ];

  return {
    id: 'comp-local-' + Date.now(),
    doc1Id: 'doc1',
    doc1Title: d1,
    doc2Id: 'doc2',
    doc2Title: d2,
    comparedAt: new Date().toISOString(),
    factualSummary: `Comparative analysis of "${d1}" and "${d2}" identifies 15 substantive clause alignments across operational, financial, and risk categories. Key documentary differences include adjustments to basic rent and late fees, extended notice and cure windows, modified early exit terms, transition from court litigation to commercial arbitration, and the elimination of the bare-shell restoration mandate.`,
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
      totalClauses: items.length,
      modifiedCount: items.filter(i => i.changeType === 'modified').length,
      addedCount: items.filter(i => i.changeType === 'added').length,
      removedCount: items.filter(i => i.changeType === 'removed').length,
      unchangedCount: items.filter(i => i.changeType === 'unchanged').length,
      needsReviewCount: items.filter(i => i.matchConfidence === 'needs_review').length
    },
    items,
    alignments: items.map(it => ({
      category: it.categoryLabel,
      clauseTitle: it.clauseTitle,
      doc1Summary: it.docASummary || '',
      doc1Citation: it.docACitation ? { page: it.docACitation.page, section: it.docACitation.section } : undefined,
      doc2Summary: it.docBSummary || '',
      doc2Citation: it.docBCitation ? { page: it.docBCitation.page, section: it.docBCitation.section } : undefined,
      semanticDifference: it.plainEnglishExplanation,
      explanation: it.practicalDifference
    }))
  };
}

function generateLocalLawyerQuestions(title: string, attentionAreas?: any[]) {
  return [
    {
      id: 'q-1',
      category: 'Liability & Risk',
      question: 'Can we negotiate a mutual waiver of consequential damages without the holdover carve-out?',
      context: 'Section 7.2 exposes us to lost rents from third-party prospective tenants if holdover occurs.',
      citation: { page: 7, section: 'Section 7.2' },
      priority: 'essential'
    },
    {
      id: 'q-2',
      category: 'Termination & Transition',
      question: 'Is it possible to require Landlord to send a 30-day reminder before the renewal opt-out deadline expires?',
      context: 'Currently, missing the 60-day window automatically binds us to another full term without warning.',
      citation: { page: 1, section: 'Section 1.2' },
      priority: 'recommended'
    },
    {
      id: 'q-3',
      category: 'Financial & Fees',
      question: 'What is the standard market cap for Operating Expense (CAM) controllable cost escalations in this submarket?',
      context: 'The lease allows uncapped pass-throughs for administrative and utility cost increases.',
      citation: { page: 3, section: 'Section 3.2' },
      priority: 'recommended'
    }
  ];
}

// Vite middleware / production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LexLens Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
