import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment, deleteDoc, arrayUnion } from 'firebase/firestore';
import { Send, MoreHorizontal, Trash2, MessageCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfirmModal } from './ConfirmModal';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { logActivity } from '../lib/activities';

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  parentId?: string;
  replyCount?: number;
  createdAt: any;
}

interface PostCommentsProps {
  postId: string;
  postAuthorId: string;
}

export function PostComments({ postId, postAuthorId }: PostCommentsProps) {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async (e: React.FormEvent, parentId?: string, contentOverride?: string) => {
    e?.preventDefault();
    const contentToSubmit = contentOverride || newComment;
    if (!contentToSubmit.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const commentData: any = {
        postId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        content: contentToSubmit.trim(),
        createdAt: serverTimestamp(),
      };

      if (parentId) {
        commentData.parentId = parentId;
      }

      await addDoc(collection(db, 'comments'), commentData);

      // Increment comment count on the post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });

      // If it's a reply, increment replyCount on the parent comment
      if (parentId) {
        const parentRef = doc(db, 'comments', parentId);
        await updateDoc(parentRef, {
          replyCount: increment(1)
        });
      }

      // Create notification if commenting on someone else's post
      // If it's a reply, we might want to notify the parent comment author instead,
      // but for simplicity we'll notify the post author, or both.
      // Let's notify the post author if it's a top-level comment, or if we are replying to someone else's comment, notify them.
      let notifyUserId = postAuthorId;
      let notifyType = 'comment';
      let notifyContent = 'commented on your post';

      if (parentId) {
        const parentComment = comments.find(c => c.id === parentId);
        if (parentComment && parentComment.authorId !== user.uid) {
          notifyUserId = parentComment.authorId;
          notifyType = 'comment';
          notifyContent = 'replied to your comment';
        } else {
          notifyUserId = ''; // Don't notify if replying to own comment
        }
      }

      if (notifyUserId && notifyUserId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: notifyUserId,
          type: notifyType,
          sourceUserId: user.uid,
          sourceUserName: user.displayName || 'Someone',
          sourceUserPhoto: user.photoURL || '',
          content: notifyContent,
          link: `/feed`, // Or a specific post page if it exists
          read: false,
          createdAt: serverTimestamp()
        });
      }

      if (!parentId) {
        setNewComment('');
      }

      // Log activity
      await logActivity({
        userId: user.uid,
        type: 'comment_post',
        targetId: postId,
        targetName: 'a transmission',
        metadata: {
          commentSnippet: contentToSubmit.slice(0, 50) + (contentToSubmit.length > 50 ? '...' : '')
        }
      });

      toast.success('Comment posted!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
      toast.error('Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    const toastId = toast.loading('Deleting comment...');
    try {
      const comment = comments.find(c => c.id === commentToDelete);
      await deleteDoc(doc(db, 'comments', commentToDelete));
      
      // Decrement comment count on the post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1)
      });

      // If it was a reply, decrement replyCount on parent
      if (comment?.parentId) {
        const parentRef = doc(db, 'comments', comment.parentId);
        await updateDoc(parentRef, {
          replyCount: increment(-1)
        });
      }
      toast.success('Comment deleted.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${commentToDelete}`);
      toast.error('Failed to delete comment.', { id: toastId });
    } finally {
      setCommentToDelete(null);
    }
  };

  const topLevelComments = comments.filter(c => !c.parentId && !userProfile?.blockedUsers?.includes(c.authorId));
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId && !userProfile?.blockedUsers?.includes(c.authorId));

  const handleBlockUser = async (authorId: string) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: 'BLOCK_USER',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_SEVER_THIS_CONNECTION_AND_ERASE_THEIR_DATA_STREAM_FROM_YOUR_VIEW?',
      onConfirm: async () => {
        const toastId = toast.loading('Blocking user...');
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            blockedUsers: arrayUnion(authorId)
          });
          toast.success('User blocked.', { id: toastId });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
          toast.error('Failed to block user.', { id: toastId });
        }
      }
    });
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
    const [showReply, setShowReply] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const replies = getReplies(comment.id);

    const submitReply = async (e: React.FormEvent) => {
      e.preventDefault();
      await handleAddComment(e, comment.id, replyContent);
      setReplyContent('');
      setShowReply(false);
    };

    return (
      <div className={`flex gap-3 ${depth > 0 ? 'mt-3' : 'mt-4'}`}>
      <Link to={`/profile/${comment.authorId}`} className="w-10 h-10 border-[4px] border-on-surface shrink-0 shadow-kinetic-sm block hover:scale-105 transition-transform overflow-hidden">
        <img 
          src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}`} 
          alt={comment.authorName} 
          className="w-full h-full object-cover"
        />
      </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-surface-bg border-[6px] border-on-surface p-4 inline-block min-w-[240px] max-w-full relative group shadow-kinetic-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link to={`/profile/${comment.authorId}`} className="font-black text-xs text-on-surface uppercase italic hover:text-primary transition-colors">
                  {comment.authorName}
                </Link>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1 -mt-1 -mr-1 text-on-surface/40 hover:text-on-surface transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showOptions && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-surface-container border-[6px] border-on-surface shadow-kinetic-active z-10 overflow-hidden">
                    {user?.uid === comment.authorId ? (
                      <button 
                        onClick={() => {
                          setCommentToDelete(comment.id);
                          setShowOptions(false);
                          setConfirmModal({
                            isOpen: true,
                            title: 'PURGE_COMMENT',
                            message: 'ARE_YOU_SURE_YOU_WANT_TO_WIPE_THIS_INTEL_FROM_THE_THREAD?_THIS_ACTION_IS_IRREVERSIBLE!',
                            onConfirm: handleDeleteComment
                          });
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-black uppercase italic text-secondary hover:bg-on-surface hover:text-surface-bg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> DELETE
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          handleBlockUser(comment.authorId);
                          setShowOptions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-black uppercase italic text-secondary hover:bg-on-surface hover:text-surface-bg transition-colors"
                      >
                        BLOCK
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm font-black text-on-surface mt-2 whitespace-pre-wrap break-words italic tracking-tight">
              {comment.content}
            </p>
          </div>
          
          <div className="flex items-center gap-6 mt-2 ml-2 text-[10px] font-black uppercase italic text-on-surface/60">
            <span>{comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'JUST NOW'}</span>
            <button 
              onClick={() => setShowReply(!showReply)}
              className="hover:text-primary transition-colors"
            >
              REPLY
            </button>
            {comment.replyCount && comment.replyCount > 0 ? (
              <span className="flex items-center gap-2 text-accent">
                <MessageCircle className="w-4 h-4" /> {comment.replyCount}
              </span>
            ) : null}
          </div>

          {showReply && (
            <form onSubmit={submitReply} className="flex gap-4 mt-4">
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}`} 
                alt="You" 
                className="w-8 h-8 border-[4px] border-on-surface object-cover shrink-0"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="SPIT IT OUT..."
                  className="w-full bg-surface-bg border-[4px] border-on-surface py-2 pl-4 pr-10 text-xs font-black uppercase italic text-on-surface placeholder:text-on-surface/20 focus:bg-accent/10 outline-none shadow-kinetic-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!replyContent.trim() || isSubmitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface hover:text-primary disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {replies.length > 0 && (
            <div className="space-y-1">
              {replies.map(reply => (
                <div key={reply.id}>
                  <CommentItem comment={reply} depth={depth + 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 pt-8 border-t-[6px] border-on-surface">
      <div className="mb-10 space-y-6">
        {topLevelComments.map((comment) => (
          <div key={comment.id}>
            <CommentItem comment={comment} />
          </div>
        ))}
      </div>

      <form onSubmit={(e) => handleAddComment(e)} className="flex gap-4">
        <img 
          src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}`} 
          alt="You" 
          className="w-12 h-12 border-[6px] border-on-surface object-cover shrink-0 shadow-kinetic-sm"
        />
        <div className="flex-1 relative">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="ADD TO THE CHAOS..."
            className="w-full bg-surface-bg border-[6px] border-on-surface py-4 pl-6 pr-14 text-sm font-black uppercase italic text-on-surface placeholder:text-on-surface/20 focus:bg-primary/10 outline-none shadow-kinetic"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-on-surface hover:text-primary disabled:opacity-50 transition-colors"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
