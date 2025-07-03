// src/CanvasBoard.js
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ChromePicker } from "react-color";

const BOARD_SIZE = 100;
const PIXEL_SIZE = 20;
const MAX_BUFFER = 5;

const socket = io("http://localhost:3001");


export default function CanvasBoard() {
  const canvasRef = useRef(null);
  const [pixels, setPixels] = useState(() =>
    Array(BOARD_SIZE)
      .fill()
      .map(() => Array(BOARD_SIZE).fill("#FFFFFF"))
  );
  const [palette, setPalette] = useState([
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#000000",
    "#FFA500",
  ]);
  const [selectedColor, setSelectedColor] = useState(palette[0]);
  const [drawBuffer, setDrawBuffer] = useState([]);
  const [pixelBackup, setPixelBackup] = useState([]);
  const [showPickerIndex, setShowPickerIndex] = useState(null);

  // Lắng nghe canvas mới từ server
  useEffect(() => {
    socket.on("canvas", (data) => {
      setPixels(data);
      setDrawBuffer([]); // Reset sau mỗi lần cập nhật
    });

    // Yêu cầu server gửi canvas hiện tại
    socket.emit("request_canvas");

    return () => {
      socket.off("canvas");
    };
  }, []);

  // Vẽ lại canvas mỗi khi pixels thay đổi
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        ctx.fillStyle = pixels[y][x];
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        ctx.strokeStyle = "#e0e0e0";
        ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }
  }, [pixels]);

  const handleClickCanvas = (e) => {
    if (drawBuffer.length >= MAX_BUFFER) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);

    const alreadyDrawn = drawBuffer.some((p) => p.x === x && p.y === y);
    if (alreadyDrawn) return;

    // Lưu màu cũ để undo
    const oldColor = pixels[y][x];
    setPixelBackup((prev) => [...prev, { x, y, color: oldColor }]);

    // Vẽ màu mới tạm thời
    setPixels((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[y][x] = selectedColor;
      return copy;
    });

    setDrawBuffer((prev) => [...prev, { x, y, color: selectedColor }]);
  };

  const handleUndo = () => {
    if (drawBuffer.length === 0) return;

    const lastPixel = drawBuffer[drawBuffer.length - 1];
    const lastBackup = pixelBackup[pixelBackup.length - 1];

    // Khôi phục màu cũ
    setPixels((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[lastPixel.y][lastPixel.x] = lastBackup.color;
      return copy;
    });

    // Xoá pixel cuối cùng khỏi drawBuffer và pixelBackup
    setDrawBuffer((prev) => prev.slice(0, -1));
    setPixelBackup((prev) => prev.slice(0, -1));
  };


  const handleSubmit = () => {
    if (drawBuffer.length === 0) return;
    socket.emit("batch_draw", drawBuffer);
  };

  const handleColorBoxClick = (color) => {
    setSelectedColor(color);
    setShowPickerIndex(null);
  };

  const handleColorChange = (index, newColor) => {
    setPalette((prev) => {
      const updated = [...prev];
      updated[index] = newColor.hex;
      return updated;
    });
    setSelectedColor(newColor.hex);
  };

    const handleExportExactImage = () => {
    const pixelSize = 1; // mỗi pixel là 1x1 trong ảnh
    const width = BOARD_SIZE * pixelSize;
    const height = BOARD_SIZE * pixelSize;

    // Tạo canvas tạm
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext("2d");

    // Vẽ từng pixel
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        ctx.fillStyle = pixels[y][x];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Xuất ảnh PNG
    const image = exportCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = "canvas_100x100.png";
    link.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Palette + nút */}
      <div style={{ padding: 10, borderBottom: "1px solid #ccc" }}>
        <h2>R/Place Clone</h2>

        <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
          {palette.map((color, index) => (
            <div key={index} style={{ position: "relative" }}>
              <div
                onClick={() => handleColorBoxClick(color)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowPickerIndex(index);
                }}
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: color,
                  border:
                    selectedColor === color
                      ? "3px solid black"
                      : "1px solid #ccc",
                  cursor: "pointer",
                }}
              />
              {showPickerIndex === index && (
                <div style={{ position: "absolute", zIndex: 2 }}>
                  <ChromePicker
                    color={color}
                    onChangeComplete={(newColor) =>
                      handleColorChange(index, newColor)
                    }
                  />
                  <button
                    onClick={() => setShowPickerIndex(null)}
                    style={{
                      width: "100%",
                      marginTop: 4,
                      padding: "4px 6px",
                      fontSize: "0.8rem",
                    }}
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button onClick={handleSubmit} disabled={drawBuffer.length === 0}>
            Submit ({drawBuffer.length}/{MAX_BUFFER})
          </button>
          <button onClick={handleUndo} disabled={drawBuffer.length === 0}>
            Undo
          </button>
          <button onClick={handleExportExactImage} >
            Export Image
          </button>
        </div>
      </div>

      {/* Vùng cuộn canvas */}
      <div
        style={{
          flex: 1,
          overflowX: "auto",    // ✅ bật cuộn ngang
          overflowY: "auto",    // ✅ bật cuộn dọc
          backgroundColor: "#f9f9f9",
          padding: "10px",
        }}
      >
        <div style={{ width: BOARD_SIZE * PIXEL_SIZE, height: BOARD_SIZE * PIXEL_SIZE }}>
          <canvas
            ref={canvasRef}
            width={BOARD_SIZE * PIXEL_SIZE}
            height={BOARD_SIZE * PIXEL_SIZE}
            onClick={handleClickCanvas}
            style={{
              border: "1px solid black",
              imageRendering: "pixelated",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );

}
