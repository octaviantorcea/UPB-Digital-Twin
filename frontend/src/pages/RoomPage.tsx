import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import DateSelectArg from "@fullcalendar/react";
import EventClickArg from "@fullcalendar/react";
import EventInput from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";

// --- Decode JWT utility ---
function decodeJWT(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    console.error("Invalid token", e);
    return null;
  }
}

// --- Modal component (same as previous version) ---
const Modal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) => {
  const [input, setInput] = useState("");

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          minWidth: "300px",
        }}
      >
        <h3 style={{ marginBottom: "1rem" }}>Enter Reservation Title</h3>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            marginBottom: "1rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
          placeholder="Meeting with team"
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button onClick={onClose} style={{ padding: "0.5rem 1rem" }}>
            Cancel
          </button>
          <button
            onClick={() => {
              onSubmit(input);
              setInput("");
            }}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

const RoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [activeTab, setActiveTab] = useState<"data" | "reservations">("data");
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<DateSelectArg | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    // Load token and decode
    const token = localStorage.getItem("access_token");
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded?.scope === "1" || decoded?.scope === "2") {
        setCanDelete(true);
      }
    }

    // Sample events
    setEvents([
      {
        id: "1",
        title: "Team Sync",
        start: dayjs().hour(10).minute(0).toISOString(),
        end: dayjs().hour(11).minute(0).toISOString(),
      },
      {
        id: "2",
        title: "Design Review",
        start: dayjs().add(1, "day").hour(14).minute(0).toISOString(),
        end: dayjs().add(1, "day").hour(15).minute(0).toISOString(),
      },
    ]);
  }, []);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedInfo(selectInfo);
    setModalOpen(true);
  };

  const handleModalSubmit = (title: string) => {
    if (selectedInfo && title) {
      const newEvent: EventInput = {
        id: String(events.length + 1),
        title,
        start: selectedInfo.startStr,
        end: selectedInfo.endStr,
      };
      setEvents((prev) => [...prev, newEvent]);
    }
    setSelectedInfo(null);
    setModalOpen(false);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (!canDelete) return;

    const confirmDelete = confirm(
      `Are you sure you want to delete "${clickInfo.event.title}"?`
    );
    if (confirmDelete) {
      setEvents((prev) => prev.filter((e) => e.id !== clickInfo.event.id));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", fontFamily: "sans-serif" }}>
      {/* Tabs */}
      <header
        style={{
          display: "flex",
          border: "1px solid #ddd",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        {["data", "reservations"].map((tab) => (
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

      {activeTab === "data" && (
        <main style={{ textAlign: "center", fontSize: "1.2rem", color: "#333" }}>
          <p>
            <strong>Room:</strong> {roomName}
          </p>
          <p>
            <strong>Active Tab:</strong> Data
          </p>
        </main>
      )}

      {activeTab === "reservations" && (
        <div>
          <h2 style={{ marginBottom: "1rem" }}>Weekly Schedule for {roomName}</h2>
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            events={events}
            editable={false}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            allDaySlot={false}
            height="auto"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,timeGridDay",
            }}
          />
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setSelectedInfo(null);
              setModalOpen(false);
            }}
            onSubmit={handleModalSubmit}
          />
        </div>
      )}
    </div>
  );
};

export default RoomPage;
