import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const receiptNumber = searchParams.get("receiptNumber") || "-";
    const plate = searchParams.get("plate") || "-";
    const vehType = searchParams.get("type") || "-";
    const total = searchParams.get("total") || "0";
    const entry = searchParams.get("entry") || "-";
    const exit = searchParams.get("exit") || "-";
    const appName = searchParams.get("appName") || "Parqueadero";
    const logoUrl = searchParams.get("logoUrl") || "";
    const nit = searchParams.get("nit") || "-";
    const address = searchParams.get("address") || "";
    const duration = searchParams.get("duration") || "";

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a", // dark background for contrast outside the receipt
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            padding: "40px",
            borderRadius: "24px",
            width: "450px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "24px",
              borderBottom: "2px dashed #cbd5e1",
              paddingBottom: "24px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "9999px"
                  }}
                />
              ) : (
                <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              )}
            </div>
            <span
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#0f172a",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {appName}
            </span>
            <span
              style={{ fontSize: "16px", color: "#64748b", marginTop: "4px" }}
            >
              NIT: {nit}
            </span>
            {address && (
              <span
                style={{ fontSize: "16px", color: "#64748b", marginTop: "4px" }}
              >
                {address}
              </span>
            )}
          </div>

          {/* Details */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "24px",
              fontSize: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <span style={{ color: "#64748b" }}>Recibo No.</span>
              <span
                style={{
                  fontWeight: "bold",
                  color: "#0f172a",
                  fontFamily: "monospace",
                }}
              >
                {receiptNumber}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <span style={{ color: "#64748b" }}>Placa</span>
              <span
                style={{
                  fontWeight: "bold",
                  color: "#0f172a",
                  fontSize: "22px",
                  backgroundColor: "#f1f5f9",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                }}
              >
                {plate}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#64748b" }}>Tipo</span>
              <span
                style={{
                  fontWeight: "500",
                  color: "#0f172a",
                  textTransform: "capitalize",
                }}
              >
                {vehType}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "16px",
              marginBottom: "24px",
              fontSize: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span style={{ color: "#64748b" }}>Ingreso</span>
              <span style={{ fontWeight: "500", color: "#0f172a" }}>
                {entry}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <span style={{ color: "#64748b" }}>Salida</span>
              <span style={{ fontWeight: "500", color: "#0f172a" }}>
                {exit}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Tiempo Total</span>
              <span style={{ fontWeight: "500", color: "#0f172a" }}>
                {duration}
              </span>
            </div>
          </div>

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc",
              padding: "24px",
              borderRadius: "16px",
              marginBottom: "32px",
            }}
          >
            <span
              style={{ fontWeight: "bold", color: "#334155", fontSize: "20px" }}
            >
              TOTAL A PAGAR
            </span>
            <span
              style={{ fontWeight: "bold", color: "#059669", fontSize: "32px" }}
            >{`$${total}`}</span>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "auto",
            }}
          >
            <span
              style={{
                color: "#94a3b8",
                fontSize: "16px",
                marginBottom: "4px",
              }}
            >
              ¡Gracias por su visita!
            </span>
            <span style={{ color: "#94a3b8", fontSize: "16px" }}>
              Conserve este recibo para reclamos.
            </span>
          </div>
        </div>
      </div>,
      {
        width: 600,
        height: 800,
      },
    );
  } catch (e: any) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
