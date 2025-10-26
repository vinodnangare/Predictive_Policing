import { useState } from "react";

function PoliceLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  // ✅ Default credentials
  const defaultEmail = "police@example.com";
  const defaultPassword = "123456";

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ Check login
    if (form.email === defaultEmail && form.password === defaultPassword) {
      localStorage.setItem("policeAuth", "true"); // Save login session
      setError(""); // Clear errors
      window.location.href = "/police/dashboard"; // Redirect to dashboard
    } else {
      setError("❌ Incorrect email or password!");
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
