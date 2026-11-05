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
  getDocs
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
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = msg;
          return next;
        }
        return [...prev, msg];
      });

      if (user) {
        const path = `conversations/${msg.conversationId}/messages/${msg.id}`;
        try {
          await setDoc(doc(db, 'conversations', msg.conversationId, 'messages', msg.id), msg);
          // Update conversation updatedAt and lastMessage
          await updateDoc(doc(db, 'conversations', msg.conversationId), {
            updatedAt: new Date().toISOString(),
            lastMessage: msg.content.slice(0, 120)
          });
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
            ? { ...c, updatedAt: new Date().toISOString(), lastMessage: msg.content.slice(0, 120) }
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
