import type { Metadata } from "next";

export const metadata: Metadata = { title: "New profile" };

export default function NewProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
