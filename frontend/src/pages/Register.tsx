import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    email: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json()

      if (!res.ok) {
        throw new Error("Registration failed");
      }

      setSuccessMessage(data.message || "Registration successful!")
      setSuccess(true);

      setTimeout(() => navigate("/login"), 10000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      {success && <p className="success">{successMessage}</p>}
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        {["first_name", "last_name", "username", "email", "password"].map(field => (
          <div key={field} style={{ marginBottom: "1rem" }}>
            <label>{field.replace("_", " ").toUpperCase()}:</label>
            <input
              type={field === "password" ? "password" : "text"}
              name={field}
              value={(form as any)[field]}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </div>
        ))}
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
