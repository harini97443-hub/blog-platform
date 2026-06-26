/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getDoc, getDocs } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BlogPost } from '../types';
import BlogCard from '../components/BlogCard';
import { 
  User, 
  Settings, 
  FileText, 
  BookOpen, 
  Edit3, 
  Camera, 
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Loader,
  Check
} from 'lucide-react';

const AVATAR_SEEDS = [
  { name: 'Scribe', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Scribe' },
  { name: 'Sage', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sage' },
  { name: 'Navigator', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Navigator' },
  { name: 'Innovator', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Innovator' },
  { name: 'Curator', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Curator' },
  { name: 'Muse', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Muse' }
];

export default function Profile() {
  const { user, profile, updateProfileInfo } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'posts' | 'bookmarks' | 'settings'>('posts');
  
  // Data loading
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Load posts and bookmarks details
  const loadProfileSubData = async () => {
    if (!user) return;
    setLoadingPosts(true);
    try {
      // 1. Load user's published blogs
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('authorId', '==', user.uid));
      const postSnap = await getDocs(q);
      const loadedPosts: BlogPost[] = [];
      postSnap.forEach(docSnap => {
        loadedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost);
      });
      setUserPosts(loadedPosts);

      // 2. Load user's bookmarks list
      const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
      const bookSnap = await getDocs(bookmarksRef);
      const loadedBookmarks: BlogPost[] = [];
      
      for (const dSnap of bookSnap.docs) {
        const postDocRef = doc(db, 'posts', dSnap.id);
        const postSnapshot = await getDoc(postDocRef);
        if (postSnapshot.exists()) {
          loadedBookmarks.push({ id: postSnapshot.id, ...postSnapshot.data() } as BlogPost);
        }
      }
      setBookmarkedPosts(loadedBookmarks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadProfileSubData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      alert("Please specify a display name.");
      return;
    }

    setUpdating(true);
    setUpdateSuccess(false);

    try {
      await updateProfileInfo(
        displayName.trim(),
        photoURL.trim(),
        bio.trim()
      );
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile settings.");
    } finally {
      setUpdating(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-gray-100 shadow-md text-center">
        <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold">Unauthenticated</h2>
        <p className="text-gray-500 text-sm mt-1 leading-relaxed">Please register or log in to customize your profile space.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" id="profile-view">
      {/* Upper header visual card */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 mb-8 shadow-2xs flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
          <img 
            src={profile.photoURL} 
            alt={profile.displayName} 
            className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-50 shadow-md"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-2xl font-sans font-extrabold text-gray-950 tracking-tight flex items-center gap-2 justify-center md:justify-start">
              {profile.displayName}
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mt-1 max-w-lg mb-2">
              {profile.bio || 'This contributor has not composed an organic bio yet.'}
            </p>
            <div className="flex gap-4 text-xs font-bold text-[#0f5132] uppercase tracking-wider justify-center md:justify-start">
              <span>{userPosts.length} Manuscripts</span>
              <span>•</span>
              <span>{bookmarkedPosts.length} Bookmarks</span>
            </div>
          </div>
        </div>

        {/* Dynamic quick tab triggers */}
        <div className="flex bg-[#fcfbf9] border border-gray-100 p-1 rounded-xl self-center md:self-end">
          <button
            onClick={() => setActiveTab('posts')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 ${activeTab === 'posts' ? 'bg-[#0f5132] text-white' : 'text-gray-600'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            My Stories
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 ${activeTab === 'bookmarks' ? 'bg-[#0f5132] text-white' : 'text-gray-600'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Bookmarks
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-[#0f5132] text-white' : 'text-gray-600'}`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        /* Settings panel edit form */
        <div className="max-w-2xl bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xs">
          <h2 className="text-xl font-sans font-extrabold text-gray-950 tracking-tight mb-1">Customize Profile</h2>
          <p className="text-gray-400 text-xs mb-6">Modify details showing up across comments and publication lists.</p>

          {updateSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-[#0f5132] text-xs flex gap-2.5 items-center">
              <Check className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Settings updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Display Pen Name</label>
              <input 
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#faf9f6]/95 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-950 focus:border-[#0f5132]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Detailed Biography</label>
              <textarea 
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#faf9f6]/95 border border-gray-200 rounded-xl p-4 text-sm leading-relaxed focus:border-[#0f5132]"
                placeholder="A bit about yourself..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Avatar Custom URL</label>
              <input 
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full bg-[#faf9f6]/95 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:border-[#0f5132]"
              />
            </div>

            {/* Quick avatar clickers */}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Or choose a character preset:</span>
              <div className="flex flex-wrap gap-2.5 border-t border-gray-50 pt-2">
                {AVATAR_SEEDS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setPhotoURL(preset.url)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${photoURL === preset.url ? 'bg-emerald-50 text-[#0f5132] border-[#0f5132]' : 'bg-white text-gray-600 border-gray-100'}`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-5 h-5 rounded-full object-cover" />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="mt-6 bg-[#0f5132] hover:bg-[#0c4028] disabled:bg-gray-300 text-white text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/10 transition-colors"
            >
              {updating ? 'Saving details...' : 'Save Settings'}
            </button>
          </form>
        </div>
      ) : activeTab === 'bookmarks' ? (
        /* Bookmarks cards layout */
        <div>
          <h2 className="text-xl font-sans font-extrabold text-gray-950 mb-6 tracking-tight">Saved Publications</h2>
          {loadingPosts ? (
            <div className="text-center py-10">
              <Loader className="w-6 h-6 animate-spin mx-auto text-[#0f5132]" />
            </div>
          ) : bookmarkedPosts.length === 0 ? (
            <div className="text-center py-12 bg-white/40 border border-gray-100 rounded-3xl">
              <BookOpen className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-gray-400 text-xs mt-2">You haven't bookmarked any articles yet. Explore feed to save publications.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {bookmarkedPosts.map((post) => (
                <BlogCard key={post.id} post={post} isBookmarked={true} onToggleBookmark={async () => {
                  try {
                    await doc(db, 'users', user.uid, 'bookmarks', post.id);
                    await loadProfileSubData(); // Refresh list easily
                  } catch (err) {
                    console.error(err);
                  }
                }} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* User publications view */
        <div>
          <h2 className="text-xl font-sans font-extrabold text-gray-950 mb-6 tracking-tight">My Publications</h2>
          {loadingPosts ? (
            <div className="text-center py-10">
              <Loader className="w-6 h-6 animate-spin mx-auto text-[#0f5132]" />
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-12 bg-white/40 border border-gray-100 rounded-3xl">
              <FileText className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-gray-400 text-xs mt-2">You haven't published any manuscripts yet. Compose a new article!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
