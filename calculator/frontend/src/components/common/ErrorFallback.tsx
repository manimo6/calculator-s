interface ErrorFallbackProps {
  error: Error
  onReset: () => void
}

export default function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "50vh",
      padding: "2rem",
      textAlign: "center",
    }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        문제가 발생했습니다
      </h2>
      <p style={{ color: "#666", marginBottom: "1rem", maxWidth: "400px" }}>
        페이지를 불러오는 중 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해주세요.
      </p>
      {import.meta.env.DEV && (
        <pre style={{
          background: "#f5f5f5",
          padding: "1rem",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          maxWidth: "600px",
          overflow: "auto",
          marginBottom: "1rem",
        }}>
          {error.message}
        </pre>
      )}
      <button
        onClick={onReset}
        style={{
          padding: "0.5rem 1.5rem",
          borderRadius: "0.375rem",
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        다시 시도
      </button>
    </div>
  )
}
