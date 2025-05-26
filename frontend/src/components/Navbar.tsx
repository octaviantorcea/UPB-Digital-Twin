import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleAppNameClick = () => {
    navigate("/");
  };

  const isLoggedIn = !!localStorage.getItem("token");  // Check if logged in

  return (
    <nav style={{
      backgroundColor: "#2c3e50",
      color: "white",
      padding: "0.75rem 1rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "relative"
    }}>
      <div
        onClick={handleAppNameClick}
        style={{
          fontSize: "1.2rem",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        🏢 MyApp
      </div>

      <div onClick={toggleMenu} style={{ cursor: "pointer", fontSize: "1.5rem" }}>
        ☰
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: "0",
          backgroundColor: "#34495e",
          borderRadius: "0 0 8px 8px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}>
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            style={{ display: "block", padding: "0.75rem 1.5rem", color: "white", textDecoration: "none" }}
          >
            Home
          </Link>

          {!isLoggedIn && (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              style={{ display: "block", padding: "0.75rem 1.5rem", color: "white", textDecoration: "none" }}
            >
              Login
            </Link>
          )}

          {isLoggedIn && (
            <div
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              style={{
                display: "block",
                padding: "0.75rem 1.5rem",
                color: "white",
                cursor: "pointer",
                borderTop: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              Logout
            </div>
          )}

          <Link
            to="/register"
            onClick={() => setIsOpen(false)}
            style={{ display: "block", padding: "0.75rem 1.5rem", color: "white", textDecoration: "none" }}
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
