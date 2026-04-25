import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc, setDoc, limit, increment } from 'firebase/firestore';
import { Send, Search, User, MoreVertical, Phone, Video, Smile, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  updatedAt: any;
  createdAt: any;
  unreadCount?: Record<string, number>;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: any;
  read: boolean;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('chat');
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      // Sort client-side to avoid composite index requirement
      chatList.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setChats(chatList);
      setLoading(false);

      // Fetch profiles for participants
      const participantIds = Array.from(new Set(chatList.flatMap(chat => chat.participants)));
      const newProfiles = { ...userProfiles };
      let updated = false;

      for (const id of participantIds) {
        if (!newProfiles[id]) {
          const userDoc = await getDoc(doc(db, 'users', id));
          if (userDoc.exists()) {
            newProfiles[id] = userDoc.data() as UserProfile;
            updated = true;
          }
        }
      }

      if (updated) {
        setUserProfiles(newProfiles);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle targetUserId from query params
  useEffect(() => {
    if (!user || !targetUserId || !chats.length) return;

    const existingChat = chats.find(chat => 
      chat.participants.includes(targetUserId) && chat.participants.length === 2
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      // Clear the search param so it doesn't keep re-selecting if the user switches away
      setSearchParams({}, { replace: true });
    } else {
      // If no existing chat, we might need to fetch the user profile to show who we're chatting with
      const fetchTargetProfile = async () => {
        if (!userProfiles[targetUserId]) {
          const userDoc = await getDoc(doc(db, 'users', targetUserId));
          if (userDoc.exists()) {
            setUserProfiles(prev => ({
              ...prev,
              [targetUserId]: userDoc.data() as UserProfile
            }));
          }
        }
        
        // Create a temporary chat object for the UI
        const tempChat: Chat = {
          id: 'new',
          participants: [user.uid, targetUserId],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        setSelectedChat(tempChat);
      };
      fetchTargetProfile();
    }
  }, [targetUserId, chats, user, setSearchParams]);

  useEffect(() => {
    if (!selectedChat || selectedChat.id === 'new') {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(messageList);

      // Mark messages as read and reset unread count
      if (user && selectedChat) {
        const hasUnread = messageList.some(msg => msg.senderId !== user.uid && !msg.read);
        if (hasUnread) {
          messageList.forEach(msg => {
            if (msg.senderId !== user.uid && !msg.read) {
              updateDoc(doc(db, 'chats', selectedChat.id, 'messages', msg.id), { read: true });
            }
          });
        }
        
        // Reset unread count for current user
        if (selectedChat.unreadCount?.[user.uid]) {
          updateDoc(doc(db, 'chats', selectedChat.id), {
            [`unreadCount.${user.uid}`]: 0
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat.id}/messages`);
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChat || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      let chatId = selectedChat.id;

      if (chatId === 'new') {
        // Create new chat document
        const chatData = {
          participants: selectedChat.participants,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: messageContent,
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [selectedChat.participants.find(id => id !== user.uid)!]: 1,
            [user.uid]: 0
          }
        };
        const chatRef = await addDoc(collection(db, 'chats'), chatData);
        chatId = chatRef.id;
        
        // Update selectedChat to the new chat (temp object until snapshot updates)
        setSelectedChat({
          id: chatId,
          ...chatData,
          lastMessageAt: { toDate: () => new Date() } // Temp for UI
        } as any);
      }

      const messageData = {
        chatId: chatId,
        senderId: user.uid,
        content: messageContent,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      if (selectedChat.id !== 'new') {
        const otherId = selectedChat.participants.find(id => id !== user.uid);
        
        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: messageContent,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          [`unreadCount.${otherId}`]: increment(1)
        });
      } else {
        // If it was a new chat, we should clear the search param
        setSearchParams({}, { replace: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${selectedChat.id === 'new' ? 'new' : selectedChat.id}/messages`);
      toast.error('Failed to send message');
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(id => id !== user?.uid);
    return otherId ? userProfiles[otherId] : null;
  };

  const filteredChats = chats.filter(chat => {
    const otherUser = getOtherParticipant(chat);
    if (!otherUser) return true;
    return otherUser.displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-surface">
        <div className="relative">
          <div className="w-24 h-24 border-2 border-on-surface border-t-primary animate-spin shadow-brutal"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-secondary border-2 border-on-surface animate-ping"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] bg-surface border-2 border-outline/15 shadow-brutal overflow-hidden flex relative font-sans">
      <div className="absolute top-0 left-0 w-full h-1 liquid-gradient z-30" />
      {/* Chat List */}
      <div className="w-96 border-r-2 border-outline/15 flex flex-col bg-surface-container-low relative z-20">
        <div className="p-10 border-b-2 border-outline/15 bg-surface relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary opacity-10 blur-2xl rounded-full" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h1 className="text-4xl font-headline font-black uppercase italic tracking-tighter text-on-surface">Founder_Talk</h1>
            <button 
              className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:bg-secondary hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
              onClick={() => toast.success('Search for a founder on their profile to start a chat!')}
            >
              <Send className="w-6 h-6 stroke-[3px] text-on-surface" />
            </button>
          </div>
          <div className="relative z-10">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-on-surface-variant stroke-[3px]" />
            <input 
              type="text" 
              placeholder="SEARCH_ECHOES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest border-2 border-on-surface py-4 pl-16 pr-6 text-sm uppercase font-black italic tracking-widest shadow-brutal focus:outline-none transition-all placeholder:text-on-surface-variant/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-container-low">
          {filteredChats.length === 0 ? (
            <div className="p-16 text-center bg-surface-container-lowest border-2 border-dashed border-outline/15 shadow-brutal">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant italic">
                {searchTerm ? 'NO_ECHOES_FOUND.' : 'NO_ECHOES_YET.'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const otherUser = getOtherParticipant(chat);
              const isActive = selectedChat?.id === chat.id;

              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "w-full border-2 border-on-surface p-5 flex items-center gap-5 transition-all text-left group relative",
                    isActive 
                      ? "bg-primary shadow-none translate-x-1 translate-y-1" 
                      : "bg-surface shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 border-2 border-on-surface shadow-brutal overflow-hidden group-hover:-rotate-6 transition-transform">
                      <img 
                        src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}&background=random`} 
                        alt={otherUser?.displayName || 'User'} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent border-2 border-on-surface shadow-brutal"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-base font-black uppercase italic tracking-tight text-on-surface truncate">{otherUser?.displayName || 'LOADING...'}</p>
                      {chat.lastMessageAt && (
                        <span className="text-[8px] text-on-surface-variant uppercase font-black tracking-widest italic">
                          {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={cn(
                        "text-[10px] truncate flex-1 font-black italic tracking-tight",
                        chat.unreadCount?.[user?.uid || ''] ? "text-on-surface" : "text-on-surface-variant"
                      )}>
                        {chat.lastMessage || 'No echoes yet'}
                      </p>
                      {chat.unreadCount?.[user?.uid || ''] ? (
                        <span className="w-4 h-4 bg-secondary border-2 border-on-surface animate-pulse shadow-brutal"></span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-surface relative">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-8 bg-surface border-b-2 border-outline/15 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-on-surface shadow-brutal overflow-hidden -rotate-3">
                    <img 
                      src={getOtherParticipant(selectedChat)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChat)?.displayName || 'User'}&background=random`} 
                      alt={getOtherParticipant(selectedChat)?.displayName || 'User'} 
                      className="w-full h-full object-cover grayscale"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent border-2 border-on-surface shadow-brutal"></div>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black uppercase italic tracking-tighter text-on-surface">{getOtherParticipant(selectedChat)?.displayName || 'LOADING...'}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.2em] italic">ACTIVE_PROTOCOL</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all hover:bg-primary">
                  <Phone className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all hover:bg-accent">
                  <Video className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all hover:bg-secondary">
                  <MoreVertical className="w-6 h-6 stroke-[3px]" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-surface-container-lowest relative">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex items-end gap-5 relative z-10",
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isMe && (
                      <div className="w-12 h-12 shrink-0">
                        {showAvatar && (
                          <div className="w-12 h-12 border-2 border-on-surface shadow-brutal overflow-hidden rotate-3">
                            <img 
                              src={getOtherParticipant(selectedChat)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChat)?.displayName || 'User'}&background=random`} 
                              alt="Avatar" 
                              className="w-full h-full object-cover grayscale"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[70%] p-6 border-2 border-on-surface shadow-brutal text-base font-black italic tracking-tight relative",
                      isMe 
                        ? "bg-primary text-black" 
                        : "bg-surface-container-low text-on-surface"
                    )}>
                      <p className="leading-tight uppercase">"{msg.content}"</p>
                      <p className={cn(
                        "text-[8px] mt-3 font-black uppercase tracking-widest text-on-surface-variant italic",
                        isMe ? "text-right" : "text-left"
                      )}>
                        {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'SYNCING...'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-10 bg-surface border-t-2 border-outline/15 relative z-10">
              <form onSubmit={handleSendMessage} className="flex items-center gap-6">
                <button type="button" className="bg-surface border-2 border-on-surface p-4 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all hover:bg-secondary">
                  <Paperclip className="w-8 h-8 stroke-[3px]" />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="TYPE_AN_ECHO..."
                    className="w-full bg-surface-container-lowest border-2 border-on-surface py-5 px-8 pr-20 text-lg font-black uppercase italic tracking-widest shadow-brutal focus:outline-none transition-all placeholder:text-on-surface-variant/20"
                  />
                  <button type="button" className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition-all hover:scale-125">
                    <Smile className="w-8 h-8 stroke-[3px]" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-on-surface text-surface p-5 border-2 border-on-surface shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:bg-accent"
                >
                  <Send className="w-8 h-8 stroke-[3px]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center relative overflow-hidden bg-surface-container-lowest">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="w-32 h-32 bg-secondary border-2 border-on-surface shadow-brutal flex items-center justify-center mb-12 rotate-6 hover:rotate-0 transition-transform relative z-10">
              <Send className="w-16 h-16 text-on-secondary -rotate-12 stroke-[3px]" />
            </div>
            <h2 className="text-5xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-6 relative z-10">YOUR_ECHOES</h2>
            <div className="bg-surface-container-low border-2 border-on-surface p-6 shadow-brutal -rotate-1 relative z-10">
              <p className="text-on-surface font-black italic text-xl tracking-tight uppercase">
                "SELECT_A_CONVERSATION_TO_INITIATE_LINK."
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
