import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  ShieldCheck, 
  Scale, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  FileText, 
  ArrowUpRight, 
  Info,
  BookOpen,
  Trash2,
  HelpCircle,
  Quote,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { StoredDocument, ChatMessage, Citation, ExplicitDocumentLanguageItem, ExternalLegalInfo } from '../types';
import { 
  saveChatHistoryToFirestore, 
  getChatHistoryFromFirestore, 
  clearChatHistoryFromFirestore 
} from '../lib/firebase';

interface AskViewProps {
  document: StoredDocument;
  onNavigateToPage?: (page: number, section?: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const AskView: React.FC<AskViewProps> = ({ document, onNavigateToPage, onNavigateTab }) => {
  const [inputQuery, setInputQuery] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);
  const [expandedExternalContexts, setExpandedExternalContexts] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions mandated by user requirements
  const suggestedQuestions = [
    'What can terminate this agreement?',
    'What am I obligated to do?',
    'What deadlines matter?',
    'Can the other party change the terms?',
    'What should I clarify before signing?'
  ];

  // Helper to build initial welcome message for this document
  const getInitialWelcomeMessage = (doc: StoredDocument): ChatMessage => ({
    id: `welcome-${doc.id}`,
    documentId: doc.id,
    documentName: doc.title,
    sender: 'assistant',
    timestamp: new Date().toISOString(),
    content: `I am ready to answer questions grounded strictly in "${doc.title}".`,
    inference: 'In this workspace, answers are retrieved directly from document clauses with authentic page and section citations. If the document does not contain the answer, I will state that plainly without guessing.',
    explicitLanguage: [
      {
        quote: `Governing document: "${doc.title}" (${doc.documentType.replace(/_/g, ' ')}), jurisdiction: ${doc.jurisdiction || 'Specified in agreement'}. Total pages indexed: ${doc.pages?.length || doc.analysis?.pageCount || 1}.`,
        page: 1,
        section: "Document Index"
      }
    ],
    citations: [
      {
        page: 1,
        section: "Preamble & Index",
        exactQuote: doc.title
      }
    ]
  });

  // Load chat history per document (from localStorage and Firestore)
  useEffect(() => {
    let isCurrent = true;
    setIsHistoryLoading(true);

    const loadDocHistory = async () => {
      const storageKey = `lexlens_chat_history_${document.id}`;
      
      // 1. Check local storage first for instant render
      const localSaved = localStorage.getItem(storageKey);
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0 && isCurrent) {
            setMessages(parsed);
            setIsHistoryLoading(false);
          }
        } catch (e) {
          console.warn('Error reading local chat history:', e);
        }
      }

      // 2. Fetch from Firestore for cloud persistence
      try {
        const remoteHistory = await getChatHistoryFromFirestore(document.id);
        if (isCurrent) {
          if (remoteHistory && remoteHistory.length > 0) {
            setMessages(remoteHistory);
            localStorage.setItem(storageKey, JSON.stringify(remoteHistory));
          } else if (!localSaved) {
            // First time opening this document: initialize with welcome message
            const initialMsg = [getInitialWelcomeMessage(document)];
            setMessages(initialMsg);
            localStorage.setItem(storageKey, JSON.stringify(initialMsg));
            await saveChatHistoryToFirestore(document.id, initialMsg);
          }
        }
      } catch (err) {
        console.warn('Firestore chat history fetch notice:', err);
        if (isCurrent && (!messages || messages.length === 0)) {
          setMessages([getInitialWelcomeMessage(document)]);
        }
      } finally {
        if (isCurrent) setIsHistoryLoading(false);
      }
    };

    loadDocHistory();

    return () => {
      isCurrent = false;
    };
  }, [document.id]);

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist messages whenever they change
  const persistMessages = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
    const storageKey = `lexlens_chat_history_${document.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
    saveChatHistoryToFirestore(document.id, updatedMessages);
  };

  // Handle clearing history for this document
  const handleClearHistory = async () => {
    if (window.confirm(`Clear conversation history for "${document.title}"?`)) {
      const reset = [getInitialWelcomeMessage(document)];
      persistMessages(reset);
      await clearChatHistoryFromFirestore(document.id);
    }
  };

  // Handle sending a document question
  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      documentId: document.id,
      documentName: document.title,
      sender: 'user',
      timestamp: new Date().toISOString(),
      content: textToSend
    };

    const nextMessages = [...messages, userMessage];
    persistMessages(nextMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const documentContext = document.pages?.map((p) => `[PAGE ${p.pageNumber}]\n${p.content}`).join('\n\n') 
        || document.rawText 
        || document.analysis?.executiveSummary 
        || '';

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          documentName: document.title,
          documentType: document.documentType,
          jurisdiction: document.jurisdiction,
          documentContext
        })
      });

      if (!res.ok) {
        throw new Error('Failed to query document.');
      }

      const data = await res.json();

      let assistantMessage: ChatMessage;

      if (!data.foundInDocument) {
        // Rule 4: If the answer is not supported by the document, explicitly say:
        // "I couldn't find enough information to answer that from the uploaded document."
        assistantMessage = {
          id: 'assistant-' + Date.now(),
          documentId: document.id,
          documentName: document.title,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          content: "I couldn't find enough information to answer that from the uploaded document.",
          isUnsupported: true,
          explicitLanguage: [],
          inference: undefined,
          citations: []
        };
      } else {
        assistantMessage = {
          id: 'assistant-' + Date.now(),
          documentId: document.id,
          documentName: data.documentName || document.title,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          content: data.answerText || 'Provisions found in document.',
          isUnsupported: false,
          explicitLanguage: data.explicitLanguage || [],
          inference: data.inference || undefined,
          citations: data.citations || []
        };
      }

      persistMessages([...nextMessages, assistantMessage]);
    } catch (err: any) {
      console.error('Ask error:', err);
      const errorMessage: ChatMessage = {
        id: 'err-' + Date.now(),
        documentId: document.id,
        documentName: document.title,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        content: "I couldn't find enough information to answer that from the uploaded document.",
        isUnsupported: true
      };
      persistMessages([...nextMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Rule 7: Allow a separate "Check external legal context" action
  const handleCheckExternalContext = async (messageId: string, question: string, msg: ChatMessage) => {
    // Set checking state on message
    const updated = messages.map(m => {
      if (m.id === messageId) {
        return { ...m, isCheckingExternalContext: true };
      }
      return m;
    });
    setMessages(updated);

    try {
      const res = await fetch('/api/check-external-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          documentName: msg.documentName || document.title,
          documentAnswer: msg.content,
          explicitLanguage: msg.explicitLanguage?.map(item => item.quote) || [],
          jurisdiction: document.jurisdiction,
          documentType: document.documentType
        })
      });

      if (!res.ok) throw new Error('External legal context check failed.');
      const data: ExternalLegalInfo = await res.json();

      const finalMessages = messages.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            isCheckingExternalContext: false,
            externalLegalContext: data
          };
        }
        return m;
      });

      persistMessages(finalMessages);
      setExpandedExternalContexts(prev => new Set(prev).add(messageId));
    } catch (err) {
      console.error('External context check error:', err);
      const finalMessages = messages.map(m => {
        if (m.id === messageId) {
          return { ...m, isCheckingExternalContext: false };
        }
        return m;
      });
      setMessages(finalMessages);
    }
  };

  const toggleExternalContextExpanded = (messageId: string) => {
    setExpandedExternalContexts(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      
      {/* Top Document Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 font-serif-legal">Ask This Document</span>
            <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {document.title}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Document-First Retrieval • Answers strictly prioritize verified document evidence over general model knowledge.</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            id="clear-chat-history-btn"
            onClick={handleClearHistory}
            className="text-[11px] font-medium text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 flex items-center gap-1.5 transition-colors"
            title="Reset conversation history for this document"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Suggested Questions Section (Rule 9) */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Suggested Document Questions
          </span>
          <span className="text-[10px] text-slate-400">Click to ask this document</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              id={`suggested-q-${i}`}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-xs font-medium bg-white hover:bg-indigo-50/80 text-slate-800 hover:text-indigo-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 shadow-2xs transition-all text-left flex items-center gap-1.5"
            >
              <span>{q}</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs h-[560px] flex flex-col overflow-hidden">
        
        <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/30">
          
          {isHistoryLoading && (
            <div className="flex items-center justify-center p-6 text-xs text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading conversation history for {document.title}...</span>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const userQuestion = !isUser && index > 0 && messages[index - 1]?.sender === 'user' 
              ? messages[index - 1].content 
              : 'Contract Term Analysis';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl w-full rounded-xl text-xs space-y-3 leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white p-3.5 rounded-br-none max-w-lg'
                    : 'bg-white border border-slate-200 text-slate-800 p-4 rounded-bl-none shadow-xs'
                }`}>
                  
                  {/* User message simple text */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans text-xs">
                      {msg.content}
                    </div>
                  ) : (
                    /* Assistant Response with Strict Rule Distinctions */
                    <div className="space-y-3">
                      
                      {/* Rule 3: Document Name Header Banner */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{msg.documentName || document.title}</span>
                        </div>
                        {msg.isUnsupported ? (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                            Unsupported by Document
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                            Verified in Document
                          </span>
                        )}
                      </div>

                      {/* Rule 4: If Unsupported by document */}
                      {msg.isUnsupported ? (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-2 text-amber-900">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-xs">
                                "I couldn't find enough information to answer that from the uploaded document."
                              </p>
                              <p className="text-[11px] text-amber-800 mt-1">
                                LexLens does not fill missing information with guesses. The uploaded text of <em>{document.title}</em> does not appear to state explicit provisions on this matter.
                              </p>
                            </div>
                          </div>
                          
                          {/* Option to check external legal context instead */}
                          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                            <span className="text-[10px] text-amber-700">Want to know typical commercial practices?</span>
                            <button
                              onClick={() => handleCheckExternalContext(msg.id, userQuestion, msg)}
                              disabled={msg.isCheckingExternalContext}
                              className="text-[10px] font-semibold bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 px-2.5 py-1 rounded shadow-2xs flex items-center gap-1 transition-colors"
                            >
                              {msg.isCheckingExternalContext ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Analyzing Market Context...</span>
                                </>
                              ) : (
                                <>
                                  <Scale className="w-3 h-3 text-purple-600" />
                                  <span>Check External Legal Context</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Main Synthesized Answer */}
                          <div className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                            {msg.content}
                          </div>

                          {/* Rule 6 Part A: Explicit Document Language */}
                          {msg.explicitLanguage && msg.explicitLanguage.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <Quote className="w-3 h-3 text-indigo-600" />
                                <span>Explicit Document Language</span>
                              </div>

                              <div className="space-y-2">
                                {msg.explicitLanguage.map((item, idx) => (
                                  <div key={idx} className="bg-white p-2.5 rounded border border-slate-200 text-[11px] space-y-1.5">
                                    <p className="font-serif-legal italic text-slate-800 leading-relaxed">
                                      "{item.quote}"
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                                      <span className="font-semibold text-slate-700">{item.section || 'Document Provision'}</span>
                                      {item.page && (
                                        <button
                                          onClick={() => {
                                            if (onNavigateToPage) onNavigateToPage(item.page!, item.section);
                                            onNavigateTab('review');
                                          }}
                                          className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
                                        >
                                          <span>Page {item.page}</span>
                                          <ArrowUpRight className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rule 6 Part B: Inference (Clearly Labeled) */}
                          {msg.inference && (
                            <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-3 space-y-1 text-slate-800">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                                <Lightbulb className="w-3 h-3 text-indigo-600" />
                                <span>Inference & Practical Implication</span>
                              </div>
                              <p className="text-[11px] text-slate-700 leading-relaxed">
                                {msg.inference}
                              </p>
                              <span className="text-[9px] text-indigo-500 italic block">
                                * Labeled as logical inference derived from explicit contract terms, not verbatim contract text.
                              </span>
                            </div>
                          )}

                          {/* Rule 3 & 10: Clickable Document Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-400">Jump to Document Evidence:</span>
                              {msg.citations.map((c, i) => (
                                <button
                                  key={i}
                                  id={`citation-btn-${msg.id}-${i}`}
                                  onClick={() => {
                                    if (onNavigateToPage) onNavigateToPage(c.page, c.section);
                                    onNavigateTab('review');
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono-legal px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                                  title={`Open Page ${c.page} (${c.section}) in Document Review`}
                                >
                                  <FileText className="w-2.5 h-2.5 text-indigo-500" />
                                  <span className="font-semibold">{msg.documentName || document.title}</span>
                                  <span>• Page {c.page}</span>
                                  {c.section && <span>({c.section})</span>}
                                  <ArrowUpRight className="w-2.5 h-2.5 text-indigo-500" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Rule 7: Separate "Check External Legal Context" Action Button */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                            {!msg.externalLegalContext ? (
                              <button
                                id={`check-external-context-btn-${msg.id}`}
                                onClick={() => handleCheckExternalContext(msg.id, userQuestion, msg)}
                                disabled={msg.isCheckingExternalContext}
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-700 hover:text-purple-900 bg-purple-50/80 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                              >
                                {msg.isCheckingExternalContext ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                                    <span>Analyzing Market Standards & Statutes...</span>
                                  </>
                                ) : (
                                  <>
                                    <Scale className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Check external legal context</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleExternalContextExpanded(msg.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 hover:text-purple-900"
                              >
                                <Scale className="w-3.5 h-3.5 text-purple-600" />
                                <span>External Legal Context ({expandedExternalContexts.has(msg.id) ? 'Collapse' : 'View'})</span>
                                {expandedExternalContexts.has(msg.id) ? (
                                  <ChevronUp className="w-3 h-3 text-purple-600" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-purple-600" />
                                )}
                              </button>
                            )}
                            
                            <span className="text-[9px] text-slate-400">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Rule 6 Part C: Separate External Legal Information Box */}
                          {msg.externalLegalContext && expandedExternalContexts.has(msg.id) && (
                            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3 mt-2 animate-in fade-in">
                              <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                                  <Scale className="w-3.5 h-3.5 text-purple-700" />
                                  <span>{msg.externalLegalContext.label || "External legal information"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {msg.externalLegalContext.dateChecked && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      Checked: {msg.externalLegalContext.dateChecked}
                                    </span>
                                  )}
                                  <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded border border-purple-200">
                                    External Benchmark
                                  </span>
                                </div>
                              </div>

                              {/* Prominent Enforceability Guardrail Banner */}
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-amber-900">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">Important Notice: </span>
                                  <span>Legal rules can depend on jurisdiction, facts, date, and the specific agreement. External search results never determine whether your specific contract is legally enforceable.</span>
                                </div>
                              </div>

                              {/* Market Standard */}
                              {msg.externalLegalContext.marketStandard && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                                    Commercial Market Norms:
                                  </span>
                                  <p className="text-[11px] text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-purple-100">
                                    {msg.externalLegalContext.marketStandard}
                                  </p>
                                </div>
                              )}

                              {/* Statutory Principles */}
                              {msg.externalLegalContext.statutoryPrinciples && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                                    Jurisdictional & Statutory Framework ({document.jurisdiction || 'Commercial Law'}):
                                  </span>
                                  <p className="text-[11px] text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-purple-100">
                                    {msg.externalLegalContext.statutoryPrinciples}
                                  </p>
                                </div>
                              )}

                              {/* Legal Uncertainty or Split */}
                              {msg.externalLegalContext.hasUncertainty && msg.externalLegalContext.uncertaintyOrDisagreement && (
                                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 space-y-1">
                                  <div className="font-bold text-[10px] uppercase text-amber-800 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Identified Legal Uncertainty or Jurisdictional Split:</span>
                                  </div>
                                  <p className="text-amber-800 text-[11px] leading-relaxed">
                                    {msg.externalLegalContext.uncertaintyOrDisagreement}
                                  </p>
                                </div>
                              )}

                              {/* Sources Used */}
                              {msg.externalLegalContext.sources && msg.externalLegalContext.sources.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                                    Authoritative Public Sources Used:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {msg.externalLegalContext.sources.map((s) => (
                                      <a
                                        key={s.id}
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded bg-white border border-purple-100 hover:border-purple-300 text-[10px] text-slate-700 hover:text-purple-950 flex items-center justify-between gap-2 group transition-all"
                                      >
                                        <div className="truncate">
                                          <p className="font-bold truncate group-hover:text-purple-800">{s.title}</p>
                                          <p className="text-[9px] text-slate-400 font-mono">{s.domain}</p>
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-purple-400 shrink-0 group-hover:text-purple-700" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Questions to ask attorney */}
                              {msg.externalLegalContext.attorneyClarifications && msg.externalLegalContext.attorneyClarifications.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                                    Questions to Clarify with Legal Counsel:
                                  </span>
                                  <ul className="space-y-1">
                                    {msg.externalLegalContext.attorneyClarifications.map((q, idx) => (
                                      <li key={idx} className="text-[11px] text-purple-900 bg-white/80 p-2 rounded border border-purple-100 flex items-start gap-1.5">
                                        <span className="text-purple-600 font-bold">•</span>
                                        <span>{q}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Informational Disclaimer */}
                              <div className="pt-2 border-t border-purple-200/50 text-[10px] text-purple-700 italic flex items-center justify-between gap-2">
                                <span>{msg.externalLegalContext.disclaimer || "External legal information is provided for educational and informational purposes only and does not constitute formal legal advice."}</span>
                                <button
                                  onClick={() => onNavigateTab('context_check')}
                                  className="shrink-0 text-purple-800 font-bold underline hover:text-purple-950 text-[10px]"
                                >
                                  Open in Legal Context Check Dashboard →
                                </button>
                              </div>
                            </div>
                          )}

                        </>
                      )}

                    </div>
                  )}

                  {isUser && (
                    <span className="text-[9px] block text-slate-400 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                    You
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-slate-500 animate-in fade-in">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-slate-700 flex items-center gap-2">
                <span>Retrieving evidence and checking clauses in <strong>{document.title}</strong>...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="ask-input-box"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask any question about ${document.title}...`}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />

            <button
              id="send-ask-query-btn"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

      {/* Footer informational grounding note */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Grounded strictly in: <strong>{document.fileName}</strong> ({document.pages?.length || 1} pages)</span>
        <span>Citations link directly to Document Review viewer</span>
      </div>

    </div>
  );
};
