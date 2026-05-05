# SoloConnect Security Specification (Hardened)

## 1. Data Invariants
- **Identity Lock**: A user can only create their own profile. Once created, `uid` and `email` are immutable.
- **Relational Integrity**: Posts, Comments, and Opportunities must reference valid user IDs.
- **Atomic Deletion**: The `deleted` flag on a user profile is a terminal state. Once set to `true`, the account is effectively "dead" to the client.
- **Vouch Integrity**: A user cannot vouch for themselves (enforced at write).
- **Opportunity Protection**: Only the creator of an opportunity can close it or redact it.

## 2. The "Dirty Dozen" Payloads (Red Team Targets)
1. **The ID Poisoner**: Attempt to create a user with a 2KB binary string as the ID. -> *Denied by `isValidId()`*
2. **The Shadow Update**: Update a user profile with an unauthorized `isAdmin` or `role` flag. -> *Denied by `affectedKeys().hasOnly()`*
3. **The Identity Spoof**: Create a post with someone else's `authorId`. -> *Denied by `request.auth.uid == data.authorId`*
4. **The Vouch Loop**: Vouch for yourself to boost trust. -> *Denied by `toUserId != fromUserId`*
5. **The Outcome Shortcut**: Close an opportunity you don't own. -> *Denied by `isOwner(resource.data.userId)`*
6. **The Denial of Wallet**: Create a post with a 5MB string content. -> *Denied by `.size() <= 5000`*
7. **The Comment Blast**: Create a comment without a `postId`. -> *Denied by `hasAll(['postId'])`*
8. **The Ghost Like**: Increment a post's like count without being in the `likes` array. -> *Denied by logic gate.*
9. **The PII Scraper**: List all users without a where clause. -> *Denied by rule-side enforcement.*
10. **The Immortal Bypass**: Change the `createdAt` timestamp of a post. -> *Denied by immutable field rule.*
11. **The System Field Injection**: Inject internal `_sys_metadata` into a document. -> *Denied by strict key sets.*
12. **The Terminal Resurrect**: Change `deleted: true` back to `false`. -> *Denied by terminal state locking.*

## 3. Test Runner
A `firestore.rules.test.ts` file would be used here to automate these checks using the `@firebase/rules-unit-testing` library.
