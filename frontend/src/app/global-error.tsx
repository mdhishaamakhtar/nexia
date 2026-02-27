"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#FFF7ED",
            color: "#1f2937",
            fontFamily: "Nunito, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(148,163,184,0.28)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px" }}>Application error</h2>
            <p style={{ marginTop: "10px", color: "#374151" }}>
              A critical error occurred. Try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "14px",
                border: "1px solid rgba(124,58,237,0.2)",
                background: "#FDBA74",
                color: "#1f2937",
                borderRadius: "999px",
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <pre
              style={{
                marginTop: "14px",
                whiteSpace: "pre-wrap",
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              {error.message}
            </pre>
          </div>
        </div>
      </body>
    </html>
  );
}
