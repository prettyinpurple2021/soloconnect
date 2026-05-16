import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, addDoc } from 'firebase/firestore';

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  skills: string[];
  location: string;
  links: { [key: string]: string };
  portfolio: any[];
  connections: string[];
  pendingConnections?: string[];
  sentRequests?: string[];
  savedPosts?: string[];
  blockedUsers?: string[];
  onboardingDismissed?: boolean;
  createdAt: any;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  isAuthReady: boolean;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userProfile: null, 
  loading: true, 
  isAuthReady: false,
  logOut: async () => {} 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUserProfile(null);
      setUser(currentUser);
      
      if (currentUser) {
        // Ensure user document exists
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const profileData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Anonymous User',
              photoURL: currentUser.photoURL || '',
              bio: '',
              skills: [],
              location: '',
              links: {},
              portfolio: [],
              connections: [],
              pendingConnections: [],
              sentRequests: [],
              savedPosts: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            await setDoc(userRef, profileData);

            // Pillar 6: PII Isolation - store email in private subcollection
            if (currentUser.email) {
              await setDoc(doc(db, 'users', currentUser.uid, 'private', 'info'), {
                email: currentUser.email,
                updatedAt: serverTimestamp()
              });
            }

            // Trigger account welcome notification pulse via Firebase Email Extension
            try {
              if (currentUser.email) {
                addDoc(collection(db, 'mail'), {
                  to: currentUser.email,
                  message: {
                    subject: '[SoloConnect] ACCOUNT_CREATION_CONFIRMED',
                    html: `
                      <div style="font-family: monospace; padding: 20px; background: #000; color: #fff; border: 2px solid #fff;">
                        <h1 style="border-bottom: 2px solid #fff; padding-bottom: 10px;">SOLOCONNECT_PROTOCOL_CONFIRMED</h1>
                        <p><strong>ACTION:</strong> account_creation</p>
                        <p><strong>TIMESTAMP:</strong> ${new Date().toISOString()}</p>
                        <p><strong>USER_ID:</strong> ${currentUser.uid}</p>
                        <div style="margin-top: 20px; padding: 10px; border: 1px dashed #fff;">
                          IDENTITY_ECHO_TRANSMITTED_SUCCESSFULLY_VIA_FIREBASE_EXTENSION.
                        </div>
                      </div>
                    `
                  }
                }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'mail'));
              }
            } catch (e) {
              console.warn('Welcome transmission pulse failed.');
            }
          }

          unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfileData;
              // PII Isolation: Merge email from current authenticated user if not in public doc
              if (!data.email && currentUser.email) {
                data.email = currentUser.email;
              }
              setUserProfile(data);
            }
          }, (error) => {
            // Only report error if we still think we are signed in
            if (auth.currentUser) {
              handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            }
          });
        } catch (error) {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          }
        }
      }
      
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const logOutUser = async () => {
    const { logOut } = await import('../lib/firebase');
    await logOut();
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAuthReady, logOut: logOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
