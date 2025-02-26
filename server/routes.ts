import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertFileSchema, MAX_FILE_SIZE, STORAGE_LIMIT } from "@shared/schema";

export async function registerRoutes(app: Express) {
  app.get("/api/files", async (req, res) => {
    const parentId = req.query.parentId ? Number(req.query.parentId) : null;
    const files = await storage.getFiles(parentId);
    res.json(files);
  });

  app.post("/api/files", async (req, res) => {
    const fileData = insertFileSchema.parse(req.body);
    
    // Check file size
    if (!fileData.isFolder && fileData.size > MAX_FILE_SIZE) {
      return res.status(400).json({ message: "File too large" });
    }

    // Check total storage
    const totalSize = await storage.getTotalSize();
    if (totalSize + (fileData.size || 0) > STORAGE_LIMIT) {
      return res.status(400).json({ message: "Storage limit exceeded" });
    }

    const file = await storage.createFile(fileData);
    res.json(file);
  });

  app.patch("/api/files/:id", async (req, res) => {
    const id = Number(req.params.id);
    const updates = insertFileSchema.partial().parse(req.body);
    const file = await storage.updateFile(id, updates);
    res.json(file);
  });

  app.delete("/api/files/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteFile(id);
    res.json({ success: true });
  });

  app.get("/api/files/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    
    const files = await storage.searchFiles(query);
    res.json(files);
  });

  app.get("/api/storage", async (req, res) => {
    const totalSize = await storage.getTotalSize();
    res.json({ 
      used: totalSize,
      total: STORAGE_LIMIT,
      available: STORAGE_LIMIT - totalSize
    });
  });

  return createServer(app);
}
