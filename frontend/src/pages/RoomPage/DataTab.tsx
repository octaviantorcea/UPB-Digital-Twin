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
import "chartjs-adapter-date-fns";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  TimeScale
);

type DataPoint = {
  timestamp: string;
  value: number;
};

const DataTab = ({ roomName }: { roomName: string }) => {
  const [tempData, setTempData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemperatureData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 6 * 60 * 60 * 1000);
      const from_date = oneDayAgo.toISOString();
      const to_date = now.toISOString();

      const params = new URLSearchParams({
        location: roomName,
        sensor_type: "temperature",
        from_date: from_date,
        to_date: to_date,
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
  }, [roomName]);

  const chartData = {
    labels: tempData.map((d) => new Date(d.timestamp)),
    datasets: [
      {
        label: "Temperature (°C)",
        data: tempData.map((d) => d.value),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.2,
        pointRadius: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: `Temperature - Last 24 Hours in ${roomName}` },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "hour",
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
    <main style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Sensor Data for Room: <span style={{ color: "#007bff" }}>{roomName}</span>
      </h2>

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
