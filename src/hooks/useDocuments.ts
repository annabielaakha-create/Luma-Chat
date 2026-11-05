import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { DocumentRecord } from '../types';

const LOCAL_STORAGE_DOCS_KEY = 'luma_documents';

export function useDocuments(user: User | null) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const cached = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
      if (cached) {
        try {
          setDocuments(JSON.parse(cached));
        } catch {
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const colPath = 'documents';
    const q = query(
      collection(db, colPath),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: DocumentRecord[] = [];
        snapshot.forEach((d) => docs.push(d.data() as DocumentRecord));
        setDocuments(docs);
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore snapshot error on documents:', error);
        handleFirestoreError(error, OperationType.LIST, colPath);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addDocument = useCallback(
    async (docData: Omit<DocumentRecord, 'id' | 'userId' | 'createdAt'>) => {
      const id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newDoc: DocumentRecord = {
        ...docData,
        id,
        userId: user ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      if (user) {
        const path = `documents/${id}`;
        try {
          await setDoc(doc(db, 'documents', id), newDoc);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const updated = [newDoc, ...documents];
        setDocuments(updated);
        localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(updated));
      }

      return newDoc;
    },
    [user, documents]
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (user) {
        const path = `documents/${documentId}`;
        try {
          await deleteDoc(doc(db, 'documents', documentId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        const updated = documents.filter((d) => d.id !== documentId);
        setDocuments(updated);
        localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(updated));
      }
    },
    [user, documents]
  );

  return {
    documents,
    loading,
    addDocument,
    deleteDocument
  };
}
