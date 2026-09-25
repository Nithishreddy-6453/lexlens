import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StoredDocument, ChatMessage } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to the specific provisioned Firestore Database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Validate connection to Firestore as mandated by Firebase Integration Skill
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is currently offline. Verifying connection...');
      return false;
    }
    // Expected missing document on fresh database is fine
    return true;
  }
}

// Automatically test connection on boot
testFirestoreConnection().catch(console.error);

/**
 * Save an analyzed document and its structured analysis to Firestore
 */
export async function saveDocumentToFirestore(document: StoredDocument): Promise<void> {
  try {
    const docRef = doc(db, 'documents', document.id);
    
    // Firestore has a 1MB limit per document. If rawText or pdfDataUrl is huge, we preserve metadata & excerpts
    const cleanDoc: Record<string, any> = {
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt,
      documentType: document.documentType,
      jurisdiction: document.jurisdiction,
      pageCount: document.pageCount,
      analysis: document.analysis || null,
      pages: document.pages ? document.pages.slice(0, 100) : [] // Persist page excerpts
    };

    // Store pdfDataUrl only if reasonably sized (under 750KB) to ensure reliable Firestore write
    if (document.pdfDataUrl && document.pdfDataUrl.length < 800000) {
      cleanDoc.pdfDataUrl = document.pdfDataUrl;
    }

    await setDoc(docRef, cleanDoc, { merge: true });
    console.log(`Successfully stored document ${document.id} in Firestore`);
  } catch (err) {
    console.error('Failed to save document to Firestore:', err);
    throw err;
  }
}

/**
 * Fetch all saved documents from Firestore
 */
export async function getDocumentsFromFirestore(): Promise<StoredDocument[]> {
  try {
    const docsRef = collection(db, 'documents');
    const q = query(docsRef);
    const snapshot = await getDocs(q);
    
    const docs: StoredDocument[] = [];
    snapshot.forEach((snap) => {
      docs.push(snap.data() as StoredDocument);
    });

    // Sort by uploadedAt descending
    return docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (err) {
    console.error('Failed to load documents from Firestore:', err);
    return [];
  }
}

/**
 * Fetch a single document by ID from Firestore
 */
export async function getDocumentFromFirestore(id: string): Promise<StoredDocument | null> {
  try {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as StoredDocument;
    }
    return null;
  } catch (err) {
    console.error(`Failed to get document ${id} from Firestore:`, err);
    return null;
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteDocumentFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'documents', id);
    await deleteDoc(docRef);
    console.log(`Deleted document ${id} from Firestore`);
  } catch (err) {
    console.error(`Failed to delete document ${id} from Firestore:`, err);
    throw err;
  }
}

/**
 * Save chat history for a specific document
 */
export async function saveChatHistoryToFirestore(documentId: string, messages: ChatMessage[]): Promise<void> {
  try {
    if (!documentId) return;
    const historyRef = doc(db, 'chatHistories', documentId);
    // Sanitize message items to avoid undefined values
    const cleanMessages = messages.slice(-50).map(msg => ({
      id: msg.id,
      sender: msg.sender,
      timestamp: msg.timestamp,
      content: msg.content,
      mode: msg.mode || 'document_only',
      documentId: documentId,
      documentName: msg.documentName || null,
      isUnsupported: Boolean(msg.isUnsupported),
      explicitLanguage: msg.explicitLanguage || [],
      inference: msg.inference || null,
      citations: msg.citations || [],
      externalLegalContext: msg.externalLegalContext || null
    }));

    await setDoc(historyRef, {
      documentId,
      updatedAt: new Date().toISOString(),
      messages: cleanMessages
    }, { merge: true });
  } catch (err) {
    console.warn(`Could not save chat history to Firestore for ${documentId}:`, err);
  }
}

/**
 * Get chat history for a specific document
 */
export async function getChatHistoryFromFirestore(documentId: string): Promise<ChatMessage[] | null> {
  try {
    if (!documentId) return null;
    const historyRef = doc(db, 'chatHistories', documentId);
    const snap = await getDoc(historyRef);
    if (snap.exists() && snap.data()?.messages) {
      return snap.data().messages as ChatMessage[];
    }
    return null;
  } catch (err) {
    console.warn(`Could not load chat history from Firestore for ${documentId}:`, err);
    return null;
  }
}

/**
 * Clear chat history for a specific document
 */
export async function clearChatHistoryFromFirestore(documentId: string): Promise<void> {
  try {
    if (!documentId) return;
    const historyRef = doc(db, 'chatHistories', documentId);
    await deleteDoc(historyRef);
  } catch (err) {
    console.warn(`Could not delete chat history from Firestore for ${documentId}:`, err);
  }
}

