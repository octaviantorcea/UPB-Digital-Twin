import { useState } from "react";
import { useParams } from "react-router-dom";

const RoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [activeTab, setActiveTab] = useState<"data" | "reservations">("data");

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      {/* Header with Tabs */}
      <header
        style={{
          display: "flex",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        <button
          onClick={() => setActiveTab("data")}
          style={{
            flex: 1,
            background: activeTab === "data" ? "#007bff" : "white",
            color: activeTab === "data" ? "white" : "#555",
            border: "none",
            padding: "1rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.3s, color 0.3s",
          }}
        >
          Data
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          style={{
            flex: 1,
            background: activeTab === "reservations" ? "#007bff" : "white",
            color: activeTab === "reservations" ? "white" : "#555",
            border: "none",
            padding: "1rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.3s, color 0.3s",
          }}
        >
          Reservations
        </button>
      </header>

      {/* Content */}
      <main style={{ textAlign: "center", fontSize: "1.2rem", color: "#333" }}>
        <p>
          <strong>Room:</strong> {roomName}
        </p>
        <p>
          <strong>Active Tab:</strong> {activeTab}
        </p>
      </main>
    </div>
  );
};

export default RoomPage;
