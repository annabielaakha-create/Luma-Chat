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
import { LibraryItem } from '../types';

const LOCAL_STORAGE_LIB_KEY = 'luma_library';

export function useLibrary(user: User | null) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const cached = localStorage.getItem(LOCAL_STORAGE_LIB_KEY);
      if (cached) {
        try {
          setItems(JSON.parse(cached));
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const colPath = 'library';
    const q = query(
      collection(db, colPath),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LibraryItem[] = [];
        snapshot.forEach((d) => list.push(d.data() as LibraryItem));
        setItems(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore snapshot error on library:', error);
        handleFirestoreError(error, OperationType.LIST, colPath);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveToLibrary = useCallback(
    async (itemData: Omit<LibraryItem, 'id' | 'userId' | 'createdAt'>) => {
      const id = 'lib_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newItem: LibraryItem = {
        ...itemData,
        id,
        userId: user ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      if (user) {
        const path = `library/${id}`;
        try {
          await setDoc(doc(db, 'library', id), newItem);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const updated = [newItem, ...items];
        setItems(updated);
        localStorage.setItem(LOCAL_STORAGE_LIB_KEY, JSON.stringify(updated));
      }

      return newItem;
    },
    [user, items]
  );

  const deleteFromLibrary = useCallback(
    async (id: string) => {
      if (user) {
        const path = `library/${id}`;
        try {
          await deleteDoc(doc(db, 'library', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        const updated = items.filter((item) => item.id !== id);
        setItems(updated);
        localStorage.setItem(LOCAL_STORAGE_LIB_KEY, JSON.stringify(updated));
      }
    },
    [user, items]
  );

  return {
    items,
    loading,
    saveToLibrary,
    deleteFromLibrary
  };
}
