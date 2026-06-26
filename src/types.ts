/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
}

export interface PrivateInfo {
  email: string;
  joinedAt: any; // Timestamp or date
  isAdmin: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  category: string;
  image: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  likesCount: number;
  commentsCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp;
}

export interface Like {
  postId: string;
  userId: string;
  createdAt: any; // Timestamp
}

export interface Bookmark {
  postId: string;
  userId: string;
  createdAt: any; // Timestamp
}

export interface AdminStats {
  totalUsers: number;
  totalBlogs: number;
  totalComments: number;
  totalCategories: number;
}
