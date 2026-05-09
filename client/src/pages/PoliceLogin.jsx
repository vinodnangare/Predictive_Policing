import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { apiPost } from "../utils/api";
import AgencyBrand from "../components/AgencyBrand";

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
        toast.success("Welcome back, officer.");
        navigate(from, { replace: true });
      } else {
        // Real API login
        const response = await apiPost("/api/login", form);
        if (response?.token) {
          localStorage.setItem("token", response.token);
          localStorage.setItem("policeAuth", "true");
          toast.success("Signed in successfully.");
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Incorrect email or password.");
      toast.error("Login failed. Check your credentials and try again.");
      localStorage.removeItem("token");
      localStorage.removeItem("policeAuth");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -right-16 bottom-8 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/90 shadow-2xl shadow-black/50 md:grid-cols-2">
        <section className="hidden border-r border-slate-700/60 bg-gradient-to-br from-[#0b1f35] via-[#102a46] to-[#0b1728] p-10 md:flex md:flex-col md:justify-between">
          <div>
            <AgencyBrand className="max-w-full" />
            <p className="mt-5 inline-flex rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
              Secure Operations Access
            </p>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-slate-100">Police Command Login</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Sign in to access analytics, case operations, incident management, and predictive hotspot intelligence.
            </p>
            <div className="mt-6 rounded-xl border border-slate-500/30 bg-slate-900/55 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Mission Statement</p>
              <p className="mt-1 text-sm text-slate-200">Data-driven policing for safer districts, quicker response, and accountable operations.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-600/60 bg-slate-900/70 p-4 text-sm text-slate-200">
            <p className="font-semibold text-cyan-200">Demo Credentials</p>
            <p className="mt-2">Test_Email: police@example.com</p>
            <p>Test_Password: 123456</p>
          </div>
        </section>

        <section className="p-6 sm:p-8 md:p-10">
          <div className="mb-5 md:hidden">
            <AgencyBrand compact className="max-w-full" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Officer Sign In</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-300">Use your authorized credentials to continue to the dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Email Address</label>
              <input
                className="w-full rounded-xl border border-slate-500/80 bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40"
                type="email"
                placeholder="Enter email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
              <input
                className="w-full rounded-xl border border-slate-500/80 bg-slate-800 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40"
                type="password"
                placeholder="Enter password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-900/40 transition hover:brightness-110"
            >
              Login to Police Panel
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-xs text-slate-300 md:hidden">
            <p className="font-semibold text-cyan-200">Demo Credentials</p>
            <p className="mt-1">Email: police@example.com</p>
            <p>Password: 123456</p>
          </div>

          <p className="mt-6 text-sm text-slate-300">
            Looking for public crime map view?{" "}
            <Link to="/public-dashboard" className="font-semibold text-cyan-300 hover:text-cyan-200">
              Open Public Dashboard
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default PoliceLogin;
