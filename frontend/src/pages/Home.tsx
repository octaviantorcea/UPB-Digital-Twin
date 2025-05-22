import React, { useEffect, useState } from "react";

type BuildingPlan = {
  [floor: string]: string[];
};

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
    <div
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
        color: "#222",
      }}
    >
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
              transition: "box-shadow 0.3s ease",
              cursor: "pointer",
            }}
            onClick={() => toggleFloor(floor)}
            aria-expanded={isExpanded}
            aria-controls={`rooms-${floor}`}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 1.5rem",
                fontWeight: 600,
                fontSize: "1.25rem",
                userSelect: "none",
                backgroundColor: isExpanded ? "#f0f4f8" : "#fafafa",
                transition: "background-color 0.3s ease",
              }}
            >
              <span>{floor}</span>
              <span
                style={{
                  fontSize: "1.25rem",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
                aria-hidden="true"
              >
                ▼
              </span>
            </header>

            <ul
              id={`rooms-${floor}`}
              style={{
                maxHeight: isExpanded ? 500 : 0,
                overflow: "hidden",
                transition: "max-height 0.4s ease",
                padding: isExpanded ? "1rem 2rem" : "0 2rem",
                margin: 0,
                backgroundColor: "#f9fafe",
                listStyleType: "none",
              }}
            >
              {rooms.map((room) => (
                <li
                  key={room}
                  style={{
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #ddd",
                    fontSize: "1rem",
                    color: "#555",
                  }}
                >
                  {room}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default Home;
