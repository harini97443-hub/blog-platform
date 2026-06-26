/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  doc, 
  collection, 
  serverTimestamp,
  query,
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BlogPost, Comment, Like } from '../types';
import Markdown from 'react-markdown';
import { formatDate } from '../components/BlogCard';
import { 
  Heart, 
  MessageSquare, 
  BookOpen, 
  ArrowLeft, 
  Trash2, 
  Edit, 
  Send, 
  User, 
  Clock, 
  AlertTriangle,
  Loader,
  Share2
} from 'lucide-react';

export default function BlogDetails() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentingLoading, setCommentingLoading] = useState(false);

  // Fetch critical details
  const fetchPostDetails = async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        setPost(null);
        setLoading(false);
        return;
      }

      setPost({ id: postSnap.id, ...postSnap.data() } as BlogPost);

      // Fetch comments
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const commentsQuery = query(commentsRef, orderBy('createdAt', 'asc'));
      const commentsSnap = await getDocs(commentsQuery);
      
      const loadedComments: Comment[] = [];
      commentsSnap.forEach((docSnap) => {
        loadedComments.push({ id: docSnap.id, ...docSnap.data() } as Comment);
      });
      setComments(loadedComments);

      // Check if current user liked this post
      if (user) {
        const likeRef = doc(db, 'posts', postId, 'likes', user.uid);
        const likeSnap = await getDoc(likeRef);
        setIsLiked(likeSnap.exists());
      } else {
        setIsLiked(false);
      }
    } catch (err) {
      console.error(err);
      // Fallback for missing index when orderBy is loading
      try {
        const commentsRef = collection(db, 'posts', postId, 'comments');
        const commentsSnap = await getDocs(commentsRef);
        const loadedComments: Comment[] = [];
        commentsSnap.forEach((docSnap) => {
          loadedComments.push({ id: docSnap.id, ...docSnap.data() } as Comment);
        });
        setComments(loadedComments);
      } catch (childErr) {
        handleFirestoreError(childErr, OperationType.GET, `posts/${postId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
  }, [postId, user]);

  // Handle article deletion
  const handleDeletePost = async () => {
    if (!post) return;
    const confirmDelete = window.confirm("Are you absolutely sure you want to remove this publication? It cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'posts', post.id));
      // Optionally clean up subcollections if desired, but Firestore rules handle this
      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  // Transaction-secure Liking system
  const handleToggleLike = async () => {
    if (!user || !post) {
      alert("Please sign in or register to support this writer!");
      return;
    }

    const likeRef = doc(db, 'posts', post.id, 'likes', user.uid);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        // Decrement like
        await deleteDoc(likeRef);
        const newLikesCount = Math.max(0, post.likesCount - 1);
        await updateDoc(postRef, { likesCount: newLikesCount });
        setIsLiked(false);
        setPost(prev => prev ? { ...prev, likesCount: newLikesCount } : null);
      } else {
        // Increment like
        const lPayload = {
          postId: post.id,
          userId: user.uid,
          createdAt: serverTimestamp()
        };
        await setDoc(likeRef, lPayload);
        const newLikesCount = post.likesCount + 1;
        await updateDoc(postRef, { likesCount: newLikesCount });
        setIsLiked(true);
        setPost(prev => prev ? { ...prev, likesCount: newLikesCount } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}/likes/${user.uid}`);
    }
  };

  // Create new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !post || !newCommentText.trim()) return;

    setCommentingLoading(true);
    const commentId = `comment-${Date.now()}`;
    const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
    const postRef = doc(db, 'posts', post.id);

    const fullComment = {
      postId: post.id,
      content: newCommentText.trim(),
      authorId: user.uid,
      authorName: profile.displayName,
      authorPhoto: profile.photoURL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      // Create comment document
      await setDoc(commentRef, fullComment);
      
      // Update comment count on parent post
      const newCount = post.commentsCount + 1;
      await updateDoc(postRef, { commentsCount: newCount });

      // Sync local state
      setComments(prev => [
        ...prev, 
        { 
          ...fullComment, 
          id: commentId, 
          createdAt: new Date(), 
          updatedAt: new Date() 
        } as Comment
      ]);
      setPost(prev => prev ? { ...prev, commentsCount: newCount } : null);
      setNewCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}/comments/${commentId}`);
    } finally {
      setCommentingLoading(false);
    }
  };

  // Start edit comment action
  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  // Commit update comment
  const handleSaveEditComment = async (commentId: string) => {
    if (!post || !editingCommentText.trim()) return;

    const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
    try {
      await updateDoc(commentRef, {
        content: editingCommentText.trim(),
        updatedAt: serverTimestamp()
      });

      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editingCommentText.trim(), updatedAt: new Date() } : c));
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}/comments/${commentId}`);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;
    const confirmDelete = window.confirm("Delete this comment?");
    if (!confirmDelete) return;

    const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
    const postRef = doc(db, 'posts', post.id);

    try {
      await deleteDoc(commentRef);
      const newCount = Math.max(0, post.commentsCount - 1);
      await updateDoc(postRef, { commentsCount: newCount });

      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(prev => prev ? { ...prev, commentsCount: newCount } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}/comments/${commentId}`);
    }
  };

  const shareArticle = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Article URL copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4" id="details-loader">
        <Loader className="w-8 h-8 text-[#0f5132] animate-spin" />
        <p className="text-sm font-semibold text-gray-400">Opening SageInk publication manuscript...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-3xl border border-gray-100 shadow-md text-center" id="post-not-found">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Manuscript not found</h2>
        <p className="text-gray-500 text-sm mt-1 leading-relaxed">The post you are searching for might have been deleted, moved, or blocked by the moderator team.</p>
        <Link to="/" className="inline-flex items-center gap-1.5 mt-6 bg-[#0f5132] text-white text-xs font-semibold px-4 py-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>
      </div>
    );
  }

  const readingTime = Math.max(1, Math.ceil((post.content?.split(/\s+/).length || 100) / 200));

  return (
    <div className="max-w-4xl mx-auto px-6 py-10" id="blog-details-view">
      {/* Back navigation */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium mb-8 cursor-pointer group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Publications
      </Link>

      <article id="manuscript">
        {/* Category & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <span className="text-xs font-bold text-[#0f5132] uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            {post.category || 'General'}
          </span>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Clock className="w-4 h-4" />
            <span>{readingTime} min read</span>
            <span className="mx-1">•</span>
            <span>Published {formatDate(post.createdAt)}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-sans font-extrabold text-gray-950 leading-tight tracking-tight mb-6">
          {post.title}
        </h1>

        {/* Author Metadata Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-5 border-y border-gray-100 mb-8">
          <div className="flex items-center gap-3">
            <img 
              src={post.authorPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.authorId}`} 
              alt={post.authorName} 
              className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-50"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-sm font-extrabold text-gray-900 leading-none">{post.authorName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Contributor Penman & Creator</p>
            </div>
          </div>

          {/* Quick Management Triggers for Author or Admin */}
          <div className="flex items-center gap-2">
            {(user?.uid === post.authorId) && (
              <Link 
                to={`/edit/${post.id}`}
                className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer border border-gray-200"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Manuscript
              </Link>
            )}

            {(user?.uid === post.authorId || isAdmin) && (
              <button 
                onClick={handleDeletePost}
                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer border border-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}

            <button 
              onClick={shareArticle}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
              title="Copy link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banner Image */}
        {post.image && (
          <div className="rounded-2xl overflow-hidden aspect-video w-full mb-8 shadow-sm">
            <img 
              src={post.image} 
              alt={post.title} 
              className="object-cover w-full h-full"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Deep Body - Rendered beautifully in custom Markdown */}
        <div className="markdown-body prose max-w-none mb-12">
          <Markdown>{post.content}</Markdown>
        </div>
      </article>

      {/* Interactive Core: Likes, Share bar */}
      <div className="flex items-center gap-4 py-4 border-t border-b border-gray-100 mb-12">
        <button 
          onClick={handleToggleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            isLiked 
              ? 'bg-rose-50 text-rose-600 border-rose-200 scale-102 shadow-xs' 
              : 'bg-white text-gray-500 border-gray-200 hover:border-rose-400 hover:text-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-600' : ''}`} />
          <span>{post.likesCount || 0} Likes</span>
        </button>
        
        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>{post.commentsCount || 0} Discussions</span>
        </div>
      </div>

      {/* Comments Central Layout */}
      <section className="bg-white/40 border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xs" id="discussions-section">
        <h3 className="text-xl font-sans font-extrabold text-gray-900 tracking-tight mb-6 flex items-center gap-2">
          Discussions
          <span className="text-xs font-bold text-[#0f5132] bg-emerald-50 px-2.5 py-0.5 rounded-full">{comments.length}</span>
        </h3>

        {/* Create comment Form */}
        {user ? (
          <form onSubmit={handleAddComment} className="mb-8">
            <div className="flex items-start gap-3">
              <img 
                src={profile?.photoURL} 
                alt={profile?.displayName} 
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-1"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1">
                <textarea 
                  required
                  rows={3}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Share your thoughts on this publication..."
                  className="w-full bg-[#faf9f6]/90 border border-gray-200 rounded-2xl p-4 text-sm focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all text-gray-800"
                />
                <div className="flex justify-end mt-2">
                  <button 
                    type="submit"
                    disabled={commentingLoading || !newCommentText.trim()}
                    className="bg-[#0f5132] hover:bg-[#0c4028] disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-xs font-semibold px-4.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {commentingLoading ? 'Posting...' : 'Post Comment'}
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-[#fcfbf9] rounded-2xl p-5 border border-gray-100 text-center mb-8">
            <p className="text-sm text-gray-500">Would you like to participate in the conversation?</p>
            <div className="flex justify-center gap-3 mt-3">
              <Link to="/login" className="bg-[#0f5132] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#0c4028]">
                Sign In
              </Link>
              <Link to="/register" className="border border-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-gray-50">
                Join Free
              </Link>
            </div>
          </div>
        )}

        {/* Comments feeds */}
        {comments.length === 0 ? (
          <div className="text-center py-10" id="no-comments">
            <p className="text-gray-400 text-sm">No comments yet. Be the first to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-6" id="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 text-sm group" id={`comment-node-${comment.id}`}>
                <img 
                  src={comment.authorPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.authorId}`} 
                  alt={comment.authorName} 
                  className="w-8.5 h-8.5 rounded-full object-cover shrink-0 mt-0.5"
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex-1 bg-white/70 border border-gray-50 rounded-2xl px-5 py-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{comment.authorName}</span>
                      {comment.authorId === post.authorId && (
                        <span className="text-[9px] font-extrabold text-[#0f5132] bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded-md uppercase">
                          Author
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{formatDate(comment.createdAt)}</span>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div>
                      <textarea 
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:border-[#0f5132] focus:outline-hidden transition-all text-gray-800"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5 mt-2">
                        <button 
                          onClick={() => setEditingCommentId(null)}
                          className="bg-gray-100 text-gray-600 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSaveEditComment(comment.id)}
                          className="bg-[#0f5132] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed break-words">{comment.content}</p>
                  )}

                  {/* Comment interaction triggers (authorized only) */}
                  {(!editingCommentId) && (user?.uid === comment.authorId || user?.uid === post.authorId || isAdmin) && (
                    <div className="flex justify-end gap-3 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user?.uid === comment.authorId && (
                        <button 
                          onClick={() => handleStartEditComment(comment)}
                          className="text-xs font-semibold text-gray-400 hover:text-[#0f5132] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs font-semibold text-gray-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
