// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoute from "./rout/authRout.js";
import userRoute from "./rout/userRout.js";
import dbConnection from "./db/dbConnect.js";

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = createServer(app);

console.log("[INFO] Initializing server...");

// Allowed origins for CORS
const allowedOrigins = ["https://videocall-project.vercel.app","http://localhost:5173"];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        console.log("[INFO] CORS allowed for:", origin);
        callback(null, true);
      } else {
        console.warn("[WARNING] CORS blocked for:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);

app.get("/ok", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Initialize Socket.io
const io = new Server(server, {
  pingTimeout: 60000, // 1 minute
  cors: {
    origin: allowedOrigins[0],
    methods: ["GET", "POST"],
  },
});

console.log("[SUCCESS] Socket.io initialized with CORS");

let onlineUsers = [];
const activeCalls = new Map(); // Track ongoing calls

io.on("connection", (socket) => {
  console.log(`[INFO] New connection: ${socket.id}`);

  socket.emit("me", socket.id);

  socket.on("join", (user) => {
    if (!user || !user.id) {
      console.warn("[WARNING] Invalid user data on join");
      return;
    }

    socket.join(user.id);
    const existingUser = onlineUsers.find((u) => u.userId === user.id);

    if (existingUser) {
      existingUser.socketId = socket.id;
    } else {
      onlineUsers.push({
        userId: user.id,
        name: user.name,
        socketId: socket.id,
      });
    }

    io.emit("online-users", onlineUsers);
  });

  socket.on("callToUser", (data) => {
    const callee = onlineUsers.find((user) => user.userId === data.callToUserId);

    if (!callee) {
      socket.emit("userUnavailable", { message: "User is offline." });
      return;
    }

    if (activeCalls.has(data.callToUserId)) {
      socket.emit("userBusy", { message: "User is currently in another call." });

      io.to(callee.socketId).emit("incomingCallWhileBusy", {
        from: data.from,
        name: data.name,
        email: data.email,
        profilepic: data.profilepic,
      });

      return;
    }

    io.to(callee.socketId).emit("callToUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
      email: data.email,
      profilepic: data.profilepic,
    });
  });

  socket.on("answeredCall", (data) => {
    io.to(data.to).emit("callAccepted", {
      signal: data.signal,
      from: data.from,
    });

    activeCalls.set(data.from, { with: data.to, socketId: socket.id });
    activeCalls.set(data.to, { with: data.from, socketId: data.to });
  });

  socket.on("reject-call", (data) => {
    io.to(data.to).emit("callRejected", {
      name: data.name,
    });
  });

  socket.on("call-ended", (data) => {
    io.to(data.to).emit("callEnded", {
      name: data.name,
    });

    activeCalls.delete(data.from);
    activeCalls.delete(data.to);
  });

  socket.on("disconnect", () => {
    const user = onlineUsers.find((u) => u.socketId === socket.id);
    if (user) {
      activeCalls.delete(user.userId);
      for (const [key, value] of activeCalls.entries()) {
        if (value.with === user.userId) activeCalls.delete(key);
      }
    }

    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    io.emit("online-users", onlineUsers);
    socket.broadcast.emit("discounnectUser", { disUser: socket.id });
    console.log(`[INFO] Disconnected: ${socket.id}`);
  });
});

// Start the server after DB connection
(async () => {
  try {
    await dbConnection();
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1);
  }
})();