import React from "react";
import { Link } from "react-router-dom";

const stats = [
  { title: "Cards", value: 6 },
  { title: "Shares (7d)", value: 124 },
  { title: "Profile views", value: 842 },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <header className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <nav className="flex items-center gap-3">
            <Link to="/" className="text-sm">Home</Link>
            <button className="text-sm px-3 py-1 rounded border">Account</button>
          </nav>
        </header>

        <section className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-3">
          {stats.map(s => (
            <div key={s.title} className="p-4 bg-white rounded-lg shadow-sm">
              <div className="text-sm text-gray-500">{s.title}</div>
              <div className="mt-2 text-2xl font-semibold">{s.value}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 bg-white rounded-lg shadow-sm">
            <h3 className="font-semibold">Recent activity</h3>
            <div className="mt-4 text-sm text-gray-600">No recent activity — share your card to start tracking opens.</div>
          </div>

          <aside className="p-6 bg-white rounded-lg shadow-sm">
            <h4 className="font-semibold">Quick actions</h4>
            <div className="mt-4 flex flex-col gap-3">
              <Link to="/create" className="px-3 py-2 rounded bg-sky-600 text-white text-sm text-center">Create new card</Link>
              <a className="px-3 py-2 rounded border text-sm text-center">Import contacts</a>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}