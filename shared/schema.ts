import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the users table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create the insert schema for users
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  createdAt: true
});

// Export types for TypeScript
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define the files table schema
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(), // base64 encoded content
  parentId: integer("parent_id"),
  isFolder: boolean("is_folder").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

// Create the insert schema, omitting auto-generated fields
export const insertFileSchema = createInsertSchema(files).omit({ 
  id: true,
  createdAt: true,
  userId: true
});

// Export types for TypeScript
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Update maximum file size to 100GB
export const MAX_FILE_SIZE = 100 * 1024 * 1024 * 1024; // 100GB
export const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024; // 100GB total storage