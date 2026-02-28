import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppQueryProvider } from "@/shared/providers/query-provider";
import { ToastProvider } from "@/shared/ui/toast";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Nexia",
    template: "%s | Nexia",
  },
  description: "Your personal digital slambook — capture friends, memories, and connections.",
  keywords: ["slambook", "digital slambook", "friend profiles", "memories"],
  openGraph: {
    type: "website",
    siteName: "Nexia",
    title: "Nexia — Your Digital Slambook",
    description: "Your personal digital slambook — capture friends, memories, and connections.",
    images: [
      {
        url: "/assets/nexia-banner.png",
        width: 1200,
        height: 630,
        alt: "Nexia — Your Digital Slambook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexia — Your Digital Slambook",
    description: "Your personal digital slambook — capture friends, memories, and connections.",
    images: ["/assets/nexia-banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} antialiased`}>
        <AppQueryProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
