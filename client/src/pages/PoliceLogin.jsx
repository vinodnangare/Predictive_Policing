import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function PoliceLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page they tried to visit or default to dashboard
  const from = location.state?.from || "/police/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (form.email === "police@example.com" && form.password === "123456") {
        // Demo login
        localStorage.setItem("token", "demo-token");
        localStorage.setItem("policeAuth", "true");
        navigate(from, { replace: true });
      } else {
        // Real API login
        const response = await axios.post(`${API}/police/login`, form);
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("policeAuth", "true");
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("❌ Incorrect email or password!");
      localStorage.removeItem("token");
      localStorage.removeItem("policeAuth");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">Police Login</h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-80">
        <input
          className="border p-2 w-full mb-3"
          type="email"
          placeholder="Enter Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />

        <input
          className="border p-2 w-full mb-3"
          type="password"
          placeholder="Enter Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button className="bg-blue-600 text-white px-4 py-2 w-full rounded hover:bg-blue-700">
          Login
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-4">
        Demo Email: <b>police@example.com</b> <br />
        Demo Password: <b>123456</b>
      </p>
    </div>
  );
}

export default PoliceLogin;
