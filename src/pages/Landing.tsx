import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      <header className="w-full py-4 px-6 flex items-center justify-between">
        <div className="text-xl font-semibold">DigitalBusinessCard</div>
        <nav className="space-x-3">
          <Link to="/login" className="px-3 py-1 rounded-md text-sm hover:underline">Login</Link>
          <Link to="/signup" className="px-3 py-1 rounded-md bg-sky-600 text-white text-sm">Get Started</Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <section className="max-w-6xl w-full grid gap-12 grid-cols-1 md:grid-cols-2 items-center">
          {/* Left column: copy/promo */}
          <div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Create & share your digital business card — instantly.
            </h1>

            <p className="mt-4 text-gray-600 max-w-xl">
              Build modern digital cards that fit any device, share with QR or link,
              and track views & activity. Works great on phones, tablets and desktop.
            </p>

            <div className="mt-6 flex gap-3">
              <Link to="/signup" className="px-5 py-3 rounded-md bg-sky-600 text-white font-medium">Get started — free</Link>
              <a href="#features" className="px-5 py-3 rounded-md border">See features</a>
            </div>

            <ul id="features" className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <li className="p-3 border rounded">Responsive templates</li>
              <li className="p-3 border rounded">QR & shareable links</li>
              <li className="p-3 border rounded">Analytics & opens tracking</li>
              <li className="p-3 border rounded">Integrations (email, calendar)</li>
            </ul>
          </div>

          {/* Right column: preview card */}
          <div className="flex items-center justify-center">
            <div className="w-80 md:w-96 p-6 rounded-2xl shadow-xl bg-white">
              <div className="rounded-lg overflow-hidden p-4 border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-200" />
                  <div>
                    <div className="font-semibold">Nitesh Vohra</div>
                    <div className="text-xs text-gray-500">Founder — SYNKA</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <div className="p-2 rounded border break-words">📞 +91 9xx xxx xxxx</div>
                  <div className="p-2 rounded border break-words">✉️ nitesh@synka.in</div>
                  <div className="p-2 rounded border break-words">🔗 synka.in/nitesh</div>
                </div>

                <div className="mt-4 text-xs text-gray-400">Preview: responsive business card</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} DigitalBusinessCard — made with ♥
      </footer>
    </div>
  );
}