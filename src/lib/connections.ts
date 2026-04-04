import { doc, writeBatch, arrayUnion, arrayRemove, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export const toggleUserConnection = async (currentUser: any, targetUserId: string, isConnected: boolean) => {
  if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) return;

  const batch = writeBatch(db);
  const currentUserRef = doc(db, 'users', currentUser.uid);
  const targetUserRef = doc(db, 'users', targetUserId);

  try {
    if (isConnected) {
      batch.update(currentUserRef, { connections: arrayRemove(targetUserId) });
      batch.update(targetUserRef, { connections: arrayRemove(currentUser.uid) });
    } else {
      batch.update(currentUserRef, { connections: arrayUnion(targetUserId) });
      batch.update(targetUserRef, { connections: arrayUnion(currentUser.uid) });

      // Create a notification for the target user
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        userId: targetUserId,
        type: 'connection_request',
        sourceUserId: currentUser.uid,
        sourceUserName: currentUser.displayName || 'Someone',
        sourceUserPhoto: currentUser.photoURL || '',
        content: 'connected with you',
        link: `/profile/${currentUser.uid}`,
        read: false,
        createdAt: serverTimestamp()
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid} or users/${targetUserId}`);
  }
};
