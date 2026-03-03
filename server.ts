import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

const db = new Database("race.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal TEXT NOT NULL,
    target INTEGER NOT NULL,
    current_starts INTEGER DEFAULT 0,
    weekly_adds INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS race_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_starts INTEGER DEFAULT 0,
    sheet_url TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS race_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    weekly_adds INTEGER DEFAULT 0,
    total_starts INTEGER DEFAULT 0
  )
`);

// Seed initial data if empty
const goalCount = db.prepare("SELECT COUNT(*) as count FROM goals").get() as { count: number };
if (goalCount.count === 0) {
  const insert = db.prepare("INSERT INTO goals (goal, target) VALUES (?, ?)");
  insert.run("Bromley", 60);
  insert.run("Orient", 75);
  insert.run("Millwall", 90);
  insert.run("Arsenal", 100);
  insert.run("Milan", 125);
}

const statsCount = db.prepare("SELECT COUNT(*) as count FROM race_stats").get() as { count: number };
if (statsCount.count === 0) {
  // 16 (Jan) + 8 (Feb) = 24
  db.prepare("INSERT INTO race_stats (id, total_starts) VALUES (1, 24)").run();
}

const historyCount = db.prepare("SELECT COUNT(*) as count FROM race_history").get() as { count: number };
if (historyCount.count === 0) {
  const insertHistory = db.prepare("INSERT INTO race_history (date, weekly_adds, total_starts) VALUES (?, ?, ?)");
  // January 2026 (assuming end of month for simplicity)
  insertHistory.run("2026-01-31", 16, 16);
  // February 2026
  insertHistory.run("2026-02-28", 8, 24);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH"]
    }
  });

  app.use(express.json());

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // API Routes
  app.get("/api/goals", (req, res) => {
    const goals = db.prepare("SELECT * FROM goals ORDER BY target ASC").all();
    let stats = db.prepare("SELECT * FROM race_stats WHERE id = 1").get();
    if (!stats) {
      db.prepare("INSERT INTO race_stats (id, total_starts) VALUES (1, 0)").run();
      stats = { total_starts: 0 };
    }
    const history = db.prepare("SELECT * FROM race_history ORDER BY date ASC").all();
    res.json({ goals, stats, history });
  });

  app.patch("/api/stats", (req, res) => {
    const { total_starts, sheet_url } = req.body;
    if (total_starts !== undefined) {
      db.prepare("UPDATE race_stats SET total_starts = ? WHERE id = 1").run(total_starts);
    }
    if (sheet_url !== undefined) {
      db.prepare("UPDATE race_stats SET sheet_url = ? WHERE id = 1").run(sheet_url);
    }
    let stats = db.prepare("SELECT * FROM race_stats WHERE id = 1").get();
    
    // Broadcast update to all connected clients
    io.emit("stats_updated", stats);
    
    res.json(stats);
  });

  app.post("/api/history", (req, res) => {
    const { date, weekly_adds, total_starts } = req.body;
    db.prepare("INSERT INTO race_history (date, weekly_adds, total_starts) VALUES (?, ?, ?)")
      .run(date, weekly_adds, total_starts);
      
    const history = db.prepare("SELECT * FROM race_history ORDER BY date ASC").all();
    io.emit("history_updated", history);
    
    res.json({ success: true });
  });

  app.patch("/api/goals/:id", (req, res) => {
    const { id } = req.params;
    const { current_starts, weekly_adds } = req.body;
    
    if (current_starts !== undefined) {
      db.prepare("UPDATE goals SET current_starts = ? WHERE id = ?").run(current_starts, id);
    }
    if (weekly_adds !== undefined) {
      db.prepare("UPDATE goals SET weekly_adds = ? WHERE id = ?").run(weekly_adds, id);
    }
    
    const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
    const goals = db.prepare("SELECT * FROM goals ORDER BY target ASC").all();
    
    io.emit("goals_updated", goals);
    
    res.json(updated);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
