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
import { ImageRecord } from '../types';

const LOCAL_STORAGE_IMAGES_KEY = 'luma_images';

export function useImages(user: User | null) {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      const cached = localStorage.getItem(LOCAL_STORAGE_IMAGES_KEY);
      if (cached) {
        try {
          setImages(JSON.parse(cached));
        } catch {
          setImages([]);
        }
      } else {
        setImages([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const colPath = 'images';
    const q = query(
      collection(db, colPath),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ImageRecord[] = [];
        snapshot.forEach((d) => list.push(d.data() as ImageRecord));
        setImages(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore snapshot error on images:', error);
        handleFirestoreError(error, OperationType.LIST, colPath);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addImage = useCallback(
    async (imageData: Omit<ImageRecord, 'id' | 'userId' | 'createdAt'>) => {
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newImg: ImageRecord = {
        ...imageData,
        id,
        userId: user ? user.uid : 'guest',
        createdAt: new Date().toISOString()
      };

      if (user) {
        const path = `images/${id}`;
        try {
          await setDoc(doc(db, 'images', id), newImg);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const updated = [newImg, ...images];
        setImages(updated);
        localStorage.setItem(LOCAL_STORAGE_IMAGES_KEY, JSON.stringify(updated));
      }

      return newImg;
    },
    [user, images]
  );

  const deleteImage = useCallback(
    async (imageId: string) => {
      if (user) {
        const path = `images/${imageId}`;
        try {
          await deleteDoc(doc(db, 'images', imageId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        const updated = images.filter((img) => img.id !== imageId);
        setImages(updated);
        localStorage.setItem(LOCAL_STORAGE_IMAGES_KEY, JSON.stringify(updated));
      }
    },
    [user, images]
  );

  return {
    images,
    loading,
    addImage,
    deleteImage
  };
}
