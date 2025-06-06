import { useEffect, useState } from "react";

type Issue = {
  id: number;
  location: string;
  title: string;
  description: string;
  status: "REPORTED" | "IN_PROGRESS" | "SOLVED";
  reporter: string;
  created_at: string;
  comments: any[]; // Mocked for now
  score: number; // Ignored for now
};

const statusLabels: Record<string, string> = {
  REPORTED: "Reported",
  IN_PROGRESS: "In Progress",
  SOLVED: "Solved",
};

const ReportTab = ({ roomName }: { roomName: string }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    REPORTED: true,
    IN_PROGRESS: false,
    SOLVED: false,
  });

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await fetch(`/get_issues?location=${roomName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          }
        });
        const data = await response.json();
        setIssues(data);
      } catch (error) {
        console.error("Error fetching issues:", error);
      }
    };

    fetchIssues();
  }, [roomName]);

  const toggleSection = (status: string) => {
    setExpandedStatus((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const formatDate = (isoString: string) => new Date(isoString).toLocaleString();

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        Issues for {roomName}
      </h2>

      {["Reported", "In Progress", "Solved"].map((status) => {
        const filtered = issues.filter((issue) => issue.status === status);
        return (
          <div
            key={status}
            style={{
              marginBottom: "1.5rem",
              border: "1px solid #ccc",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => toggleSection(status)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "1rem",
                backgroundColor: "#f7f7f7",
                border: "none",
                fontWeight: "bold",
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              {statusLabels[status]} ({filtered.length}) ▾
            </button>

            {expandedStatus[status] && (
              <div style={{ padding: "1rem", backgroundColor: "#fff" }}>
                {filtered.length === 0 ? (
                  <p style={{ color: "#777" }}>No issues in this category.</p>
                ) : (
                  filtered.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        marginBottom: "1rem",
                        padding: "1rem",
                        border: "1px solid #eee",
                        borderRadius: "6px",
                        background: "#fafafa",
                      }}
                    >
                      <h4 style={{ margin: 0, marginBottom: "0.25rem" }}>{issue.title}</h4>
                      <p style={{ margin: 0, fontSize: "0.95rem", color: "#555" }}>
                        {issue.description}
                      </p>
                      <div style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "#888" }}>
                        <span>
                          <strong>Reported by:</strong> {issue.reporter}
                        </span>{" "}
                        | <span><strong>Date:</strong> {formatDate(issue.created_at)}</span>
                      </div>
                      <details style={{ marginTop: "0.5rem" }}>
                        <summary style={{ cursor: "pointer", color: "#007bff" }}>
                          View Comments ({issue.comments.length})
                        </summary>
                        <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
                          {/* Placeholder */}
                          <p>[Mock comments will go here]</p>
                        </div>
                      </details>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReportTab;
