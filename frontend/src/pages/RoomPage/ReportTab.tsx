import { useEffect, useState } from "react";

type Issue = {
  id: number;
  location: string;
  title: string;
  description: string;
  status: "Reported" | "In Progress" | "Solved";
  reporter: string;
  created_at: string;
  comments: any[]; // Mocked for now
  score: number; // Ignored for now
};

const statusColors: Record<string, string> = {
  "Reported": "#d9534f",       // red
  "In Progress": "#f0ad4e",    // orange
  "Solved": "#5cb85c",         // green
};

const statusLabels: Record<string, string> = {
  "Reported": "Reported",
  "In Progress": "In Progress",
  "Solved": "Solved",
};

const ReportTab = ({ roomName }: { roomName: string }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedStatus, setExpandedStatus] = useState<Record<string, boolean>>({
    "Reported": true,
    "In Progress": false,
    "Solved": false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDescription, setNewIssueDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

  const fetchIssues = async () => {
    try {
      const response = await fetch(`/get_issues?location=${roomName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error("Error fetching issues:", error);
    }
  };

  useEffect(() => {
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
                backgroundColor: statusColors[status],
                color: "#fff",
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
                        <span><strong>Reported by:</strong> {issue.reporter}</span>{" "}
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

      {/* Floating Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          backgroundColor: "#007bff",
          color: "white",
          padding: "0.75rem 1.25rem",
          border: "none",
          borderRadius: "50px",
          fontSize: "1rem",
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          transition: "background-color 0.3s ease",
          zIndex: 999,
					display: "inline-block",
					whiteSpace: "nowrap"
        }}
      >
        + Report Issue
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "100vw",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "500px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ marginTop: 0 }}>New Issue</h3>
            <input
              type="text"
              placeholder="Title"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
            />
            <textarea
              placeholder="Description"
              value={newIssueDescription}
              onChange={(e) => setNewIssueDescription(e.target.value)}
              rows={4}
              style={{ width: "100%", marginBottom: "0.5rem", padding: "0.5rem" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button
                onClick={async () => {
									const token = localStorage.getItem("access_token");
									if (!token) {
										alert("You must be logged in.");
										return;
									}

									setIsSubmitting(true);
									try {
										const response = await fetch("/push_issue", {
											method: "POST",
											headers: {
												"Content-Type": "application/json",
												Authorization: `Bearer ${token}`,
											},
											body: JSON.stringify({
												location: roomName,
												title: newIssueTitle,
												description: newIssueDescription,
											}),
										});

										if (!response.ok) throw new Error("Failed to submit issue");

										setNewIssueTitle("");
										setNewIssueDescription("");
										setIsModalOpen(false);
										setShowSuccess(true);
										await fetchIssues();
										
										setTimeout(() => setShowSuccess(false), 2000); // hide after 3s
									} catch (err) {
										console.error(err);
										alert("Failed to submit issue.");
									} finally {
										setIsSubmitting(false);
									}
								}}

                style={{
                  backgroundColor: "#28a745",
                  color: "white",
                  padding: "0.5rem 1rem",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

			{isSubmitting && (
				<div style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: "100vw",
					height: "100vh",
					backgroundColor: "rgba(0,0,0,0.4)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					zIndex: 1100,
					color: "#fff",
					fontSize: "1.5rem",
					fontWeight: "bold"
				}}>
					Submitting...
				</div>
			)}

			{showSuccess && (
				<div style={{
					position: "fixed",
					top: "20%",
					left: "50%",
					transform: "translateX(-50%)",
					backgroundColor: "#28a745",
					color: "white",
					padding: "1rem 2rem",
					borderRadius: "8px",
					zIndex: 1100,
					boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
					fontWeight: "bold"
				}}>
					Issue submitted successfully!
				</div>
			)}

    </div>
  );
};

export default ReportTab;
