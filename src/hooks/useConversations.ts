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
        const convs: Conversation[] = [];
        snapshot.forEach((d) => {
          convs.push(d.data() as Conversation);
        });
        setConversations(convs);
        setLoading(false);

        // Auto select first conversation if active one is missing
        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationId(convs[0].id);
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

  // Create a new conversation
  const createConversation = useCallback(
    async (model = 'LUMA 1.0', initialTitle = 'New Conversation') => {
      const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newConv: Conversation = {
        id,
        userId: user ? user.uid : 'guest',
        title: initialTitle,
        model,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0
      };

      if (user) {
        const path = `conversations/${id}`;
        try {
          await setDoc(doc(db, 'conversations', id), newConv);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        const updated = [newConv, ...conversations];
        setConversations(updated);
        localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(updated));
      }

      setActiveConversationId(id);
      setMessages([]);
      return id;
    },
    [user, conversations]
  );

  // Save or update a message
  const saveMessage = useCallback(
    async (msg: ChatMessage) => {
      // Clean and ensure valid properties without undefined values
      const sanitizedMsg: Record<string, any> = {
        id: msg.id,
        conversationId: msg.conversationId,
        userId: user ? user.uid : 'guest',
        role: msg.role,
        content: msg.content || '',
        createdAt: msg.createdAt || new Date().toISOString()
      };
      if (msg.model) sanitizedMsg.model = msg.model;
      if (msg.attachments && msg.attachments.length > 0) sanitizedMsg.attachments = msg.attachments;
      if (msg.artifacts && msg.artifacts.length > 0) sanitizedMsg.artifacts = msg.artifacts;
      if (msg.isStreaming !== undefined) sanitizedMsg.isStreaming = Boolean(msg.isStreaming);

      // Optimistically update local message state immediately
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        const resolved: ChatMessage = {
          ...msg,
          userId: user ? user.uid : 'guest'
        };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = resolved;
          return next;
        }
        return [...prev, resolved];
      });

      if (user) {
        const path = `conversations/${msg.conversationId}/messages/${msg.id}`;
        try {
          const convRef = doc(db, 'conversations', msg.conversationId);
          // Verify that the parent conversation document exists in Firestore before writing subcollection message
          const convSnap = await getDoc(convRef);
          if (!convSnap.exists()) {
            await setDoc(convRef, {
              id: msg.conversationId,
              userId: user.uid,
              title: msg.content.trim().slice(0, 36) || 'New Conversation',
              model: msg.model || 'LUMA 1.0',
              createdAt: msg.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastMessage: (msg.content || '').slice(0, 120),
              messageCount: 1
            });
          } else {
            await updateDoc(convRef, {
              updatedAt: new Date().toISOString(),
              lastMessage: (msg.content || '').slice(0, 120)
            });
          }

          // Persist message with verified user.uid ownership
          await setDoc(doc(db, 'conversations', msg.conversationId, 'messages', msg.id), sanitizedMsg);
        } catch (err) {
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

        // Update conversation summary
        const updatedConvs = conversations.map((c) =>
          c.id === msg.conversationId
            ? { ...c, updatedAt: new Date().toISOString(), lastMessage: (msg.content || '').slice(0, 120) }
            : c
        );
        setConversations(updatedConvs);
        localStorage.setItem(LOCAL_STORAGE_CONVS_KEY, JSON.stringify(updatedConvs));
      }
    },
    [user, conversations]
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
