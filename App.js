import React from "react";
import CanvasBoard from "./CanvasBoard";
import logo from './logo.png';

function App() {
  return (
    
    <div style={{ padding: "1rem" }}>
      <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      </header>
      <CanvasBoard />
    </div>
  );
}

export default App;

