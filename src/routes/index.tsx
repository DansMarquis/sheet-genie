import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spreadsheet Automation Dashboard" },
      { name: "description", content: "Automate repetitive Excel edits with JSON-driven rules — 100% client-side." },
      { property: "og:title", content: "Spreadsheet Automation Dashboard" },
      { property: "og:description", content: "Upload or paste Excel data, apply JSON rules, download the result." },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/dashboard/index.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui", color: "#5a6274" }}>
      Loading dashboard…
    </div>
  );
}
