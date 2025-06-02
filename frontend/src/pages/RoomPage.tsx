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
          justifyContent: "center",
          gap: "2rem",
          marginBottom: "2rem",
          borderBottom: "2px solid #ddd",
        }}
      >
        <button
          onClick={() => setActiveTab("data")}
          style={{
            background: "none",
            border: "none",
            padding: "1rem",
            fontWeight: 600,
            fontSize: "1rem",
            borderBottom: activeTab === "data" ? "2px solid #007bff" : "none",
            color: activeTab === "data" ? "#007bff" : "#555",
            cursor: "pointer",
          }}
        >
          Data
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          style={{
            background: "none",
            border: "none",
            padding: "1rem",
            fontWeight: 600,
            fontSize: "1rem",
            borderBottom: activeTab === "reservations" ? "2px solid #007bff" : "none",
            color: activeTab === "reservations" ? "#007bff" : "#555",
            cursor: "pointer",
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
