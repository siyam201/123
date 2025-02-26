import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertFileSchema, MAX_FILE_SIZE, STORAGE_LIMIT } from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express) {
  // Set up authentication
  setupAuth(app);

  function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  }

  app.get("/api/files", isAuthenticated, async (req, res) => {
    const parentId = req.query.parentId ? Number(req.query.parentId) : null;
    const files = await storage.getFiles(parentId);
    res.json(files);
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error getting file:", error);
      res.status(500).json({ message: "Failed to get file" });
    }
  });

  app.post("/api/files", async (req, res) => {
    const fileData = insertFileSchema.parse(req.body);

    if (!fileData.isFolder && fileData.size > MAX_FILE_SIZE) {
      return res.status(400).json({ message: "File too large" });
    }

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
    try {
      const searchParams = {
        name: req.query.q as string,
        type: req.query.type as string,
        minSize: req.query.minSize ? Number(req.query.minSize) : undefined,
        maxSize: req.query.maxSize ? Number(req.query.maxSize) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      // Validate size parameters
      if (searchParams.minSize && isNaN(searchParams.minSize)) {
        return res.status(400).json({ message: "Invalid minSize parameter" });
      }
      if (searchParams.maxSize && isNaN(searchParams.maxSize)) {
        return res.status(400).json({ message: "Invalid maxSize parameter" });
      }

      const files = await storage.searchFiles(searchParams);
      res.json(files);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Error performing search" });
    }
  });

  app.get("/api/storage", async (req, res) => {
    const totalSize = await storage.getTotalSize();
    res.json({ 
      used: totalSize,
      total: STORAGE_LIMIT,
      available: STORAGE_LIMIT - totalSize
    });
  });

  const server = createServer(app);
  return server;
}