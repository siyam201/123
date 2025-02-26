import { drizzle } from 'drizzle-orm/postgres-js';
import { files, type File, type InsertFile } from "@shared/schema";
import postgres from 'postgres';
import { eq, like } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

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


// Directory where files will be stored
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const METADATA_FILE = path.join(STORAGE_DIR, 'metadata.json');

// Ensure storage directory exists
async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    // Initialize metadata file if it doesn't exist
    try {
      await fs.access(METADATA_FILE);
    } catch {
      await fs.writeFile(METADATA_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    throw error;
  }
}

// Initialize storage on startup
initStorage();

export interface IStorage {
  getFiles(parentId: number | null): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;
  getTotalSize(): Promise<number>;
  searchFiles(query: {
    name?: string,
    type?: string,
    minSize?: number,
    maxSize?: number,
    startDate?: string,
    endDate?: string
  }): Promise<File[]>;
  createUser(userData: { username: string; password: string }): Promise<UserData>;
  getUser(id: number): Promise<UserData | undefined>;
  getUserByUsername(username: string): Promise<UserData | undefined>;
}

interface UserData {
  id: number;
  username: string;
  password: string;
  createdAt: Date;
}

export class FileStorage implements IStorage {
  private async readMetadata(): Promise<File[]> {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  }

  private async writeMetadata(metadata: File[]): Promise<void> {
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
  }

  private getFilePath(id: number): string {
    return path.join(STORAGE_DIR, `${id}`);
  }

  async getFiles(parentId: number | null): Promise<File[]> {
    try {
      const metadata = await this.readMetadata();
      return metadata.filter(file => file.parentId === parentId);
    } catch (error) {
      console.error("Error getting files:", error);
      throw error;
    }
  }

  async getFile(id: number): Promise<File | undefined> {
    try {
      const metadata = await this.readMetadata();
      const file = metadata.find(f => f.id === id);
      if (file && !file.isFolder) {
        const content = await fs.readFile(this.getFilePath(id), 'utf-8');
        return { ...file, content };
      }
      return file;
    } catch (error) {
      console.error("Error getting file:", error);
      throw error;
    }
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    try {
      const metadata = await this.readMetadata();
      const id = metadata.length > 0 ? Math.max(...metadata.map(f => f.id)) + 1 : 1;
      const newFile: File = {
        ...insertFile,
        id,
        createdAt: new Date()
      };

      if (!newFile.isFolder) {
        await fs.writeFile(this.getFilePath(id), insertFile.content);
        // Don't store content in metadata
        const { content, ...metadataFile } = newFile;
        metadata.push(metadataFile);
      } else {
        metadata.push(newFile);
      }

      await this.writeMetadata(metadata);
      return newFile;
    } catch (error) {
      console.error("Error creating file:", error);
      throw error;
    }
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    try {
      const metadata = await this.readMetadata();
      const index = metadata.findIndex(f => f.id === id);
      if (index === -1) throw new Error("File not found");

      const updatedFile = { ...metadata[index], ...updates };
      metadata[index] = updatedFile;

      if (!updatedFile.isFolder && updates.content) {
        await fs.writeFile(this.getFilePath(id), updates.content);
      }

      await this.writeMetadata(metadata);
      return updatedFile;
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  }

  async deleteFile(id: number): Promise<void> {
    try {
      const metadata = await this.readMetadata();
      const file = metadata.find(f => f.id === id);
      if (!file) return;

      if (file.isFolder) {
        const children = metadata.filter(f => f.parentId === id);
        for (const child of children) {
          await this.deleteFile(child.id);
        }
      } else {
        try {
          await fs.unlink(this.getFilePath(id));
        } catch (error) {
          console.warn(`Failed to delete file ${id}:`, error);
        }
      }

      const updatedMetadata = metadata.filter(f => f.id !== id);
      await this.writeMetadata(updatedMetadata);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  async getTotalSize(): Promise<number> {
    try {
      const metadata = await this.readMetadata();
      return metadata
        .filter(file => !file.isFolder)
        .reduce((acc, file) => acc + file.size, 0);
    } catch (error) {
      console.error("Error getting total size:", error);
      throw error;
    }
  }

  async searchFiles(query: {
    name?: string,
    type?: string,
    minSize?: number,
    maxSize?: number,
    startDate?: string,
    endDate?: string
  }): Promise<File[]> {
    try {
      const metadata = await this.readMetadata();
      return metadata.filter(file => {
        // Skip folders in search results
        if (file.isFolder) return false;

        // Name search (case insensitive)
        if (query.name && !file.name.toLowerCase().includes(query.name.toLowerCase())) {
          return false;
        }

        // File type search
        if (query.type && !file.type.startsWith(query.type)) {
          return false;
        }

        // Size range search
        if (typeof query.minSize === 'number' && file.size < query.minSize) {
          return false;
        }
        if (typeof query.maxSize === 'number' && file.size > query.maxSize) {
          return false;
        }

        // Date range search
        const fileDate = new Date(file.createdAt);
        if (query.startDate && fileDate < new Date(query.startDate)) {
          return false;
        }
        if (query.endDate && fileDate > new Date(query.endDate)) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error("Error searching files:", error);
      throw error;
    }
  }

  private async readUsers(): Promise<UserData[]> {
    try {
      const usersFile = path.join(STORAGE_DIR, 'users.json');
      try {
        await fs.access(usersFile);
      } catch {
        await fs.writeFile(usersFile, JSON.stringify([]));
      }
      const data = await fs.readFile(usersFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading users:", error);
      throw error;
    }
  }

  private async writeUsers(users: UserData[]): Promise<void> {
    try {
      const usersFile = path.join(STORAGE_DIR, 'users.json');
      await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error("Error writing users:", error);
      throw error;
    }
  }

  async createUser(userData: { username: string; password: string }): Promise<UserData> {
    try {
      const users = await this.readUsers();
      const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const newUser = {
        ...userData,
        id,
        createdAt: new Date()
      };
      users.push(newUser);
      await this.writeUsers(users);
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<UserData | undefined> {
    try {
      const users = await this.readUsers();
      return users.find(u => u.id === id);
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<UserData | undefined> {
    try {
      const users = await this.readUsers();
      return users.find(u => u.username === username);
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const storage = new FileStorage();