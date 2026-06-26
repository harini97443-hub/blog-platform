/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, setDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Eye, Edit, Save, Feather, Sparkles, Image as ImageIcon, Video, FileText, User } from 'lucide-react';
import Markdown from 'react-markdown';

const PRESET_COVERS = [
  { name: 'Modern AI Network', url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60', cat: 'AI' },
  { name: 'Pruned Cozy Studio', url: 'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&auto=format&fit=crop&q=60', cat: 'Lifestyle' },
  { name: 'Kyoto Temple Garden', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60', cat: 'Travel' },
  { name: 'Interactive Workspace', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=60', cat: 'Technology' },
  { name: 'Classical Library Study', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=60', cat: 'Education' }
];

export default function CreateBlog() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Technology');
  const [imageUrl, setImageUrl] = useState(PRESET_COVERS[3].url); // default tech
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [publishing, setPublishing] = useState(false);

  // Gemini AI WRITER ASSISTANT STATES
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const categories = ['Technology', 'AI', 'Education', 'Lifestyle', 'Travel'];

  const generateAiStory = async () => {
    if (!aiPrompt.trim()) {
      setGenerationError("Please describe your story concept or write a prompt first.");
      return;
    }
    setIsGenerating(true);
    setGenerationError('');
    setSuccessInfo('');
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt.trim(), category }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server error generating story. Please try again.');
      }

      const data = await response.json();
      setTitle(data.title || '');
      setContent(data.content || '');
      if (data.category) {
        setCategory(data.category);
      }
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }

      if (data.isSimulated) {
        setSuccessInfo("Composition completed using offline fallback pattern. Add your GEMINI_API_KEY under Settings > Secrets to unlock raw live AI capabilities!");
      } else {
        setSuccessInfo("Gemini has finished writing your customized story draft! You can modify it or publish it instantly.");
      }
      setAiPrompt('');
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'AI writer failed to compose story.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      alert("Please authenticate to write articles.");
      return;
    }

    if (title.trim().length < 3) {
      alert("Please write a title (minimum 3 characters)");
      return;
    }

    if (content.trim().length < 5) {
      alert("Please write some actual article content (minimum 5 characters)");
      return;
    }

    setPublishing(true);
    const postId = `post-${Date.now()}`;
    const postRef = doc(db, 'posts', postId);

    const postPayload = {
      title: title.trim(),
      content: content.trim(),
      category,
      image: imageUrl.trim() || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=60',
      authorId: user.uid,
      authorName: profile.displayName,
      authorPhoto: profile.photoURL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likesCount: 0,
      commentsCount: 0
    };

    try {
      await setDoc(postRef, postPayload);
      navigate(`/posts/${postId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${postId}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8" id="create-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-sans font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
            Compose Story
            <Feather className="w-6 h-6 text-[#0f5132]" />
          </h1>
          <p className="text-gray-500 text-sm mt-1">Design a captivating story to ignite conversation</p>
        </div>

        {/* Tab triggers for composing vs previewing */}
        <div className="flex bg-[#fcfbf9] border border-gray-100 p-1.5 rounded-xl self-start">
          <button 
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer ${activeTab === 'write' ? 'bg-[#0f5132] text-white shadow-xs' : 'text-gray-600 hover:text-gray-950'}`}
          >
            <Edit className="w-3.5 h-3.5" />
            Write
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer ${activeTab === 'preview' ? 'bg-[#0f5132] text-white shadow-xs' : 'text-gray-600 hover:text-gray-950'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Layout
          </button>
        </div>
      </div>

      {activeTab === 'write' ? (
        <form onSubmit={handlePublish} className="space-y-6">
          {/* AI Story Co-Writer Assistant */}
          <div className="bg-[#fcfbf9] border border-gray-100 p-6 rounded-3xl space-y-4 shadow-xs" id="ai-story-generator-panel">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-[#0f5132] rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-sans font-bold text-gray-950">Gemini AI Writer Assistant</h3>
                <p className="text-xs text-gray-500">Need inspiration? Describe your story topic or prompt and let AI compose a high-quality draft for you instantly!</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex. Reflections on how artificial intelligence is changing modern coding practices..."
                className="flex-1 bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-semibold text-gray-950 placeholder-gray-400 focus:border-[#0f5132] focus:outline-hidden transition-all"
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    generateAiStory();
                  }
                }}
              />
              <button
                type="button"
                onClick={generateAiStory}
                disabled={isGenerating}
                className="bg-[#0f5132] hover:bg-[#0c4028] disabled:bg-gray-300 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                id="ai-generate-story-btn"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Composing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Draft Story
                  </>
                )}
              </button>
            </div>

            {generationError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50/50 p-2.5 rounded-lg border border-red-100">{generationError}</p>
            )}

            {successInfo && (
              <p className="text-xs font-semibold text-[#0f5132] bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">{successInfo}</p>
            )}
          </div>

          {/* Main Title inputs */}
          <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Publication Title</label>
              <input 
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is the story outline..."
                className="w-full bg-[#faf9f6]/80 border border-gray-200 rounded-xl py-3 px-4 text-sm font-sans font-bold text-gray-950 placeholder-gray-400 focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category Genre</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#faf9f6]/80 border border-gray-200 rounded-xl py-3 px-4 text-sm font-semibold text-gray-800 focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all"
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
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#faf9f6]/80 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all"
                  />
                  <ImageIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Quick Suggesters */}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pick a curated preset cover:</span>
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => { setImageUrl(preset.url); setCategory(preset.cat); }}
                    className={`text-[11px] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${imageUrl === preset.url ? 'bg-emerald-50 text-[#0f5132] border-[#0f5132]' : 'bg-white text-gray-600 border-gray-100'}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.cat === 'AI' ? '#8b5cf6' : preset.cat === 'Lifestyle' ? '#10b981' : preset.cat === 'Travel' ? '#f43f5e' : preset.cat === 'Technology' ? '#3b82f6' : '#d97706' }} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Deep Content editor */}
          <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Story Manuscript (Supports Markdown)</span>
              <span className="text-[10px] text-gray-400 font-mono">
                {content.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            <textarea 
              required
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="### The adventure begins...&#10;&#10;Use headings, blockquotes, code-blocks and robust paragraphs to captivate readers."
              className="w-full bg-[#faf9f6]/60 border border-gray-200 rounded-2xl p-4 text-sm font-mono leading-relaxed focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all text-gray-800"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="border border-gray-200 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Discard Draft
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="bg-[#0f5132] hover:bg-[#0c4028] disabled:bg-gray-300 text-white text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-950/10 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              {publishing ? 'Publishing saga...' : 'Publish manuscript'}
            </button>
          </div>
        </form>
      ) : (
        /* Preview Tab Layout */
        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">{category}</span>
          <h1 className="text-3xl md:text-5xl font-sans font-extrabold text-gray-950 tracking-tight mt-4 leading-tight">
            {title || 'Untitled Manuscript'}
          </h1>

          <div className="flex items-center gap-2 text-gray-400 text-xs mt-4 py-4 border-y border-gray-50 mb-6">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>By {profile?.displayName || 'SageWriter'}</span>
            <span className="mx-1">•</span>
            <span>Just now</span>
          </div>

          {imageUrl && (
            <div className="rounded-2xl overflow-hidden aspect-video w-full mb-6">
              <img 
                src={imageUrl} 
                alt="Story cover" 
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="markdown-body prose max-w-none">
            {content ? <Markdown>{content}</Markdown> : <p className="text-gray-400 italic">No story written yet. Start typing inside the 'Write' tab.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
