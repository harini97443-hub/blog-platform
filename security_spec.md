# Firebase Security Specification & Red Team Audit Plan

This document outlines the security invariants, structural payload validations, and adversarial tests drafted to lock down the Blog Platform.

## 1. Core Data Invariants

1. **User Ownership Boundaries**: No user can write, update, or edit another user's profile, private info, bookmarks, posts, or comments.
2. **Admin Override Power**: Administrators (specifically `harini97443@gmail.com`) can delete any inappropriate blog posts or comments and remove misbehaving users to maintain platform hygiene.
3. **Immutable Identity Traces**: On creation, UIDs (`authorId`, `userId`, `uid`) must match the authenticated user's ID (`request.auth.uid`). No identity spoofing is allowed.
4. **Action-Based Updates**:
   - For blog posts, only specific fields like title, content, category, and image can be updated by the owner. Actions causing changes to counters (`likesCount`, `commentsCount`) or structural fields require strict schema verification and transactional rules.
   - For comments, only standard body elements (`content`, `updatedAt`) can be updated.
5. **Enforced Timestamps**: Creation and update timestamps (`createdAt`, `updatedAt`) must rely strictly on `request.time` server timestamps.
6. **Integrity checks**: A like or comment can only be registered if the parent post actually exists. Bookmarks are verified against user existence.

---

## 2. The "Dirty Dozen" Hack Payloads & Threat Modeling

Here are the 12 specific hostile payloads designed to compromise the platform, and the structural logical gates that block them:

| ID | Target Path | Threat / Exploitable Action | Evil Payload / Operation | Expected Result | Secure Counter-Logic Gate |
|---|---|---|---|---|---|
| **1** | `users/malicious_user` | **Self-Privilege Escalation** (Attempting to make oneself an administrator) | Writes `{ "email": "malicious@hack.com", "isAdmin": true, "joinedAt": request.time }` to `/users/malicious_user/private/info` | **PERMISSION_DENIED** | Auth check `request.auth.token.email == 'harini97443@gmail.com'` for admin privileges or block edit of `isAdmin` attribute unless admin. |
| **2** | `users/legit_user` | **Profile Impersonation / Overwrite** (Writing into another user's public profile) | Authentic user `attacker` writes to `/users/legit_user` `{ "uid": "legit_user", "displayName": "Legit User" }` | **PERMISSION_DENIED** | ID correlation gate: `userId == request.auth.uid` |
| **3** | `posts/evil_post` | **Identity Spoofing in Posts** (Publishing a blog marking a clean user as the author) | Writes `{ "title": "Evil Blog", "authorId": "innocent_victim_uid", "authorName": "Victim", ... }` | **PERMISSION_DENIED** | Author authentication match: `request.resource.data.authorId == request.auth.uid` |
| **4** | `posts/some_post` | **Counter Inflation / Like Spoof** (Artificially changing `likesCount` on articles without actually liking it) | Standard update patch matching author, attempting to set `likesCount: 9999` directly | **PERMISSION_DENIED** | Exclude counter updates from allowed user updates via `affectedKeys().hasOnly(['title', 'content', 'category', 'image', 'updatedAt'])`. |
| **5** | `posts/post_123/comments/c_999` | **Stolen Identification in Comments** (Submitting comments claiming they belong to someone else) | Writes `{ "content": "I am a scammer", "authorId": "innocent_uid", ... }` | **PERMISSION_DENIED** | Match comment writer with user auth trace: `incoming().authorId == request.auth.uid` |
| **6** | `posts/post_123/comments/c_999` | **Cross-Comment Tampering** (Editing someone else's comment) | Standard update by `attacker_uid` targeting comment written by `victim_uid` | **PERMISSION_DENIED** | Check current writer matching database resource owner: `resource.data.authorId == request.auth.uid` |
| **7** | `posts/post_123` | **Inappropriate Content Bypass** (Injecting extreme quantities of text data to trigger Denial of Wallet attacks) | Writes massive string (e.g., > 10MB) into `content` or `title` | **PERMISSION_DENIED** | Enforced limits: `incoming().title.size() <= 100` and `incoming().content.size() <= 100000` |
| **8** | `posts/_MALICIOUS_LONG_ID_...` | **ID Poisoning / Resource Exhaustion** | Creates a blog post with a 10KB string ID containing weird characters | **PERMISSION_DENIED** | Path size and pattern validations: `isValidId(postId)` checking string size ≤ 128 and character match regex `^[a-zA-Z0-9_\-]+$` |
| **9** | `posts/post_abc/likes/attacker_uid` | **Double Liking / Multiplying Likes** | Tries to write a like record into `posts/post_abc/likes/attacker_uid` using a spoofed child ID or extra fields | **PERMISSION_DENIED** | Match route parameter ID: `userId == request.auth.uid` and strict schema match verification. |
| **10**| `posts/post_123` | **Timestamp Falsification** (Backdating articles to look like they were made in 2010) | Writes `{ "createdAt": timestamp("2010-01-01T00:00:00Z"), ... }` | **PERMISSION_DENIED** | Strict timestamp enforcement: `incoming().createdAt == request.time` and `incoming().updatedAt == request.time` |
| **11**| `users/attacker_uid/bookmarks/post_123`| **Orphaned Bookmark Planting** (Tagging an entry that doesn't actually exist in the platform database) | Standard write targeting a fake `post_123` | **PERMISSION_DENIED** | Database synchronization check: `exists(/databases/$(database)/documents/posts/$(postId))` |
| **12**| `posts` | **Blanket Reading Scraping attack** (Attacking database list queries without matching structural boundaries) | Unauthenticated user requests collection query matching entire database | **PERMISSION_DENIED** | Public feeds are visible, but secure user elements or system settings are strictly bounded. |

---

## 3. Implementation Verification Strategy

This spec matches exactly the core structural layout in our Firestore Rules. The rules are deployed atomically. Every write payload undergoes validation through custom `isValid[Entity]` macros and transaction limits.
