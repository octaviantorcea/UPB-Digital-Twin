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
          placeholder="Reservation"
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

  const fetchReservations = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !roomName) return;

    const now = dayjs();
    const start = now.startOf("week").format("YYYY-MM-DD");
    const end = now.endOf("week").format("YYYY-MM-DD");

    try {
      const res = await fetch(
        `/get_reservations?start_date=${start}&end_date=${end}&room_name=${roomName}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      const newEvents: EventInput[] = [];
      for (const [_, dayReservations] of Object.entries(data)) {
        for (const reservation of dayReservations as any[]) {
          newEvents.push({
            id: String(reservation.res_id),
            title: reservation.title || "Reserved",
            start: reservation.start_date,
            end: reservation.end_date,
          });
        }
      }
      setEvents(newEvents);
    } catch (err) {
      console.error("Failed to fetch reservations", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded?.scope === "1" || decoded?.scope === "2") {
        setCanDelete(true);
      }
    }

    fetchReservations();
  }, [roomName]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedInfo(selectInfo);
    setModalOpen(true);
  };

  const handleModalSubmit = async (title: string) => {
    const token = localStorage.getItem("access_token");
    if (!selectedInfo || !token || !roomName) return;

    try {
      await fetch("/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_name: roomName,
          start_date: selectedInfo.startStr,
          end_date: selectedInfo.endStr,
          title: title,
        }),
      });
      await fetchReservations();
    } catch (err) {
      console.error("Failed to make reservation", err);
    }

    setSelectedInfo(null);
    setModalOpen(false);
  };

  const handleEventClick = async (clickInfo: EventClickArg) => {
    if (!canDelete) return;

    const confirmDelete = confirm(
      `Are you sure you want to delete "${clickInfo.event.title}"?`
    );
    if (!confirmDelete) return;

    const token = localStorage.getItem("access_token");
    if (!token || !roomName) return;

    try {
      await fetch(
        `/delete_reservation?reservation_id=${clickInfo.event.id}&room_name=${roomName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchReservations();
    } catch (err) {
      console.error("Failed to delete reservation", err);
    }
  };

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
