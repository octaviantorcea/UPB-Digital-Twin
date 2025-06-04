import { useState } from "react";
import { useParams } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";
import { DateSelectArg } from "@fullcalendar/core/index.js";
import { EventInput } from "@fullcalendar/core/index.js";

const RoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const [activeTab, setActiveTab] = useState<"data" | "reservations">("data");

  const [events, setEvents] = useState<EventInput[]>([
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

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt("Enter reservation title:");
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // clear selection

    if (title) {
      const newEvent: EventInput = {
        id: String(events.length + 1),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
      };
      setEvents((prev) => [...prev, newEvent]);
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

      {/* Content */}
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
        </div>
      )}
    </div>
  );
};

export default RoomPage;
