// server/index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const path = require("path");

const { createCanvas } = require("canvas");
const snapshotDir = path.join(__dirname, "snapshots");
if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir);

app.use(cors({
  origin: "http://192.168.1.5:3000",
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://192.168.1.5:3000",
    methods: ["GET", "POST"],
  },
});

function saveSnapshot(canvasData) {
  const size = canvasData.length;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = canvasData[y][x];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const timestamp = Date.now();
  const out = fs.createWriteStream(path.join(snapshotDir, `${timestamp}.png`));
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => console.log(`📸 Snapshot saved: ${timestamp}.png`));
}

const BOARD_SIZE = 100;
let canvas = Array(BOARD_SIZE)
  .fill()
  .map(() => Array(BOARD_SIZE).fill("#FFFFFF"));

// Đọc canvas từ file nếu có
try {
  const data = fs.readFileSync("canvas.json", "utf-8");
  canvas = JSON.parse(data);
  console.log("✅ Đã tải canvas từ file.");
} catch (e) {
  console.log("ℹ️ Không tìm thấy file canvas.json, dùng canvas trắng.");
}

io.on("connection", (socket) => {
  console.log("🟢 Client connected");

  socket.on("request_canvas", () => {
    socket.emit("canvas", canvas);
  });

  socket.on("batch_draw", (pixelList) => {
    pixelList.forEach(({ x, y, color }) => {
      if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
        canvas[y][x] = color;
      }
    });

    // Gửi toàn bộ canvas về cho tất cả client
    io.emit("canvas", canvas);
    saveSnapshot(canvas);
    // Lưu vào file
    fs.writeFile("canvas.json", JSON.stringify(canvas), (err) => {
      if (err) console.error("❌ Không thể lưu canvas:", err);
      else console.log("💾 Đã lưu canvas.");
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

