import React, { useState, useEffect, useRef } from 'react';
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
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
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

  useEffect(() => {
    if (!selectedChat) {
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
      const messageData = {
        chatId: selectedChat.id,
        senderId: user.uid,
        content: messageContent,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), messageData);
      
      const otherId = selectedChat.participants.find(id => id !== user.uid);
      
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: messageContent,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${selectedChat.id}/messages`);
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
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white">
        <div className="relative">
          <div className="w-24 h-24 border-[10px] border-black border-t-neon-pink rounded-full animate-spin shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-neon-yellow border-2 border-black rounded-full animate-ping"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] bg-white border-[10px] border-black shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex relative">
      {/* Chat List */}
      <div className="w-96 border-r-[10px] border-black flex flex-col bg-zinc-50 relative z-20">
        <div className="p-10 border-b-[10px] border-black bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-blue border-l-8 border-b-8 border-black -rotate-12 translate-x-8 -translate-y-8"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-black drop-shadow-[4px_4px_0px_#00ffff]">Troll Talk</h1>
            <button 
              className="bg-black text-white p-3 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:bg-neon-pink"
              onClick={() => toast.success('Search for a troll on their profile to start a chat!')}
            >
              <Send className="w-6 h-6 stroke-[3px]" />
            </button>
          </div>
          <div className="relative z-10">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black stroke-[3px]" />
            <input 
              type="text" 
              placeholder="SEARCH ECHOES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-8 border-black py-4 pl-16 pr-6 text-sm uppercase font-black italic tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all placeholder:text-black/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-100">
          {filteredChats.length === 0 ? (
            <div className="p-16 text-center bg-white border-4 border-dashed border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40 italic">
                {searchTerm ? 'NO ECHOES FOUND.' : 'NO ECHOES YET.'}
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
                    "w-full border-8 border-black p-5 flex items-center gap-5 transition-all text-left group relative",
                    isActive 
                      ? "bg-neon-blue shadow-none translate-x-1 translate-y-1" 
                      : "bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group-hover:-rotate-6 transition-transform">
                      <img 
                        src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}&background=random`} 
                        alt={otherUser?.displayName || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neon-green border-4 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-base font-black uppercase italic tracking-tight text-black truncate">{otherUser?.displayName || 'LOADING...'}</p>
                      {chat.lastMessageAt && (
                        <span className="text-[8px] text-black/40 uppercase font-black tracking-widest italic">
                          {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={cn(
                        "text-[10px] truncate flex-1 font-black italic tracking-tight",
                        chat.unreadCount?.[user?.uid || ''] ? "text-black" : "text-black/40"
                      )}>
                        {chat.lastMessage || 'No echoes yet'}
                      </p>
                      {chat.unreadCount?.[user?.uid || ''] ? (
                        <span className="w-4 h-4 bg-neon-pink border-4 border-black rounded-full flex-shrink-0 animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></span>
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
      <div className="flex-1 flex flex-col bg-zinc-50 relative">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-8 bg-white border-b-[10px] border-black flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden -rotate-3">
                    <img 
                      src={getOtherParticipant(selectedChat)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChat)?.displayName || 'User'}&background=random`} 
                      alt={getOtherParticipant(selectedChat)?.displayName || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neon-green border-4 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                </div>
                <div>
                  <p className="text-3xl font-black uppercase italic tracking-tighter text-black drop-shadow-[2px_2px_0px_#00ffff]">{getOtherParticipant(selectedChat)?.displayName || 'LOADING...'}</p>
                  <p className="text-xs text-neon-green font-black uppercase tracking-[0.2em] italic">Online & Active</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="bg-white border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neon-blue">
                  <Phone className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="bg-white border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neon-green">
                  <Video className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="bg-white border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neon-pink">
                  <MoreVertical className="w-6 h-6 stroke-[3px]" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;

                return (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex items-end gap-5",
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isMe && (
                      <div className="w-12 h-12 shrink-0">
                        {showAvatar && (
                          <div className="w-12 h-12 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden rotate-3">
                            <img 
                              src={getOtherParticipant(selectedChat)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChat)?.displayName || 'User'}&background=random`} 
                              alt="Avatar" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[70%] p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-base font-black italic tracking-tight relative",
                      isMe 
                        ? "bg-neon-blue text-black rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl" 
                        : "bg-white text-black rounded-tl-2xl rounded-tr-2xl rounded-br-2xl"
                    )}>
                      <p className="leading-tight">"{msg.content}"</p>
                      <p className={cn(
                        "text-[8px] mt-3 font-black uppercase tracking-widest text-black/40 italic",
                        isMe ? "text-right" : "text-left"
                      )}>
                        {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'SENDING...'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-10 bg-white border-t-[10px] border-black relative z-10">
              <form onSubmit={handleSendMessage} className="flex items-center gap-6">
                <button type="button" className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neon-yellow">
                  <Paperclip className="w-8 h-8 stroke-[3px]" />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="TYPE AN ECHO..."
                    className="w-full bg-white border-8 border-black py-5 px-8 pr-20 text-lg font-black uppercase italic tracking-widest shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all placeholder:text-black/30"
                  />
                  <button type="button" className="absolute right-6 top-1/2 -translate-y-1/2 text-black hover:text-neon-pink transition-all hover:scale-125">
                    <Smile className="w-8 h-8 stroke-[3px]" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-black text-white p-5 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:bg-neon-green"
                >
                  <Send className="w-8 h-8 stroke-[3px]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:30px_30px]">
            <div className="w-32 h-32 bg-neon-yellow border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-12 rotate-6 hover:rotate-0 transition-transform">
              <Send className="w-16 h-16 text-black -rotate-12 stroke-[3px]" />
            </div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-black mb-6 drop-shadow-[6px_6px_0px_#ff00ff]">Your Echoes</h2>
            <div className="bg-white border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] -rotate-1">
              <p className="text-black font-black italic text-xl tracking-tight">
                "Select a conversation from the left to start chatting with other solo trolls."
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
