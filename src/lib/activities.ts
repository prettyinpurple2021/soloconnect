import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType = 'join_group' | 'comment_post' | 'connect_user' | 'create_post' | 'like_post' | 'vouch_user' | 'check_in';

export interface ActivityData {
  userId: string;
  type: ActivityType;
  targetId: string;
  targetName: string;
  metadata?: any;
}

export const logActivity = async (activity: ActivityData) => {
  try {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
