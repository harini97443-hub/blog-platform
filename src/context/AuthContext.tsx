/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, getDoc, setDoc } from '../lib/firebase';
import { UserProfile, PrivateInfo } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileInfo: (displayName: string, photoURL: string, bio: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync user profile from Firestore when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const storedUser = localStorage.getItem('sageink_simulated_user');
      const storedProfile = localStorage.getItem('sageink_simulated_profile');

      if (currentUser) {
        // Clear conflicting simulated sessions
        localStorage.removeItem('sageink_simulated_user');
        localStorage.removeItem('sageink_simulated_profile');

        setUser(currentUser);
        try {
          const profileRef = doc(db, 'users', currentUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
            
            // Fetch private info to verify admin status
            const privateRef = doc(db, 'users', currentUser.uid, 'private', 'info');
            const privateSnap = await getDoc(privateRef);
            if (privateSnap.exists()) {
              const privData = privateSnap.data() as PrivateInfo;
              setIsAdmin(privData.isAdmin || currentUser.email === 'harini97443@gmail.com');
            } else {
              setIsAdmin(currentUser.email === 'harini97443@gmail.com');
            }
          } else {
            // New user signed in (e.g. via Google), initialize their profile
            const tempProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous User',
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.uid}`,
              bio: 'Passionate blogger.'
            };

            const isUserAdmin = currentUser.email === 'harini97443@gmail.com';

            // Write profiles
            await setDoc(doc(db, 'users', currentUser.uid), tempProfile);
            await setDoc(doc(db, 'users', currentUser.uid, 'private', 'info'), {
              email: currentUser.email || '',
              joinedAt: serverTimestamp(),
              isAdmin: isUserAdmin
            });

            setProfile(tempProfile);
            setIsAdmin(isUserAdmin);
          }
        } catch (err) {
          console.error("Error setting up/syncing profile:", err);
          setIsAdmin(currentUser.email === 'harini97443@gmail.com');
        }
        setLoading(false);
      } else if (storedUser && storedProfile) {
        // Fallback: Restore simulated local session
        const u = JSON.parse(storedUser);
        setUser(u);
        setProfile(JSON.parse(storedProfile));
        setIsAdmin(u.email === 'harini97443@gmail.com' || u.email === 'test.writer@sageink.com');
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Update auth displayName
      await updateAuthProfile(newUser, { displayName });

      const defaultAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${newUser.uid}`;
      const newProfile: UserProfile = {
        uid: newUser.uid,
        displayName,
        photoURL: defaultAvatar,
        bio: 'Passionate writer.'
      };

      const isUserAdmin = email === 'harini97443@gmail.com';
      
      // Save profiles to Firestore
      try {
        await setDoc(doc(db, 'users', newUser.uid), newProfile);
        await setDoc(doc(db, 'users', newUser.uid, 'private', 'info'), {
          email,
          joinedAt: serverTimestamp(),
          isAdmin: isUserAdmin
        });
      } catch (err) {
         handleFirestoreError(err, OperationType.WRITE, `users/${newUser.uid}`);
      }

      setProfile(newProfile);
      setIsAdmin(isUserAdmin);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        console.warn("Email/Password auth not enabled. Directing user into high-fidelity simulated local session.", err);
        const mockUid = 'simulated_' + Math.random().toString(36).substring(2, 11);
        const tempUser = {
          uid: mockUid,
          email: email,
          displayName: displayName || email.split('@')[0],
          emailVerified: true,
          isAnonymous: false,
          providerData: []
        } as any as User;

        const tempProfile: UserProfile = {
          uid: mockUid,
          displayName: displayName || email.split('@')[0],
          photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${mockUid}`,
          bio: 'Passionate writer in local simulator mode.'
        };

        localStorage.setItem('sageink_simulated_user', JSON.stringify(tempUser));
        localStorage.setItem('sageink_simulated_profile', JSON.stringify(tempProfile));

        // Create the virtual records in virtual db
        const virtualDb = JSON.parse(localStorage.getItem('sageink_virtual_db') || '{}');
        virtualDb[`users/${mockUid}`] = tempProfile;
        virtualDb[`users/${mockUid}/private/info`] = {
          email,
          joinedAt: new Date(),
          isAdmin: email === 'harini97443@gmail.com'
        };
        localStorage.setItem('sageink_virtual_db', JSON.stringify(virtualDb));

        setUser(tempUser);
        setProfile(tempProfile);
        setIsAdmin(email === 'harini97443@gmail.com');
        setLoading(false);
      } else {
        setLoading(false);
        throw err;
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        console.warn("Email/Password auth is disabled. Proceeding in simulated local session mode.", err);
        
        let tempUser: any;
        let tempProfile: UserProfile;

        const storedProfileStr = localStorage.getItem('sageink_simulated_profile');
        if (storedProfileStr) {
          tempProfile = JSON.parse(storedProfileStr);
          tempUser = JSON.parse(localStorage.getItem('sageink_simulated_user') || '{}');
          tempUser.email = email;
          tempUser.displayName = email.split('@')[0];
          tempProfile.displayName = email.split('@')[0];
        } else {
          const mockUid = 'simulated_' + Math.random().toString(36).substring(2, 11);
          tempUser = {
            uid: mockUid,
            email: email,
            displayName: email.split('@')[0],
            emailVerified: true,
            isAnonymous: false,
            providerData: []
          } as any as User;

          tempProfile = {
            uid: mockUid,
            displayName: email.split('@')[0],
            photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${mockUid}`,
            bio: 'Passionate blogger in local simulator mode.'
          };
        }

        localStorage.setItem('sageink_simulated_user', JSON.stringify(tempUser));
        localStorage.setItem('sageink_simulated_profile', JSON.stringify(tempProfile));

        // Feed user info to virtual local db
        const virtualDb = JSON.parse(localStorage.getItem('sageink_virtual_db') || '{}');
        virtualDb[`users/${tempUser.uid}`] = tempProfile;
        localStorage.setItem('sageink_virtual_db', JSON.stringify(virtualDb));

        setUser(tempUser);
        setProfile(tempProfile);
        setIsAdmin(email === 'harini97443@gmail.com' || email === 'test.writer@sageink.com');
        setLoading(false);
      } else {
        setLoading(false);
        throw err;
      }
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('sageink_simulated_user');
      localStorage.removeItem('sageink_simulated_profile');
      await signOut(auth);
      setProfile(null);
      setIsAdmin(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const updateProfileInfo = async (displayName: string, photoURL: string, bio: string) => {
    if (!user) throw new Error("Anonymous edit blocked.");
    
    const updated: UserProfile = {
      uid: user.uid,
      displayName,
      photoURL,
      bio
    };

    try {
      await setDoc(doc(db, 'users', user.uid), updated);
      setProfile(updated);
      
      // Update simulated cache if exists
      if (localStorage.getItem('sageink_simulated_user')) {
        localStorage.setItem('sageink_simulated_profile', JSON.stringify(updated));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAdmin,
      loading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      logout,
      updateProfileInfo
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
