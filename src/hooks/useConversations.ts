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
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { Conversation, ChatMessage } from '../types';
import { normalizeFirestoreData } from '../utils/firestoreNormalizer';

const LOCAL_STORAGE_CONVS_KEY = 'luma_conversations';
const LOCAL_STORAGE_MSGS_PREFIX = 'luma_messages_';

export function useConversations(user: User | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversations from Firestore or localStorage
  useEffect(() => {
    if (!user) {
      // Load guest conversations from localStorage
      const cached = localStorage.getItem(LOCAL_STORAGE_CONVS_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConversations(parsed);
          if (parsed.length > 0 && !activeConversationId) {
            setActiveConversationId(parsed[0].id);
          }
        } catch {
          setConversations([]);
        }
      } else {
        setConversations([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const colPath = 'conversations';
    const q = query(
      collection(db, colPath),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreConvs: Conversation[] = [];
        snapshot.forEach((d) => {
          firestoreConvs.push(d.data() as Conversation);
        });

        // Merge Firestore snapshot with any pending local optimistic conversations
        setConversations((prev) => {
          const firestoreMap = new Map<string, Conversation>();
          firestoreConvs.forEach((c) => firestoreMap.set(c.id, c));

          const merged: Conversation[] = [...firestoreConvs];

          // Preserve pending optimistic conversations not yet indexed in snapshot
          prev.forEach((localConv) => {
            if (!firestoreMap.has(localConv.id)) {
              merged.push(localConv);
            }
          });

          // Sort by updatedAt descending to ensure latest activity is top
          merged.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          return merged;
        });
        setLoading(false);

        // Auto select first conversation if active one is missing
        if (firestoreConvs.length > 0 && !activeConversationId) {
          setActiveConversationId(firestoreConvs[0].id);
        }
      },
      (error) => {
        console.warn('Firestore snapshot error on conversations:', error);
        handleFirestoreError(error, OperationType.LIST, colPath);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Load messages for the active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    if (!user) {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_MSGS_PREFIX}${activeConversationId}`);
      if (cached) {
        try {
          setMessages(JSON.parse(cached));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
      return;
    }

    const messagesColPath = `conversations/${activeConversationId}/messages`;
    const q = query(collection(db, messagesColPath), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push(d.data() as ChatMessage);
        });
        setMessages(msgs);
      },
      (error) => {
        console.warn('Firestore snapshot error on messages:', error);
        handleFirestoreError(error, OperationType.LIST, messagesColPath);
      }
    );

    return () => unsubscribe();
  }, [activeConversationId, user]);

  // Create a new conversation immediately with optimistic UI update
  const createConversation = useCallback(
    async (model = 'LUMA 1.0', initialTitle = 'New Conversation') => {
      const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const now = new Date().toISOString();
      const currentUid = user ? user.uid : 'guest';
      const newConv: Conversation = {
        id,
        userId: currentUid,
        title: initialTitle,
        model,
        createdAt: now,
        updatedAt: now,
        messageCount: 0
      };

      // 1. Optimistically display in sidebar immediately
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== id)]);
      setActiveConversationId(id);
      setMessages([]);

      // 2. Persist to Firestore or localStorage
      if (user) {
        const path = `conversations/${id}`;
        try {
          await setDoc(doc(db, 'conversations', id), newConv);
        } catch (err) {
          console.error('Failed to create conversation document:', err);
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const cached = localStorage.getItem(LOCAL_STORAGE_CONVS_KEY);
        let list: Conversation[] = [];
        if (cached) {
          try { list = JSON.parse(cached); } catch { list = []; }
        }
        const updated = [newConv, ...list.filter((c) => c.id !== id)];
        localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(updated));
      }

      return id;
    },
    [user]
  );

  // Save or update a message
  const saveMessage = useCallback(
    async (msg: ChatMessage) => {
      const currentUid = user ? user.uid : 'guest';
      const now = new Date().toISOString();

      // Clean and ensure valid properties without undefined values
      const sanitizedMsg: Record<string, any> = {
        id: msg.id,
        conversationId: msg.conversationId,
        userId: currentUid,
        role: msg.role,
        content: msg.content || '',
        createdAt: msg.createdAt || now
      };
      if (msg.model) sanitizedMsg.model = msg.model;
      if (msg.attachments && msg.attachments.length > 0) sanitizedMsg.attachments = msg.attachments;
      if (msg.artifacts && msg.artifacts.length > 0) sanitizedMsg.artifacts = msg.artifacts;
      if (msg.isStreaming !== undefined) sanitizedMsg.isStreaming = Boolean(msg.isStreaming);

      // 1. Optimistically update local message state immediately
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        const resolved: ChatMessage = {
          ...msg,
          userId: currentUid
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = resolved;
          return next;
        }
        return [...prev, resolved];
      });

      // 2. Optimistically update conversation entry in the sidebar immediately
      const lastMsgSnippet = (msg.content || '').slice(0, 120);
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx >= 0) {
          const updated = [...prev];
          const existing = updated[idx];
          let updatedTitle = existing.title;
          // If title was generic 'New Conversation', adapt to the first user prompt
          if (msg.role === 'user' && (existing.title === 'New Conversation' || !existing.title)) {
            updatedTitle = msg.content.trim().slice(0, 36) || 'New Conversation';
          }
          updated[idx] = {
            ...existing,
            title: updatedTitle,
            updatedAt: now,
            lastMessage: lastMsgSnippet,
            messageCount: (existing.messageCount || 0) + 1
          };
          // Move updated conversation to the top
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          // If conversation is brand new, immediately show it at the top of the sidebar
          const newConv: Conversation = {
            id: msg.conversationId,
            userId: currentUid,
            title: msg.content.trim().slice(0, 36) || 'New Conversation',
            model: msg.model || 'LUMA 1.0',
            createdAt: now,
            updatedAt: now,
            lastMessage: lastMsgSnippet,
            messageCount: 1
          };
          return [newConv, ...prev];
        }
      });

      // 3. Persist to Firestore or localStorage
      if (user) {
        const path = `conversations/${msg.conversationId}/messages/${msg.id}`;
        try {
          const convRef = doc(db, 'conversations', msg.conversationId);
          const convUpdate: Record<string, any> = {
            id: msg.conversationId,
            userId: user.uid,
            updatedAt: now,
            lastMessage: lastMsgSnippet
          };

          if (msg.role === 'user') {
            convUpdate.title = msg.content.trim().slice(0, 36) || 'New Conversation';
            convUpdate.model = msg.model || 'LUMA 1.0';
            convUpdate.createdAt = msg.createdAt || now;
          }

          // Recursively clean undefined values to protect Firestore from crashes
          const cleanConvUpdate = normalizeFirestoreData(convUpdate);
          const cleanSanitizedMsg = normalizeFirestoreData(sanitizedMsg);

          // Concurrently update conversation metadata & write the message
          await Promise.all([
            setDoc(convRef, cleanConvUpdate, { merge: true }),
            setDoc(doc(db, 'conversations', msg.conversationId, 'messages', msg.id), cleanSanitizedMsg)
          ]);
        } catch (err) {
          console.error('Failed to save message to Firestore (local state preserved):', err);
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      } else {
        const key = `${LOCAL_STORAGE_MSGS_PREFIX}${msg.conversationId}`;
        const existing = localStorage.getItem(key);
        let list: ChatMessage[] = [];
        if (existing) {
          try {
            list = JSON.parse(existing);
          } catch {
            list = [];
          }
        }
        const idx = list.findIndex((m) => m.id === msg.id);
        if (idx >= 0) list[idx] = msg;
        else list.push(msg);
        localStorage.setItem(key, JSON.stringify(list));

        // Update guest conversations in localStorage
        const cachedConvs = localStorage.getItem(LOCAL_STORAGE_CONVS_KEY);
        let convList: Conversation[] = [];
        if (cachedConvs) {
          try { convList = JSON.parse(cachedConvs); } catch { convList = []; }
        }
        const cIdx = convList.findIndex((c) => c.id === msg.conversationId);
        if (cIdx >= 0) {
          convList[cIdx] = {
            ...convList[cIdx],
            updatedAt: now,
            lastMessage: lastMsgSnippet
          };
          if (msg.role === 'user' && convList[cIdx].title === 'New Conversation') {
            convList[cIdx].title = msg.content.trim().slice(0, 36) || 'New Conversation';
          }
        } else {
          convList.unshift({
            id: msg.conversationId,
            userId: 'guest',
            title: msg.content.trim().slice(0, 36) || 'New Conversation',
            model: msg.model || 'LUMA 1.0',
            createdAt: now,
            updatedAt: now,
            lastMessage: lastMsgSnippet,
            messageCount: 1
          });
        }
        localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(convList));
      }
    },
    [user]
  );

  // Rename a conversation
  const renameConversation = useCallback(
    async (conversationId: string, newTitle: string) => {
      if (user) {
        const path = `conversations/${conversationId}`;
        try {
          await updateDoc(doc(db, 'conversations', conversationId), {
            title: newTitle,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        const updated = conversations.map((c) =>
          c.id === conversationId ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c
        );
        setConversations(updated);
        localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(updated));
      }
    },
    [user, conversations]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (user) {
        const path = `conversations/${conversationId}`;
        try {
          // Delete all messages subcollection first
          const msgsSnap = await getDocs(collection(db, `conversations/${conversationId}/messages`));
          for (const d of msgsSnap.docs) {
            await deleteDoc(d.ref);
          }
          await deleteDoc(doc(db, 'conversations', conversationId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        const updated = conversations.filter((c) => c.id !== conversationId);
        setConversations(updated);
        localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(updated));
        localStorage.removeItem(`${LOCAL_STORAGE_MSGS_PREFIX}${conversationId}`);
      }

      if (activeConversationId === conversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
        setMessages([]);
      }
    },
    [user, conversations, activeConversationId]
  );

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    setMessages,
    loading,
    createConversation,
    saveMessage,
    renameConversation,
    deleteConversation
  };
}
