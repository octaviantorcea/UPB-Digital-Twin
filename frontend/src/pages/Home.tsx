import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type BuildingPlan = {
  [floor: string]: string[];
};

type SensorData = {
  id: string;
  device_id: string;
  sensor_type: string;
  value: number;
  timestamp: string;
  location: string;
};

type RoomSensorMap = {
  [roomName: string]: SensorData[];
};

const formatFloorLabel = (floor: string): string => {
  const num = parseInt(floor, 10);
  if (isNaN(num)) return floor;

  if (num === 0) return "Ground Floor";
  if (num === 1) return "1st Floor";
  if (num === 2) return "2nd Floor";
  if (num === 3) return "3rd Floor";
  return `${num}th Floor`;
};


const Home = () => {
  const [buildingPlan, setBuildingPlan] = useState<BuildingPlan>({});
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [roomSensorData, setRoomSensorData] = useState<RoomSensorMap>({});

  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(buildingPlan).forEach((floor) => {
        buildingPlan[floor].forEach((room) => {
          fetchSensorDataForRoom(room);
        });
      });
    }, 300000); // Poll every 5 minutes

    return () => clearInterval(interval);
  }, [buildingPlan]);

  useEffect(() => {
    const fetchBuildingPlan = async () => {
      try {
        const res = await fetch("/get_building_plan");
        const data = await res.json();
        setBuildingPlan(data);
      } catch (error) {
        console.error("Failed to fetch building plan:", error);
      }
    };

    fetchBuildingPlan();
  }, []);

  const fetchSensorDataForRoom = async (room: string) => {
    try {
      const res = await fetch(`/real_time_data?location=${encodeURIComponent(room)}`);
      const data = await res.json();

      const roomSensors: SensorData[] = Object.values(data);
      setRoomSensorData((prev) => ({ ...prev, [room]: roomSensors }));
    } catch (error) {
      console.error(`Failed to fetch real-time data for ${room}:`, error);
    }
  };

  const toggleFloor = async (floor: string) => {
    setExpandedFloors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(floor)) {
        newSet.delete(floor);
      } else {
        newSet.add(floor);
        // Fetch sensor data for all rooms on this floor if not already loaded
        buildingPlan[floor].forEach((room) => {
          if (!roomSensorData[room]) {
            fetchSensorDataForRoom(room);
          }
        });
      }
      return newSet;
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", fontWeight: "700", fontSize: "2rem", marginBottom: "2rem" }}>
        Precis
      </h2>

      {Object.entries(buildingPlan).map(([floor, rooms]) => {
        const isExpanded = expandedFloors.has(floor);
        return (
          <section
            key={floor}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              marginBottom: "1.5rem",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <header
              onClick={() => toggleFloor(floor)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                fontWeight: 600,
                fontSize: "1.25rem",
                backgroundColor: isExpanded ? "#f0f4f8" : "#fafafa",
              }}
            >
              <span>{formatFloorLabel(floor)}</span>
              <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </header>

            {isExpanded && (
              <ul style={{ padding: "1rem 2rem", margin: 0, listStyleType: "none" }}>
                {rooms.map((room) => (
                  <li
                    key={room}
                    onClick={() => navigate(`/rooms/${encodeURIComponent(room)}`)}
                    style={{
                      marginBottom: "1rem",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      padding: "1rem",
                      backgroundColor: "#fafafa",
                      cursor: "pointer",
                      transition: "background-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLLIElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.1)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLLIElement).style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "0.5rem", fontSize: "1.1rem" }}>
                      {room}
                    </div>
                    <ul style={{ paddingLeft: "1rem", color: "#555", margin: 0 }}>
                      {(roomSensorData[room] || [])
                      .filter((sensor) => sensor.sensor_type.toLowerCase() !== "motion")
                      .map((sensor) => {
                        let icon = "";
                        let color = "";

                        switch (sensor.sensor_type.toLowerCase()) {
                          case "temperature":
                            icon = "🌡️";
                            color = "#d9534f"; // red
                            break;
                          case "humidity":
                            icon = "💧";
                            color = "#0275d8"; // blue
                            break;
                          case "pressure":
                            icon = "💨";
                            color = "#5cb85c"; // green
                            break;
                          case "light":
                              icon = "💡";
                              color = "#f39c12"; // orange
                              break;
                          case "sound":
                              icon = "🔊";
                              color = "#555651"; // metalic grey
                              break;
                          default:
                            icon = "🔎";
                            color = "#999";
                        }

                        return (
                          <li
                            key={`${sensor.device_id}-${sensor.sensor_type}`}
                            style={{
                              fontSize: "0.95rem",
                              marginBottom: "0.35rem",
                              color,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                            <span>
                              <strong>{sensor.sensor_type}</strong> – <em>{sensor.device_id}</em>: {sensor.value}
                            </span>
                          </li>
                        );
                      })}
                      {!roomSensorData[room] && (
                        <li style={{ fontStyle: "italic", color: "#999" }}>Loading...</li>
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default Home;
