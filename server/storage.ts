import { files, type File, type InsertFile } from "@shared/schema";

export interface IStorage {
  getFiles(parentId: number | null): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;
  getTotalSize(): Promise<number>;
  searchFiles(query: string): Promise<File[]>;
}

export class MemStorage implements IStorage {
  private files: Map<number, File>;
  private currentId: number;

  constructor() {
    this.files = new Map();
    this.currentId = 1;
  }

  async getFiles(parentId: number | null): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      file => file.parentId === parentId
    );
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentId++;
    const file: File = { ...insertFile, id };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    const file = this.files.get(id);
    if (!file) throw new Error("File not found");
    
    const updatedFile = { ...file, ...updates };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<void> {
    // Also delete all children if it's a folder
    const file = this.files.get(id);
    if (!file) return;

    if (file.isFolder) {
      for (const [key, value] of this.files.entries()) {
        if (value.parentId === id) {
          await this.deleteFile(key);
        }
      }
    }
    
    this.files.delete(id);
  }

  async getTotalSize(): Promise<number> {
    return Array.from(this.files.values())
      .filter(file => !file.isFolder)
      .reduce((acc, file) => acc + file.size, 0);
  }

  async searchFiles(query: string): Promise<File[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.files.values()).filter(
      file => file.name.toLowerCase().includes(lowerQuery)
    );
  }
}

export const storage = new MemStorage();
