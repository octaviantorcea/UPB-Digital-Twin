import React, { useEffect, useState} from "react";

type BuildingPlan = {
  [floor: string]: string[]
}

const Home = () => {
  const [buildingPlan, setBuildingPlan] = useState<BuildingPlan>({});
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

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

  const toggleFloor = (floor: string) => {
    setExpandedFloors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(floor)) {
        newSet.delete(floor);
      } else {
        newSet.add(floor);
      }
      return newSet;
    });
  };

return (
    <div style={{ padding: "2rem" }}>
      <h2>Building Plan</h2>
      {Object.entries(buildingPlan).map(([floor, rooms]) => (
        <div
          key={floor}
          style={{
            marginBottom: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "1rem",
            backgroundColor: "#f9f9f9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
            onClick={() => toggleFloor(floor)}
          >
            <span>{floor}</span>
            <span>{expandedFloors.has(floor) ? "▲" : "▼"}</span>
          </div>
          {expandedFloors.has(floor) && (
            <ul style={{ marginTop: "1rem", paddingLeft: "1.5rem" }}>
              {rooms.map((room) => (
                <li key={room} style={{ marginBottom: "0.5rem" }}>
                  {room}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default Home;
