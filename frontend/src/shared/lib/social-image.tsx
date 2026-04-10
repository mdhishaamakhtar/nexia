import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialImageSize = {
  width: 1200,
  height: 630,
} as const;

export const socialImageAlt = "Nexia social preview";

const siteName = "Nexia";
const siteDomain = "nexia.hishaam.dev";
const siteDescription =
  "Your personal digital slambook for friends, memories, and the little details you want to keep.";

async function loadGeistRegular() {
  return readFile(
    join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf")
  );
}

export async function createSocialImage() {
  const geistRegular = await loadGeistRegular();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#fff7ed",
        color: "#1f2937",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: "#fff7ed",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 32,
            borderRadius: 36,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(148,163,184,0.22)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 24,
            left: "50%",
            width: 148,
            height: 28,
            borderRadius: 999,
            background: "#fdba74",
            opacity: 0.78,
            transform: "translateX(-50%) rotate(-2deg)",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            position: "relative",
            padding: "64px 72px 58px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  borderRadius: 16,
                  background: "#ffffff",
                  border: "1px solid rgba(148,163,184,0.24)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    position: "relative",
                    width: 18,
                    height: 20,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 4,
                      height: 20,
                      borderRadius: 999,
                      background: "#1f2937",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      width: 4,
                      height: 20,
                      borderRadius: 999,
                      background: "#1f2937",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 7,
                      top: -1,
                      width: 4,
                      height: 22,
                      borderRadius: 999,
                      background: "#1f2937",
                      transform: "rotate(-31deg)",
                      transformOrigin: "center",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                  }}
                >
                  Digital Slambook
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {siteName}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {["friends", "memories", "lookup"].map((label, index) => {
                const backgrounds = ["#fdba74", "#c4b5fd", "#93c5fd"];
                const widths = [88, 104, 88];

                return (
                  <div
                    key={label}
                    style={{
                      width: widths[index],
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1,
                      color: "#1f2937",
                      background: backgrounds[index],
                    }}
                  >
                    <div style={{ display: "flex", transform: "translateY(-1px)" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              maxWidth: 760,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 122,
                  lineHeight: 0.88,
                  fontWeight: 700,
                  letterSpacing: "-0.08em",
                }}
              >
                NEXIA
              </div>
              <div
                style={{
                  fontSize: 34,
                  lineHeight: 1.22,
                  color: "#374151",
                  maxWidth: 690,
                }}
              >
                {siteDescription}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 2,
                  background: "#c4b5fd",
                }}
              />
              <div
                style={{
                  fontSize: 18,
                  color: "#6b7280",
                }}
              >
                Manage people. Remember details. Ask later.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6b7280",
              }}
            >
              Personal • Warm • Playful
            </div>
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#374151",
              }}
            >
              {siteDomain}
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...socialImageSize,
      fonts: [
        {
          name: "Geist",
          data: geistRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
