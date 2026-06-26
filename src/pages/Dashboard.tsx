/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getDocs, deleteDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BlogPost } from '../types';
import { formatDate } from '../components/BlogCard';
import { 
  Heart, 
  MessageSquare, 
  Trash2, 
  Edit, 
  PlusCircle, 
  BookOpen, 
  Award, 
  FileText,
  Clock,
  Sparkles,
  Loader
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats Counters
  const [statLikes, setStatLikes] = useState(0);
  const [statComments, setStatComments] = useState(0);

  const fetchUserBlogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('authorId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const loaded: BlogPost[] = [];
      let totalLikesCount = 0;
      let totalCommentsCount = 0;

      querySnapshot.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as BlogPost;
        loaded.push(item);
        totalLikesCount += item.likesCount || 0;
        totalCommentsCount += item.commentsCount || 0;
      });

      setBlogs(loaded);
      setStatLikes(totalLikesCount);
      setStatComments(totalCommentsCount);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBlogs();
  }, [user]);

  const handleDelete = async (postId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this blog post?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      setBlogs(prev => prev.filter(b => b.id !== postId));
      // Re-calculate stats
      const removed = blogs.find(b => b.id === postId);
      if (removed) {
        setStatLikes(prev => Math.max(0, prev - (removed.likesCount || 0)));
        setStatComments(prev => Math.max(0, prev - (removed.commentsCount || 0)));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4" id="dashboard-loader">
        <Loader className="w-8 h-8 text-[#0f5132] animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Syncing your writer statistics cockpit...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" id="dashboard-view">
      {/* Upper header */}
      <div className="md:flex items-center justify-between border-b border-gray-100 pb-6 mb-8 gap-4 text-center md:text-left">
        <div>
          <h1 className="text-3xl font-sans font-extrabold text-gray-950 tracking-tight flex items-center gap-2 justify-center md:justify-start">
            Writer Cockpit
            <Sparkles className="w-6 h-6 text-[#0f5132]" />
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage public articles, monitor audience feedback, and review reach.</p>
        </div>
        <Link 
          to="/create" 
          className="inline-flex items-center gap-1.5 bg-[#0f5132] hover:bg-[#0c4028] text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-950/5 mt-4 md:mt-0"
        >
          <PlusCircle className="w-4 h-4" />
          Compose New
        </Link>
      </div>

      {/* Grid statistics metrics panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10" id="stats-grid">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-[#0f5132]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Publications</p>
            <p className="text-2xl font-sans font-black text-gray-950 mt-1">{blogs.length}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Likes Earned</p>
            <p className="text-2xl font-sans font-black text-gray-950 mt-1">{statLikes}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Reader Discussions</p>
            <p className="text-2xl font-sans font-black text-gray-950 mt-1">{statComments}</p>
          </div>
        </div>
      </div>

      {/* Publications Cockpit List */}
      <h2 className="text-xl font-sans font-extrabold text-gray-950 tracking-tight mb-4">My Manuscripts</h2>
      
      {blogs.length === 0 ? (
        <div className="bg-white/40 border border-gray-100 rounded-3xl p-12 text-center" id="empty-dashboard">
          <BookOpen className="w-12 h-12 mx-auto text-gray-300" />
          <h3 className="text-base font-bold text-gray-800 mt-3">You have not published any stories yet</h3>
          <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
            Unleash your creativity and write standard articles on Technology, AI, Lifestyle or Kyoto Travels to engage with readers.
          </p>
          <Link to="/create" className="inline-flex items-center gap-1.5 mt-5 bg-[#0f5132] text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl">
            <PlusCircle className="w-4 h-4" />
            Write your first Post
          </Link>
        </div>
      ) : (
        <div className="bg-white/70 border border-gray-100 rounded-3xl overflow-hidden shadow-2xs" id="dashboard-list">
          <div className="min-w-full divide-y divide-gray-100">
            {/* Headers row - hidden on small view */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="col-span-6">Manuscript DETAILS</div>
              <div className="col-span-2">GENRE</div>
              <div className="col-span-2">STATS</div>
              <div className="col-span-2 text-right">MANAGE ACTION</div>
            </div>

            <div className="divide-y divide-gray-100">
              {blogs.map((blog) => (
                <div key={blog.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-gray-50/30 transition-colors">
                  {/* Title & Preview Cover details */}
                  <div className="col-span-6 flex items-center gap-4">
                    <img 
                      src={blog.image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=100&auto=format&fit=crop&q=10'} 
                      alt={blog.title} 
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <Link to={`/posts/${blog.id}`} className="font-bold text-gray-900 text-sm hover:text-[#0f5132] line-clamp-1">
                        {blog.title}
                      </Link>
                      <p className="text-[11px] text-gray-400 mt-0.5">Published {formatDate(blog.createdAt)}</p>
                    </div>
                  </div>

                  {/* Category badging */}
                  <div className="col-span-2">
                    <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                      {blog.category}
                    </span>
                  </div>

                  {/* Numeric statistics */}
                  <div className="col-span-2 flex items-center gap-4 text-xs font-semibold text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
                      <span>{blog.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{blog.commentsCount || 0}</span>
                    </div>
                  </div>

                  {/* Interactive edits & deletions indicators */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <Link 
                      to={`/edit/${blog.id}`} 
                      className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit Story"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(blog.id)} 
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
