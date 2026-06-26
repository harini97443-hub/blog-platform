/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SeedPost {
  id: string;
  title: string;
  content: string;
  category: string;
  image: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  likesCount: number;
  commentsCount: number;
}

export const SEED_POSTS: SeedPost[] = [
  {
    id: 'post-1',
    title: 'The Dawn of Humane AI: Interacting with Agents as Coworkers',
    content: `We are witnessing a dramatic departure from command-line UI towards contextual human-AI synergy. Today, agents don't simply execute queries; they absorb intent, plan workflows, and execute alongside us as creative partners.

### What is Intent-Centric Design?
In the legacy software era, we were operators of systems. In the era of Humane intelligence, our sole currency is contextual intent:
1. **Context Alignment**: Systems scan environment dynamics to infer outcomes before you ask.
2. **Modular Architecture**: Systems break complex structures into simple targets dynamically.

Let's look at an elegant pseudo-schema of how modern agents map constraints:
\`\`\`typescript
interface OperationalWorkflow {
  intent: string;
  constraints: string[];
  steps: Array<{ task: string; done: boolean }>;
}
\`\`\`

The goal is plain: systems must operate on trust, absolute correctness, and responsive typography rather than massive cognitive loads. Built purely on SageInk's core sage philosophy.`,
    category: 'AI',
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60',
    authorId: 'admin_seed_uid',
    authorName: 'Evelyn Harris',
    authorPhoto: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Evelyn',
    likesCount: 12,
    commentsCount: 2
  },
  {
    id: 'post-2',
    title: 'Minimalist Workspaces: Engineering Focus in a Distracted World',
    content: `Our physical workspaces directly mirror our cognitive load. Overcrowding your screen with notifications, terminal outputs, and complex layouts reduces deliberate focus and quality output.

> "Simplicity is the ultimate sophistication." — Leonardo da Vinci

### 4 Pillars of a Warm Minimalist Workspace
1. **Visual Negative Space**: Keep only active elements on your desk and screen.
2. **Tactile Boundaries**: Choose materials that age well—solid wood, organic cotton, unglazed porcelain.
3. **Calibrating Ambience**: Allow natural lighting to dictate your creative rhythm.
4. **Pruning Inputs**: Set rigid limits on incoming notifications during active writing blocks.

By stripping constant telemetry, we unlock true craftsmanship, building clean systems with rich margins and unhurried breath.`,
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?w=800&auto=format&fit=crop&q=60',
    authorId: 'admin_seed_uid',
    authorName: 'Marcus Lin',
    authorPhoto: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus',
    likesCount: 8,
    commentsCount: 1
  },
  {
    id: 'post-3',
    title: 'De-coupling our Routines: A Digital Sanctuary in Kyoto',
    content: `Wandering through the moss gardens of Honen-in, the digital rush fades. In modern technology development, we measure lives in megabits and sub-millisecond responses. Here, time is measured in rainfall, tea leaves, and passing light.

### Lessons in Zen Architecture
A Zen space gets its energy from silent boundaries:
* **The Engawa**: An intermediate deck separating inside from outside—neither strictly interior nor exterior.
* **Shibui**: Beauty found in weathered, natural, authentic impermanence.

When designing human-centric software, we must create interfaces that feel like mossy gardens, giving readers room to reflect, digest, and write from their heart.`,
    category: 'Travel',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60',
    authorId: 'admin_seed_uid',
    authorName: 'Hana Sato',
    authorPhoto: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hana',
    likesCount: 15,
    commentsCount: 0
  },
  {
    id: 'post-4',
    title: 'Web Design in 2026: Designing for Quiet Readers',
    content: `For a decade, the web has been an arena of high-contrast banners, infinite popups, promotional newsletters, and floating widgets. We have reached a saturation point: visual noise is causing digital fatigue.

### The Quiet Web Manifesto
1. **No Unsolicited Popups**: Never interrupt a reader in the flow of ingestion.
2. **Literal Labels over Hype**: Use terms like "Save Draft" rather than "Unlock Unlimited Performance".
3. **Typography first**: Spend hours calibrating font hierarchies, letter spacing, and paragraph heights. If typography is flawless, decoration is useless.

Let's make our platforms places of rest rather than relentless sales targets.`,
    category: 'Technology',
    image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=60',
    authorId: 'admin_seed_uid',
    authorName: 'Evelyn Harris',
    authorPhoto: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Evelyn',
    likesCount: 5,
    commentsCount: 3
  }
];

export async function seedInitialData() {
  const batch = writeBatch(db);

  for (const post of SEED_POSTS) {
    const postRef = doc(db, 'posts', post.id);
    batch.set(postRef, {
      title: post.title,
      content: post.content,
      category: post.category,
      image: post.image,
      authorId: post.authorId,
      authorName: post.authorName,
      authorPhoto: post.authorPhoto,
      createdAt: new Date(),
      updatedAt: new Date(),
      likesCount: post.likesCount,
      commentsCount: post.commentsCount
    });

    // Seed dummy comment for validation if needed
    if (post.commentsCount > 0) {
      const commentRef = doc(db, 'posts', post.id, 'comments', `comment-${post.id}-1`);
      batch.set(commentRef, {
        postId: post.id,
        content: `Indeed, this concept resonates deeply. Looking forward to reading more of your publications on SageInk!`,
        authorId: 'reader_seed_uid',
        authorName: 'Arthur Dent',
        authorPhoto: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Arthur',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  try {
    // Commit batch
    await batch.commit();
  } catch (err) {
    console.warn("Firestore batch seeding failed, falling back to writing to Virtual Local DB:", err);
    const VIRTUAL_DB_KEY = 'sageink_virtual_db';
    let dbData: any = {};
    try {
      dbData = JSON.parse(localStorage.getItem(VIRTUAL_DB_KEY) || '{}');
    } catch {}

    for (const post of SEED_POSTS) {
      dbData[`posts/${post.id}`] = {
        title: post.title,
        content: post.content,
        category: post.category,
        image: post.image,
        authorId: post.authorId,
        authorName: post.authorName,
        authorPhoto: post.authorPhoto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likesCount: post.likesCount,
        commentsCount: post.commentsCount
      };

      if (post.commentsCount > 0) {
        dbData[`posts/${post.id}/comments/comment-${post.id}-1`] = {
          postId: post.id,
          content: `Indeed, this concept resonates deeply. Looking forward to reading more of your publications on SageInk!`,
          authorId: 'reader_seed_uid',
          authorName: 'Arthur Dent',
          authorPhoto: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Arthur',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }
    localStorage.setItem(VIRTUAL_DB_KEY, JSON.stringify(dbData));
  }
}
