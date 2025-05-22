import React, { useEffect, useState } from "react";

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

const Home = () => {
  const [buildingPlan, setBuildingPlan] = useState<BuildingPlan>({});
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [roomSensorData, setRoomSensorData] = useState<RoomSensorMap>({});

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
        🏢 Building Plan
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
              <span>{floor}</span>
              <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </header>

            {isExpanded && (
              <ul style={{ padding: "1rem 2rem", margin: 0, listStyleType: "none" }}>
                {rooms.map((room) => (
                  <li key={room} style={{ marginBottom: "1rem" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>{room}</div>
                    <ul style={{ paddingLeft: "1rem", color: "#555" }}>
                      {(roomSensorData[room] || []).map((sensor) => (
                        <li key={`${sensor.device_id}-${sensor.sensor_type}`}>
                          {sensor.sensor_type}-{sensor.device_id}: {sensor.value}
                        </li>
                      ))}
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
