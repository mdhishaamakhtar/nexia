import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your slambook" };

export default function ProfilesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
