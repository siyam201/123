import { drizzle } from 'drizzle-orm/postgres-js';
import { files, type File, type InsertFile } from "@shared/schema";
import postgres from 'postgres';
import { eq, like } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

// Database connection with error handling
let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  client = postgres(process.env.DATABASE_URL);
  db = drizzle(client);
  console.log("Successfully connected to PostgreSQL database");
} catch (error) {
  console.error("Failed to connect to database:", error);
  throw error;
}

export interface IStorage {
  getFiles(parentId: number | null): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;
  getTotalSize(): Promise<number>;
  searchFiles(query: string): Promise<File[]>;
}

export class PostgresStorage implements IStorage {
  async getFiles(parentId: number | null): Promise<File[]> {
    try {
      return await db.select().from(files).where(eq(files.parentId, parentId));
    } catch (error) {
      console.error("Error getting files:", error);
      throw error;
    }
  }

  async getFile(id: number): Promise<File | undefined> {
    try {
      const results = await db.select().from(files).where(eq(files.id, id));
      return results[0];
    } catch (error) {
      console.error("Error getting file:", error);
      throw error;
    }
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    try {
      const result = await db.insert(files).values(insertFile).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating file:", error);
      throw error;
    }
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    try {
      const result = await db
        .update(files)
        .set(updates)
        .where(eq(files.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  }

  async deleteFile(id: number): Promise<void> {
    try {
      const file = await this.getFile(id);
      if (!file) return;

      if (file.isFolder) {
        const children = await this.getFiles(id);
        for (const child of children) {
          await this.deleteFile(child.id);
        }
      }

      await db.delete(files).where(eq(files.id, id));
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  async getTotalSize(): Promise<number> {
    try {
      const result = await db
        .select({ total: sql<number>`sum(size)` })
        .from(files)
        .where(eq(files.isFolder, false));

      return result[0]?.total || 0;
    } catch (error) {
      console.error("Error getting total size:", error);
      throw error;
    }
  }

  async searchFiles(query: string): Promise<File[]> {
    try {
      return await db
        .select()
        .from(files)
        .where(like(files.name, `%${query}%`));
    } catch (error) {
      console.error("Error searching files:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const storage = new PostgresStorage();