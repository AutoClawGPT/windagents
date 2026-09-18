import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/** WindAgents schema — sqlite for localhost; postgres-compatible field names for Neon migration. */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  type: text("type").notNull().default("human"), // human | agent
  email: text("email"),
  walletAddress: text("wallet_address"),
  authTokenHash: text("auth_token_hash"),
  ed25519PublicKey: text("ed25519_public_key"),
  payoutWallet: text("payout_wallet"),
  encryptedKeys: text("encrypted_keys"), // JSON AES-GCM blobs
  skillMdContent: text("skill_md_content"),
  displayName: text("display_name"),
  moonpayEmail: text("moonpay_email"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  clawpumpAgentId: text("clawpump_agent_id"),
  name: text("name").notNull(),
  persona: text("persona"),
  model: text("model").default("moonshotai/kimi-k2.5"),
  status: text("status").notNull().default("stopped"), // stopped | running | error
  walletAddress: text("wallet_address"),
  skills: text("skills"), // JSON string[]
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  avatarUrl: text("avatar_url"),
  avatarGlbUrl: text("avatar_glb_url"),
  avatarPrompt: text("avatar_prompt"),
  tokenMint: text("token_mint"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  ed25519PublicKey: text("ed25519_public_key"),
  ed25519Signature: text("ed25519_signature"),
  skillMdContent: text("skill_md_content"),
  payload: text("payload"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expires: text("expires").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  source: text("source").notNull().default("windagents"),
  skillMdContent: text("skill_md_content"),
  tags: text("tags"), // JSON
  installed: integer("installed", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const signals = sqliteTable("signals", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // buy | sell | hold | info
  source: text("source").notNull(),
  tokenSymbol: text("token_symbol"),
  tokenMint: text("token_mint"),
  message: text("message").notNull(),
  price: text("price"),
  confidence: integer("confidence"),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const listings = sqliteTable("listings", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  priceSol: integer("price_sol"),
  status: text("status").notNull().default("active"),
  sellerUserId: text("seller_user_id").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const bounties = sqliteTable("bounties", {
  id: text("id").primaryKey(),
  creatorUserId: text("creator_user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardToken: text("reward_token").notNull().default("SOL"),
  rewardAmount: text("reward_amount").notNull(),
  status: text("status").notNull().default("open"),
  deliverable: text("deliverable"),
  proofUrl: text("proof_url"),
  assigneeUserId: text("assignee_user_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const agentReputation = sqliteTable("agent_reputation", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  trustTier: text("trust_tier").notNull().default("unrated"),
  reputationScore: integer("reputation_score").notNull().default(0),
  totalTrades: integer("total_trades").notNull().default(0),
  successfulTrades: integer("successful_trades").notNull().default(0),
  totalLaunches: integer("total_launches").notNull().default(0),
  totalBounties: integer("total_bounties").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const agentMessages = sqliteTable("agent_messages", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id).notNull(),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});


export const communityPosts = sqliteTable("community_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  tweetUrl: text("tweet_url"),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const communityComments = sqliteTable("community_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").references(() => communityPosts.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const communityLikes = sqliteTable("community_likes", {
  id: text("id").primaryKey(),
  postId: text("post_id").references(() => communityPosts.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const communityFollows = sqliteTable("community_follows", {
  id: text("id").primaryKey(),
  followerUserId: text("follower_user_id").references(() => users.id).notNull(),
  followingUserId: text("following_user_id").references(() => users.id).notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const rewardTasks = sqliteTable("reward_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rewardToken: text("reward_token").notNull().default("SOL"),
  rewardAmount: text("reward_amount").notNull(),
  proofType: text("proof_type").notNull().default("url"), // url | wallet | x
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const rewardSubmissions = sqliteTable("reward_submissions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").references(() => rewardTasks.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  proofUrl: text("proof_url"),
  proofWallet: text("proof_wallet"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const x402Payments = sqliteTable("x402_payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  payerAddress: text("payer_address"),
  amount: text("amount").notNull(),
  token: text("token").notNull().default("SOL"),
  endpoint: text("endpoint"),
  txSignature: text("tx_signature"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type Bounty = typeof bounties.$inferSelect;

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  kind: text("kind").notNull().default("image"), // image | banner
  mime: text("mime").notNull(),
  path: text("path").notNull(),
  bytes: integer("bytes").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  twitterHandle: text("twitter_handle"),
  twitterCode: text("twitter_code"),
  twitterVerifiedAt: text("twitter_verified_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type Upload = typeof uploads.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
