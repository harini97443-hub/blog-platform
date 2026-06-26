/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getDoc, updateDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Eye, Edit, Save, Feather, ImageIcon, Loader, ShieldAlert } from 'lucide-react';
import Markdown from 'react-markdown';
import { BlogPost } from '../types';

export default function EditBlog() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Technology');
  const [imageUrl, setImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);

  const categories = ['Technology', 'AI', 'Education', 'Lifestyle', 'Travel'];

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
          setPost(null);
          return;
        }

        const data = postSnap.data() as BlogPost;
        
        // Block other users from editing directly on client side
        if (user && data.authorId !== user.uid) {
          alert("Security Lock: You are not authorized to edit other writers' publications.");
          navigate('/');
          return;
        }

        setPost({ id: postSnap.id, ...data });
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category);
        setImageUrl(data.image);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || !user || !post) return;

    if (title.trim().length < 3) {
      alert("Title must be at least 3 characters");
      return;
    }

    if (content.trim().length < 5) {
      alert("Content must be at least 5 characters");
      return;
    }

    setSaving(true);
    const postRef = doc(db, 'posts', postId);

    // Validate update rules: diff.affectedKeys().hasOnly(['title', 'content', 'category', 'image', 'updatedAt'])
    const updatePayload = {
      title: title.trim(),
      content: content.trim(),
      category,
      image: imageUrl.trim(),
      updatedAt: serverTimestamp() // strict timestamp match rule
    };

    try {
      await updateDoc(postRef, updatePayload);
      navigate(`/posts/${postId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4" id="edit-loader">
        <Loader className="w-8 h-8 text-[#0f5132] animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Loading story manuscript from memory archive...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-gray-100 shadow-md text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold">Manuscript not loaded</h2>
        <p className="text-gray-500 text-sm mt-1 leading-relaxed">It could be that you are not authenticated, or the manuscript does not exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8" id="edit-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-sans font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
            Edit Manuscript
            <Feather className="w-6 h-6 text-[#0f5132]" />
          </h1>
          <p className="text-gray-500 text-sm mt-1">Refine, clarify, and update your published article</p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-[#fcfbf9] border border-gray-100 p-1.5 rounded-xl self-start">
          <button 
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer ${activeTab === 'write' ? 'bg-[#0f5132] text-white' : 'text-gray-600'}`}
          >
            <Edit className="w-3.5 h-3.5" />
            Write
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer ${activeTab === 'preview' ? 'bg-[#0f5132] text-white' : 'text-gray-600'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Layout
          </button>
        </div>
      </div>

      {activeTab === 'write' ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Publication Title</label>
              <input 
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#faf9f6]/80 border border-gray-200 rounded-xl py-3 px-4 text-sm font-sans font-bold text-gray-950 focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Genre</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#faf9f6]/80 border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:border-[#0f5132] focus:bg-white"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Cover Header Image URL</label>
                <div className="relative">
                  <input 
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-[#faf9f6]/80 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#0f5132] focus:bg-white"
                  />
                  <ImageIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Story Manuscript (Supports Markdown)</span>
              <span className="text-[10px] text-gray-400 font-mono">{content.split(/\s+/).filter(Boolean).length} words</span>
            </div>

            <textarea 
              required
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#faf9f6]/60 border border-gray-200 rounded-2xl p-4 text-sm font-mono leading-relaxed focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all text-gray-800"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigate(`/posts/${postId}`)}
              className="border border-gray-200 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0f5132] hover:bg-[#0c4028] disabled:bg-gray-300 text-white text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-950/10 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* Preview tab */
        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">{category}</span>
          <h1 className="text-3xl md:text-5xl font-sans font-extrabold text-[#111827] tracking-tight mt-4 leading-tight mb-6">
            {title || 'Untitled Manuscript'}
          </h1>

          {imageUrl && (
            <div className="rounded-2xl overflow-hidden aspect-video w-full mb-6">
              <img src={imageUrl} alt="Story cover" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
            </div>
          )}

          <div className="markdown-body prose max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
