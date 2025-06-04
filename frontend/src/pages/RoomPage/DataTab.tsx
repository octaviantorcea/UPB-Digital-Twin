const DataTab = ({ roomName }: { roomName: string }) => {
  return (
    <main style={{ textAlign: "center", fontSize: "1.2rem", color: "#333" }}>
      <p>
        <strong>Room:</strong> {roomName}
      </p>
      <p>
        <strong>Active Tab:</strong> Data
      </p>
    </main>
  );
};

export default DataTab;
