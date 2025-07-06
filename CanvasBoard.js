import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { ChromePicker } from "react-color";

const socket = io('http://192.168.1.5:3001');

const BOARD_SIZE = 100;
const INITIAL_CELL_SIZE = 10;
const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
const MAX_BUFFER = 5;

const CanvasBoard = () => {

  const [canvas, setCanvas] = useState([]);
  const [selectedPixels, setSelectedPixels] = useState([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [cellSize, setCellSize] = useState(INITIAL_CELL_SIZE);
  const [showPickerIndex, setShowPickerIndex] = useState(null);
  const [palette, setPalette] = useState([
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#000000",
    "#FFA500",
  ]);
  // Lấy canvas từ server
  useEffect(() => {
    socket.emit('request_canvas');
    socket.on('canvas', setCanvas);
  }, []);

  // Lắng nghe phím WASD + Enter + Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (!selectedCoord) return;

      if (e.key === 'Enter') handleSubmit();
      if (e.ctrlKey && key === 'z') handleUndo();

      if(selectedPixels.length < MAX_BUFFER){
        let { x, y } = selectedCoord;
        let newX = x;
        let newY = y;

        if (key === 'w' && y > 0) newY--;
        if (key === 's' && y < BOARD_SIZE - 1) newY++;
        if (key === 'a' && x > 0) newX--;
        if (key === 'd' && x < BOARD_SIZE - 1) newX++;

        if (newX !== x || newY !== y) {
          const alreadySelected = selectedPixels.some((p) => p.x === newX && p.y === newY);
          if (!alreadySelected) {
            setSelectedPixels((prev) => [...prev, { x: newX, y: newY, color: selectedColor }]);
          }
          setSelectedCoord({ x: newX, y: newY });
        }
      } else if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        alert('❗ Bạn chỉ được chọn tối đa 5 ô trước khi Submit!');
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCoord]);

  // Khi di chuyển sang ô mới → tô màu nếu chưa chọn
  useEffect(() => {
    if (!selectedCoord) return;
    const { x, y } = selectedCoord;
    const alreadySelected = selectedPixels.some((p) => p.x === x && p.y === y);
    if (!alreadySelected) {
      setSelectedPixels((prev) => [...prev, { x, y, color: selectedColor }]);
    }
  }, [selectedCoord]);

  const handlePixelClick = (x, y) => {
    if(selectedPixels.length >= MAX_BUFFER){
      alert('❗ Bạn chỉ được chọn tối đa 5 ô trước khi Submit!');
      return;
    }

    const exists = selectedPixels.find((p) => p.x === x && p.y === y);
    if (exists) {
      setSelectedPixels((prev) => prev.filter((p) => !(p.x === x && p.y === y)));
    } else {
      setSelectedPixels((prev) => [...prev, { x, y, color: selectedColor }]);
    }
    setSelectedCoord({ x, y });
  };

  const handleSubmit = () => {
    if (selectedPixels.length > 0) {
      socket.emit('batch_draw', selectedPixels);
      setSelectedPixels([]);
      setSelectedCoord(null);
    }
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

  const handleUndo = () => {
    setSelectedPixels((prev) => prev.slice(0, -1));
  };

  const isSelected = (x, y) => selectedPixels.some((p) => p.x === x && p.y === y);

  const getColorAt = (x, y) => {
    const selected = selectedPixels.find((p) => p.x === x && p.y === y);
    return selected ? selected.color : canvas[y]?.[x] || '#FFFFFF';
  };

  const renderColumnHeaders = () => (
    <div style={{ display: 'flex', marginLeft: cellSize }}>
      {Array.from({ length: BOARD_SIZE }).map((_, x) => (
        <div
          key={x}
          style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            fontSize: Math.max(cellSize * 0.5, 8),
            writingMode: 'vertical-rl',
            textAlign: 'center',
            userSelect: 'none',
            boxSizing: 'border-box',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {x}
        </div>
      ))}
    </div>
  );

  const renderRow = (y) => (
    <div key={y} style={{ display: 'flex' }}>
      {/* Chỉ số hàng bên trái */}
      <div
        style={{
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          fontSize: Math.max(cellSize * 0.5, 8),
          textAlign: 'center',
          userSelect: 'none',
          boxSizing: 'border-box',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {y}
      </div>
      {/* Pixel canvas */}
      {Array.from({ length: BOARD_SIZE }).map((_, x) => {
        const color = getColorAt(x, y);
        const border = isSelected(x, y) ? '2px solid darkgreen' : '1px solid #ccc';

        return (
          <div
            key={`${x},${y}`}
            onClick={() => handlePixelClick(x, y)}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              backgroundColor: color,
              border,
              boxSizing: 'border-box',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div>
      <title>R/Place Clone</title>
      <h2>🧱 R/Place Clone</h2>

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

      {/* Nút điều khiển */}
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setCellSize((s) => Math.min(s + 2, 50))}>🔍+</button>
        <button onClick={() => setCellSize((s) => Math.max(s - 2, 4))}>🔍−</button>
        <button onClick={handleUndo}>↩️ Undo (Ctrl+Z)</button>
        <button onClick={handleSubmit} disabled={selectedPixels.length === 0}>✅ Submit ({selectedPixels.length}/{MAX_BUFFER}) (Enter)</button>
        <span style={{ marginLeft: 10 }}><b>Di chuyển bằng W A S D</b></span>
      </div>
      {/* Canvas */}
      <div style={{ overflow: 'auto', border: '1px solid #888', whiteSpace: 'nowrap' }}>
        {renderColumnHeaders()}
        {Array.from({ length: BOARD_SIZE }).map((_, y) => renderRow(y))}
      </div>
    </div>
  );
};

export default CanvasBoard;
