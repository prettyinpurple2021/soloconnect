import { doc, writeBatch, arrayUnion, arrayRemove, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { logActivity } from './activities';

export type ConnectionState = 'connected' | 'pending' | 'incoming' | 'none';

export const getConnectionState = (currentUserProfile: any, targetUserId: string): ConnectionState => {
  if (!currentUserProfile || !targetUserId) return 'none';
  if (currentUserProfile.connections?.includes(targetUserId)) return 'connected';
  if (currentUserProfile.sentRequests?.includes(targetUserId)) return 'pending';
  if (currentUserProfile.pendingConnections?.includes(targetUserId)) return 'incoming';
  return 'none';
};

export const sendConnectionRequest = async (currentUser: any, targetUserId: string) => {
  if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) return;
  const batch = writeBatch(db);
  const currentUserRef = doc(db, 'users', currentUser.uid);
  const targetUserRef = doc(db, 'users', targetUserId);
  try {
    batch.update(currentUserRef, { sentRequests: arrayUnion(targetUserId) });
    batch.update(targetUserRef, { pendingConnections: arrayUnion(currentUser.uid) });
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      userId: targetUserId,
      type: 'connection_request',
      sourceUserId: currentUser.uid,
      sourceUserName: currentUser.displayName || 'Someone',
      sourceUserPhoto: currentUser.photoURL || '',
      content: 'wants to connect with you',
      link: `/connections`,
      read: false,
      createdAt: serverTimestamp()
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid} or users/${targetUserId}`);
    throw error;
  }
};

export const acceptConnectionRequest = async (currentUser: any, targetUserId: string) => {
  if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) return;
  const batch = writeBatch(db);
  const currentUserRef = doc(db, 'users', currentUser.uid);
  const targetUserRef = doc(db, 'users', targetUserId);
  try {
    batch.update(currentUserRef, { 
      pendingConnections: arrayRemove(targetUserId), 
      connections: arrayUnion(targetUserId) 
    });
    batch.update(targetUserRef, { 
      sentRequests: arrayRemove(currentUser.uid), 
      connections: arrayUnion(currentUser.uid) 
    });
    // Create 'accepted' notification
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      userId: targetUserId,
      type: 'connection_request',
      sourceUserId: currentUser.uid,
      sourceUserName: currentUser.displayName || 'Someone',
      sourceUserPhoto: currentUser.photoURL || '',
      content: 'accepted your connection request',
      link: `/profile/${currentUser.uid}`,
      read: false,
      createdAt: serverTimestamp()
    });
    await batch.commit();
    await logActivity({
      userId: currentUser.uid,
      type: 'connect_user',
      targetId: targetUserId,
      targetName: 'a new founder', 
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid} or users/${targetUserId}`);
    throw error;
  }
};

export const rejectConnectionRequest = async (currentUser: any, targetUserId: string) => {
  if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) return;
  const batch = writeBatch(db);
  const currentUserRef = doc(db, 'users', currentUser.uid);
  const targetUserRef = doc(db, 'users', targetUserId);
  try {
    batch.update(currentUserRef, { pendingConnections: arrayRemove(targetUserId) });
    batch.update(targetUserRef, { sentRequests: arrayRemove(currentUser.uid) });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid} or users/${targetUserId}`);
    throw error;
  }
};

export const removeConnection = async (currentUser: any, targetUserId: string) => {
  if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) return;
  const batch = writeBatch(db);
  const currentUserRef = doc(db, 'users', currentUser.uid);
  const targetUserRef = doc(db, 'users', targetUserId);
  try {
    batch.update(currentUserRef, { connections: arrayRemove(targetUserId), sentRequests: arrayRemove(targetUserId), pendingConnections: arrayRemove(targetUserId) });
    batch.update(targetUserRef, { connections: arrayRemove(currentUser.uid), sentRequests: arrayRemove(currentUser.uid), pendingConnections: arrayRemove(currentUser.uid) });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid} or users/${targetUserId}`);
    throw error;
  }
};

// Legacy method map for components like Feed/Profile block logic
export const toggleUserConnection = async (currentUser: any, targetUserId: string, isConnected: boolean) => {
  if (isConnected) {
    await removeConnection(currentUser, targetUserId);
  } else {
    await sendConnectionRequest(currentUser, targetUserId);
  }
};
