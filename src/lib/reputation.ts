import { doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const XP_VALUES = {
  create_post: 50,
  comment_post: 20,
  like_post: 5,
  join_group: 30,
  vouch_user: 100,
  complete_mission: 250,
  check_in: 40,
};

export const calculateLevel = (xp: number = 0) => {
  // Simple quadratic leveling: level 1 = 0xp, level 2 = 100xp, level 3 = 400xp, etc.
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const addXP = async (userId: string, type: keyof typeof XP_VALUES) => {
  const amount = XP_VALUES[type];
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, { xp: amount, level: calculateLevel(amount) }, { merge: true });
      return;
    }

    const currentXp = (userSnap.data().xp || 0) + amount;
    const newLevel = calculateLevel(currentXp);

    await updateDoc(userRef, {
      xp: increment(amount),
      level: newLevel,
      lastXpUpdate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating XP:', error);
  }
};
