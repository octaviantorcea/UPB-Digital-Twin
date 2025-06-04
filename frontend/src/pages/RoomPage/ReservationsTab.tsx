import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import DatesSetArg from "@fullcalendar/react";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";
import { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";

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

const ReservationsTab = ({ roomName }: { roomName: string }) => {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<DateSelectArg | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [currentRange, setCurrentRange] = useState<{ start: string; end: string } | null>(null);

  const fetchReservations = async (start: string, end: string) => {
    const token = localStorage.getItem("access_token");
    if (!token || !roomName) return;

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
      for (const [, dayReservations] of Object.entries(data)) {
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

      if (currentRange) {
        await fetchReservations(currentRange.start, currentRange.end);
      }
    } catch (err) {
      console.error("Failed to make reservation", err);
    }

    setSelectedInfo(null);
    setModalOpen(false);
  };

  const handleEventClick = async (clickInfo: EventClickArg) => {
    if (!canDelete) return;

    const confirmDelete = confirm(`Are you sure you want to delete "${clickInfo.event.title}"?`);
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

      if (currentRange) {
        await fetchReservations(currentRange.start, currentRange.end);
      }
    } catch (err) {
      console.error("Failed to delete reservation", err);
    }
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    const start = dayjs(arg.start).format("YYYY-MM-DD");
    const end = dayjs(arg.end).format("YYYY-MM-DD");
    setCurrentRange({ start, end });
    fetchReservations(start, end);
  };

  return (
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
        datesSet={handleDatesSet}
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
  );
};

export default ReservationsTab;
