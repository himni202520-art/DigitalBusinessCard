import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: replace with real signup logic
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full p-6 bg-white rounded shadow">
        <h3 className="text-lg font-semibold">Create account</h3>

        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
          <input placeholder="Full name" name="name" type="text" className="p-2 border rounded" required />
          <input placeholder="Email" name="email" type="email" className="p-2 border rounded" required />
          <input placeholder="Password" name="password" type="password" className="p-2 border rounded" required />
          <button type="submit" className="p-2 bg-sky-600 text-white rounded">Create account</button>
        </form>

        <div className="mt-4 text-sm">
          Already a user? <Link to="/login" className="text-sky-600">Login</Link>
        </div>
      </div>
    </div>
  );
}