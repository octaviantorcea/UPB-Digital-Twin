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
  TimeScale
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

const SENSOR_LABELS: Record<string, string> = {
  temperature: "Temperature (°C)",
  humidity: "Humidity (%)",
  light: "Light (lux)",
  sound: "Sound (dB)",
  pressure: "Air Pressure (hPa)",
};

const SENSOR_COLORS: Record<string, string> = {
  temperature: "#d9534f",
  humidity: "#0275d8",
  pressure: "#5cb85c",
  light: "#f39c12",
  sound: "#555651",
};

const toLocalDateTimeString = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const DataTab = ({ roomName }: { roomName: string }) => {
  const [sensorTypes, setSensorTypes] = useState<string[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<string>("temperature");
  const [sensorData, setSensorData] = useState<DataPoint[]>([]);
  const [predictionData, setPredictionData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<any>(null);

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(toLocalDateTimeString(defaultFrom));
  const [toDate, setToDate] = useState(toLocalDateTimeString(now));

  const determineTimeUnit = (start: number, end: number) => {
    const rangeMs = end - start;
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    if (rangeMs < oneMinute) return "second";
    if (rangeMs < oneHour) return "minute";
    if (rangeMs < oneDay) return "hour";
    if (rangeMs < oneWeek) return "day";
    return "day";
  };

  const fetchAvailableSensorTypes = async () => {
    try {
      const res = await fetch(`/available_sensors?location=${roomName}`);
      const types = await res.json();
      setSensorTypes(types);
      if (!types.includes(selectedSensor)) {
        setSelectedSensor(types[0]);
      }
    } catch (err) {
      console.error("Error fetching sensor types:", err);
    }
  };

  const fetchSensorData = async () => {
    if (!selectedSensor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        location: roomName,
        sensor_type: selectedSensor,
        from_date: new Date(fromDate).toISOString(),
        to_date: new Date(toDate).toISOString(),
      });

      const res = await fetch(`/historical_data?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch sensor data");
      const json = await res.json();

      const formatted = json.map((entry: any) => ({
        timestamp: entry.timestamp,
        value: entry.value,
      }));

      setSensorData(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictionData = async () => {
    if (!["temperature", "humidity", "pressure"].includes(selectedSensor)) {
      setPredictionData([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        location: roomName,
        sensor_type: selectedSensor,
      });
      const res = await fetch(`/last_prediction?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch prediction data");

      const json = await res.json();
      const formatted = json.map((entry: any) => ({
        timestamp: entry.timestamp,
        value: entry.value,
      }));

      setPredictionData(formatted);
    } catch (err) {
      console.error("Prediction fetch error:", err);
      setPredictionData([]);
    }
  };

  useEffect(() => {
    fetchAvailableSensorTypes();
  }, [roomName]);

  useEffect(() => {
    fetchSensorData();
    fetchPredictionData();
  }, [selectedSensor, fromDate, toDate]);

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

  const color = SENSOR_COLORS[selectedSensor] || "rgba(75,192,192,1)";
  const chartData = {
    labels: sensorData.map((d) => new Date(d.timestamp)),
    datasets: [
      {
        label: SENSOR_LABELS[selectedSensor] || selectedSensor,
        data: sensorData.map((d) => d.value),
        borderColor: color,
        backgroundColor: `${color}33`,
        tension: 0.1,
        pointRadius: 1.75,
      },
      ...(predictionData.length > 0
        ? [
            {
              label: `${SENSOR_LABELS[selectedSensor] || selectedSensor} (Prediction)`,
              data: predictionData.map((d) => ({
                x: new Date(d.timestamp),
                y: d.value,
              })),
              borderColor: color,
              borderDash: [6, 6], // Dashed line
              backgroundColor: "transparent",
              pointRadius: 2,
              tension: 0.2,
            },
          ]
        : []),
    ],
  };

  const values = [...sensorData, ...predictionData].map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1;

  const paddedMin = minValue - padding;
  const paddedMax = maxValue + padding;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: `${SENSOR_LABELS[selectedSensor] || selectedSensor} in ${roomName}` },
      zoom: {
        pan: {
          enabled: true,
          mode: "x" as const,
          onPanComplete: ({ chart }: any) => {
            const xAxis = chart.scales.x;
            const unit = determineTimeUnit(xAxis.min, xAxis.max);
            
            if (chart.options.scales.x.time.unit !== unit) {
              chart.options.scales.x.time.unit = unit;
              chart.update("none");
            }
          },
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x" as const,
          onZoomComplete: ({ chart }: any) => {
            const xAxis = chart.scales.x;
            const unit = determineTimeUnit(xAxis.min, xAxis.max);
            
            if (chart.options.scales.x.time.unit !== unit) {
              chart.options.scales.x.time.unit = unit;
              chart.update("none");
            }
          },
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: "minute",
          tooltipFormat: "MMM d, h:mm:ss a",
        },
        title: { display: true, text: "Time" }
      },
      y: {
        title: { display: true, text: SENSOR_LABELS[selectedSensor] || selectedSensor },
        min: paddedMin,
        max: paddedMax
      },
    },
  };

  return (
    <main style={{ padding: "2rem", width: "100%" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Sensor Data for Room: <span style={{ color: "#007bff" }}>{roomName}</span>
      </h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {sensorTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedSensor(type)}
            style={{
              backgroundColor: selectedSensor === type ? "#007bff" : "#ccc",
              color: selectedSensor === type ? "#fff" : "#000",
              fontWeight: selectedSensor === type ? "bold" : "normal",
            }}
          >
            {SENSOR_LABELS[type] || type}
          </button>
        ))}
      </div>

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
        <p style={{ textAlign: "center", color: "#666" }}>Loading sensor data...</p>
      ) : sensorData.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999" }}>No data available for selected sensor.</p>
      ) : (
        <div className="chart-container">
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        </div>
      )}
    </main>
  );
};

export default DataTab;
