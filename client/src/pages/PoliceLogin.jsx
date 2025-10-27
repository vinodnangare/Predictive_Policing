import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function PoliceLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Default credentials
  const defaultEmail = "police@example.com";
  const defaultPassword = "123456";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // First try the API login
      const response = await axios.post(`${API}/police/login`, form);

      if (response.data.token) {
        // API login successful
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("policeAuth", "true");
        setError("");
        navigate("/police/dashboard");
      } else if (form.email === defaultEmail && form.password === defaultPassword) {
        // Fallback to demo login
        localStorage.setItem("policeAuth", "true");
        localStorage.setItem("token", "demo-token");
        setError("");
        navigate("/police/dashboard");
      } else {
        setError("❌ Incorrect email or password!");
      }
    } catch (err) {
      // If API fails, try demo login
      if (form.email === defaultEmail && form.password === defaultPassword) {
        localStorage.setItem("policeAuth", "true");
        localStorage.setItem("token", "demo-token");
        setError("");
        navigate("/police/dashboard");
      } else {
        console.error("Login error:", err);
        setError("❌ Incorrect email or password!");
      }
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

        {error && <p className="text-red-600 text-sm">{error}</p>}

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
