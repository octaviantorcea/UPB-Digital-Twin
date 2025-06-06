import { useState } from "react";
import { useParams } from "react-router-dom";
import DataTab from "./DataTab";
import ScheduleTab from "./ScheduleTab";
import ReportTab from "./ReportTab";

const RoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [activeTab, setActiveTab] = useState<"data" | "schedule" | "report a problem">("data");

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <header
        style={{
          display: "flex",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        {["data", "schedule", "report a problem"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              flex: 1,
              background: activeTab === tab ? "#007bff" : "white",
              color: activeTab === tab ? "white" : "#555",
              border: "none",
              padding: "1rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.3s, color 0.3s",
            }}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </header>

      {activeTab === "data" && <DataTab roomName={roomName!} />}
      {activeTab === "schedule" && <ScheduleTab roomName={roomName!} />}
      {activeTab === "report a problem" && <ReportTab roomName={roomName!} />}
    </div>
  );
};

export default RoomPage;
