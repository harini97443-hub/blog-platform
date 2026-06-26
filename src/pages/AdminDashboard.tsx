/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getDoc, getDocs, deleteDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BlogPost, UserProfile } from '../types';
import { formatDate } from '../components/BlogCard';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  MessageSquare, 
  Layers, 
  Trash2, 
  ExternalLink,
  Loader,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface RichUser extends UserProfile {
  email?: string;
  joinedAt?: any;
}

export default function AdminDashboard() {
  const { user, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState<RichUser[]>([]);
  const [blogsList, setBlogsList] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistics counters
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBlogs: 0,
    totalComments: 0,
    totalCategories: 5 // preset
  });

  const fetchAdminDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch all blogs
      const postsRef = collection(db, 'posts');
      const postsSnap = await getDocs(postsRef);
      const posts: BlogPost[] = [];
      let commentsCountTotal = 0;

      postsSnap.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as BlogPost;
        posts.push(item);
        commentsCountTotal += item.commentsCount || 0;
      });

      // 2. Fetch all registered users
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      const users: RichUser[] = [];

      for (const userDoc of usersSnap.docs) {
        const uProfile = userDoc.data() as UserProfile;
        
        // Try reading private info if accessible, otherwise fallback gracefully
        let pEmail = '';
        let pJoined = null;
        try {
          const privateSnap = await getDoc(doc(db, 'users', userDoc.id, 'private', 'info'));
          if (privateSnap.exists()) {
            const privateData = privateSnap.data();
            pEmail = privateData.email || '';
            pJoined = privateData.joinedAt;
          }
        } catch {
          // Perm denied expected for non-admins, but since we are admin, rules permit
        }

        users.push({
          ...uProfile,
          email: pEmail,
          joinedAt: pJoined
        });
      }

      setBlogsList(posts);
      setUsersList(users);

      setStats({
        totalUsers: users.length,
        totalBlogs: posts.length,
        totalComments: commentsCountTotal,
        totalCategories: 5
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && !loading) {
      alert("Unauthorized Access Attempt: Moderator credentials required.");
      navigate('/');
      return;
    }
    fetchAdminDetails();
  }, [isAdmin]);

  // Admin delete blog action
  const handleAdminDeleteBlog = async (postId: string) => {
    const confirmDelete = window.confirm("MODERATOR ACTION: Are you sure you want to delete this publication permanently?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      setBlogsList(prev => prev.filter(b => b.id !== postId));
      setStats(prev => ({ ...prev, totalBlogs: Math.max(0, prev.totalBlogs - 1) }));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  // Admin remove user action
  const handleAdminRemoveUser = async (userId: string) => {
    if (userId === user?.uid) {
      alert("Cannot delete your own administrator account self-referentially.");
      return;
    }

    const confirmDelete = window.confirm("MODERATOR ACTION: Confirm user removal? All profile metrics will be disconnected.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsersList(prev => prev.filter(u => u.uid !== userId));
      setStats(prev => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white/80 rounded-3xl border border-gray-100 shadow-xl text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-950">Moderator Access Locked</h2>
        <p className="text-gray-400 text-xs mt-1">Please log in using administrative account harini97443@gmail.com to proceed.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4" id="admin-loader">
        <Loader className="w-8 h-8 text-[#0f5132] animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Locking secure session connection with Moderator Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" id="admin-view">
      <div className="border-b border-gray-100 pb-6 mb-8 gap-4 text-center md:text-left">
        <span className="text-xs font-bold text-[#0f5132] uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          Admin space
        </span>
        <h1 className="text-3xl font-sans font-extrabold text-[#111827] mt-3 tracking-tight flex items-center gap-2 justify-center md:justify-start">
          Platform Security Center
          <ShieldCheck className="w-6 h-6 text-[#0f5132]" />
        </h1>
        <p className="text-gray-500 text-sm mt-1">Review statistical feeds, purge spam/inappropriate manuscripts, and manage registered users.</p>
      </div>

      {/* Core Counters Metrics panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10" id="admin-stats">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Users</p>
            <p className="text-xl font-black mt-0.5 text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-[#0f5132]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Blogs</p>
            <p className="text-xl font-black mt-0.5 text-gray-900">{stats.totalBlogs}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Discussion Comments</p>
            <p className="text-xl font-black mt-0.5 text-gray-900">{stats.totalComments}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Categories Active</p>
            <p className="text-xl font-black mt-0.5 text-gray-900">{stats.totalCategories}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Account Registry Panel */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex flex-col" id="user-management-tab">
          <h2 className="text-lg font-sans font-extrabold text-[#111827] mb-4 flex items-center gap-2">
            User Account Registry
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </h2>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            {usersList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-10">No users found.</p>
            ) : (
              <table className="min-w-full text-sm divide-y divide-gray-100 text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase font-bold tracking-widest bg-gray-50/50">
                    <th className="px-4 py-3 rounded-l-xl">User Details</th>
                    <th className="px-4 py-3">Permission Role</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usersList.map((usr) => (
                    <tr key={usr.uid} className="hover:bg-gray-50/20">
                      <td className="px-4 py-3.5 flex items-center gap-2.5">
                        <img 
                          src={usr.photoURL} 
                          alt={usr.displayName} 
                          className="w-8 h-8 rounded-full object-cover bg-gray-100"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-gray-800 text-xs leading-none">{usr.displayName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{usr.email || 'Google User'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${usr.email === 'harini97443@gmail.com' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          {usr.email === 'harini97443@gmail.com' ? 'Superadmin' : 'Penman Contributor'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleAdminRemoveUser(usr.uid)}
                          disabled={usr.uid === user?.uid}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Purge user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Blog Post Moderation Table */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs flex flex-col" id="blog-moderation-tab">
          <h2 className="text-lg font-sans font-extrabold text-[#111827] mb-4 flex items-center gap-2">
            Manuscript Moderation Panel
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </h2>

          <div className="flex-1 overflow-x-auto min-h-[300px]">
            {blogsList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-10">No public manuscripts found.</p>
            ) : (
              <table className="min-w-full text-sm divide-y divide-gray-100 text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase font-bold tracking-widest bg-gray-50/50">
                    <th className="px-4 py-3 rounded-l-xl">Article Title & Author</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {blogsList.map((blog) => (
                    <tr key={blog.id} className="hover:bg-gray-50/20">
                      <td className="px-4 py-3.5">
                        <div className="max-w-[200px]">
                          <p className="font-bold text-gray-900 text-xs truncate">{blog.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">By {blog.authorName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                          {blog.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right flex justify-end gap-1.5 items-center">
                        <a
                          href={`/posts/${blog.id}`}
                          className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg block"
                          title="View layout"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleAdminDeleteBlog(blog.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Purge article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
