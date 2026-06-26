/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getDoc, getDocs, setDoc, deleteDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BlogPost, Bookmark } from '../types';
import BlogCard from '../components/BlogCard';
import { seedInitialData } from '../utils/seed';
import { Search, SlidersHorizontal, BookOpen, Layers, RefreshCw, Feather, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { user, profile } = useAuth();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const categories = ['All', 'Technology', 'AI', 'Education', 'Lifestyle', 'Travel'];

  // Fetch blogs on load
  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const postsRef = collection(db, 'posts');
      // Sort by newest first
      const q = query(postsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const loadedPosts: BlogPost[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedPosts.push({
          id: docSnap.id,
          ...data
        } as BlogPost);
      });
      setPosts(loadedPosts);
    } catch (err) {
      console.error("Error reading posts:", err);
      // Don't crash, could be that orderBy index isn't ready. Fall back to standard read
      try {
        const postsRef = collection(db, 'posts');
        const querySnapshot = await getDocs(postsRef);
        const loadedPosts: BlogPost[] = [];
        querySnapshot.forEach((docSnap) => {
          loadedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost);
        });
        setPosts(loadedPosts);
      } catch (fallbackErr) {
        handleFirestoreError(fallbackErr, OperationType.LIST, 'posts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sync user bookmarks on load
  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) {
        setBookmarks({});
        return;
      }
      try {
        const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
        const querySnapshot = await getDocs(bookmarksRef);
        
        const marks: Record<string, boolean> = {};
        querySnapshot.forEach((docSnap) => {
          marks[docSnap.id] = true;
        });
        setBookmarks(marks);
      } catch (err) {
        console.error("Error reading user bookmarks:", err);
      }
    };
    
    fetchBookmarks();
  }, [user]);

  // Toggle bookmark event
  const handleToggleBookmark = async (postId: string) => {
    if (!user) {
      alert("Please sign in to bookmark articles.");
      return;
    }

    const docId = postId;
    const isCurrentlyBookmarked = !!bookmarks[postId];
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', docId);

    try {
      if (isCurrentlyBookmarked) {
        await deleteDoc(bookmarkRef);
        setBookmarks(prev => {
          const updated = { ...prev };
          delete updated[postId];
          return updated;
        });
      } else {
        const bMark: Bookmark = {
          postId,
          userId: user.uid,
          createdAt: new Date()
        };
        await setDoc(bookmarkRef, {
          postId,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        setBookmarks(prev => ({ ...prev, [postId]: true }));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/bookmarks/${postId}`);
    }
  };

  // Handle rapid seeder click
  const triggerSeeder = async () => {
    setSeeding(true);
    try {
      await seedInitialData();
      setSeedSuccess(true);
      await fetchBlogs();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to seed initial data. Ensure your security rules are deployed successfully.");
    } finally {
      setSeeding(false);
    }
  };

  // Search and filter algorithms
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      post.category?.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col" id="home-view">
      {/* Visual Welcome Core Panel */}
      <div className="text-center md:text-left py-12 md:py-16 md:flex items-center justify-between border-b border-gray-100 mb-10 gap-8">
        <div className="max-w-2xl">
          <span className="text-xs font-bold text-[#0f5132] uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full">
            SageInk Chronicles
          </span>
          <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-gray-950 mt-4 tracking-tight leading-tight">
            Read, reflect, and write with pristine clarity.
          </h1>
          <p className="text-gray-500 font-medium text-lg mt-3 max-w-xl leading-relaxed">
            Welcome to SageInk, a quiet place for creators, designers, and thinkers to compose deep ideas.
          </p>
        </div>

        {/* Action Panel for Seeding or Guest Instructions */}
        {posts.length === 0 && !loading && (
          <div className="mt-8 md:mt-0 max-w-md w-full bg-[#f4f2ec] rounded-2xl p-6 border border-gray-200 shadow-sm text-center">
            <Feather className="w-8 h-8 mx-auto text-[#0f5132]" />
            <h4 className="font-bold text-gray-900 mt-2">Publishing Canvas is Empty</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Get started instantly by deploying standard articles on modern AI, Zen focus, minimalism, and Kyoto travels.</p>
            
            <button 
              onClick={triggerSeeder}
              disabled={seeding}
              className="mt-4 bg-[#0f5132] hover:bg-[#0c4028] text-[#faf9f6] text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              {seeding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Seeding Firestore...
                </>
              ) : seedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  Successfully seeded!
                </>
              ) : (
                'Populate Seed Data'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Control Panel: Search & Categories */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white/50 border border-gray-100 p-4 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search blogs by title, category, author..."
            className="w-full bg-[#fcfbf9] border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all text-gray-800"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
        </div>

        {/* Horizontal Category Filtering */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none">
          <Layers className="w-4 h-4 text-gray-400 shrink-0 hidden md:block" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer border shrink-0 ${
                selectedCategory === cat 
                  ? 'bg-[#0f5132] text-white border-[#0f5132] shadow-sm shadow-[#0f5132]/20' 
                  : 'bg-white text-gray-600 border-gray-100 hover:border-[#0f5132] hover:text-[#0f5132]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Blogs Layout Grid */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20 gap-4" id="loading-spinner">
          <RefreshCw className="w-8 h-8 text-[#0f5132] animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Loading publications from database...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white/30 rounded-3xl border border-dashed border-gray-200">
          <BookOpen className="w-12 h-12 mx-auto text-gray-300" />
          <h3 className="text-lg font-bold text-gray-800 mt-3">No Publications Match</h3>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
            There are either no articles published yet, or your filters are too specific. Check category tabs or click above to populate seed data!
          </p>
          {(searchTerm !== '' || selectedCategory !== 'All') && (
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="blogs-grid">
          {filteredPosts.map((post) => (
            <BlogCard 
              key={post.id} 
              post={post} 
              isBookmarked={!!bookmarks[post.id]}
              onToggleBookmark={() => handleToggleBookmark(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
