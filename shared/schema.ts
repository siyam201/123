import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(), // base64 encoded content
  parentId: integer("parent_id").references(() => files.id),
  isFolder: boolean("is_folder").notNull().default(false),
});

export const insertFileSchema = createInsertSchema(files).omit({ 
  id: true 
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024; // 100GB