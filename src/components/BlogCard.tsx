/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { Heart, MessageSquare, BookOpen, Clock } from 'lucide-react';
import { BlogPost } from '../types';

interface BlogCardProps {
  post: BlogPost;
  isBookmarked?: boolean;
  onToggleBookmark?: (e: React.MouseEvent) => void;
}

export function formatDate(timestamp: any) {
  if (!timestamp) return 'Just now';
  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (err) {
    return 'Recently';
  }
}

export default function BlogCard({ post, isBookmarked = false, onToggleBookmark }: BlogCardProps) {
  const getCategoryTheme = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'technology':
        return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'ai':
        return 'text-purple-700 bg-purple-50 border-purple-100';
      case 'education':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'lifestyle':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'travel':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-100';
    }
  };

  const readingTime = Math.max(1, Math.ceil((post.content?.split(/\s+/).length || 100) / 200));

  return (
    <article className="bg-[#fafefc] rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-950/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden h-full group" id={`post-card-${post.id}`}>
      <div>
        {/* Banner Image */}
        <Link to={`/posts/${post.id}`} className="relative block overflow-hidden aspect-video bg-gray-100 cursor-pointer">
          <img 
            src={post.image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=60'} 
            alt={post.title} 
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-102"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=60';
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Content Body */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCategoryTheme(post.category)}`}>
              {post.category || 'General'}
            </span>
            <div className="flex items-center text-gray-400 text-xs gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{readingTime} min read</span>
            </div>
          </div>

          <Link to={`/posts/${post.id}`} className="block block group-hover:text-[#0f5132] cursor-pointer">
            <h3 className="font-sans font-bold text-lg text-gray-950 leading-snug line-clamp-2 mb-2 group-hover:text-[#0f5132] transition-colors">
              {post.title}
            </h3>
          </Link>

          <p className="text-gray-500 text-sm line-clamp-3 mb-4 leading-relaxed">
            {post.content ? post.content.replace(/[#*`_\[\]]/g, '') : ''}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img 
            src={post.authorPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.authorId}`} 
            alt={post.authorName} 
            className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-xs font-bold text-gray-800 line-clamp-1">{post.authorName}</p>
            <p className="text-[10px] text-gray-400">{formatDate(post.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
            <span>{post.likesCount || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>{post.commentsCount || 0}</span>
          </div>
          {onToggleBookmark && (
            <button 
              onClick={onToggleBookmark} 
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isBookmarked ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:text-amber-500 hover:bg-gray-50'}`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark for later'}
            >
              <BookOpen className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
