import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-date-fns";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

type DataPoint = {
  timestamp: string;
  value: number;
};

const DataTab = ({ roomName }: { roomName: string }) => {
  const [tempData, setTempData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 16);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 16));

  const fetchTemperatureData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        location: roomName,
        sensor_type: "temperature",
        from_date: new Date(fromDate).toISOString(),
        to_date: new Date(toDate).toISOString(),
      });

      const res = await fetch(`/historical_data?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch temperature data");
      const json = await res.json();

      const formatted = json.map((entry: any) => ({
        timestamp: entry.timestamp,
        value: entry.value,
      }));

      setTempData(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemperatureData();
  }, [roomName, fromDate, toDate]);

  const chartData = {
    labels: tempData.map((d) => new Date(d.timestamp)),
    datasets: [
      {
        label: "Temperature (°C)",
        data: tempData.map((d) => d.value),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.2,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: `Temperature in ${roomName}` },
      zoom: {
        pan: {
          enabled: true,
          mode: "x" as const,
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x" as const,
        },
        limits: {
          x: { min: "original", max: "original" },
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "hour",
          tooltipFormat: "MMM d, h:mm a",
          displayFormats: {
            hour: "MMM d, HH:mm",
          },
        },
        ticks: {
          autoSkip: false,
          maxTicksLimit: 10,
          callback: (val: any) =>
            new Date(val).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        },
        title: { display: true, text: "Time" },
      },
      y: {
        title: { display: true, text: "Temperature (°C)" },
      },
    },
  };

  return (
    <main style={{ padding: "2rem", maxWidth: "950px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Sensor Data for: <span style={{ color: "#007bff" }}>{roomName}</span>
      </h2>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <div>
          <label>From: </label>
          <input
            type="datetime-local"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label>To: </label>
          <input
            type="datetime-local"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button
          onClick={() => fetchTemperatureData()}
          style={{ padding: "0.5rem 1rem", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "4px" }}
        >
          Reload
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#666" }}>Loading temperature data...</p>
      ) : tempData.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999" }}>No temperature data available.</p>
      ) : (
        <Line data={chartData} options={chartOptions} />
      )}
    </main>
  );
};

export default DataTab;
