import { useEffect, useRef, useState } from "react";
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

const toLocalDateTimeString = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const DataTab = ({ roomName }: { roomName: string }) => {
  const [tempData, setTempData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<any>(null);

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(toLocalDateTimeString(defaultFrom));
  const [toDate, setToDate] = useState(toLocalDateTimeString(now));

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

  const handlePresetRange = (hoursBack: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    setFromDate(toLocalDateTimeString(from));
    setToDate(toLocalDateTimeString(now));
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

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
        pan: { enabled: true, mode: "x" as const },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x" as const,
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "minute",
          tooltipFormat: "MMM d, h:mm a",
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
        Sensor Data for Room: <span style={{ color: "#007bff" }}>{roomName}</span>
      </h2>

      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
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
      </div>

      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "0.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => handlePresetRange(24)}>Last Day</button>
        <button onClick={() => handlePresetRange(24 * 7)}>Last Week</button>
        <button onClick={() => handlePresetRange(24 * 30)}>Last Month</button>
        <button onClick={resetZoom} style={{ fontWeight: "bold", color: "#d9534f" }}>
          Reset Zoom
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#666" }}>Loading temperature data...</p>
      ) : tempData.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999" }}>No temperature data available.</p>
      ) : (
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      )}
    </main>
  );
};

export default DataTab;
