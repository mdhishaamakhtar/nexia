import Link from "next/link";
import Button from "@/components/atoms/Button";
import { LogoMark } from "@/components/atoms/Logo";
import StatusNote from "@/components/molecules/StatusNote";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-(--gutter) py-10"
    >
      <Link
        href="/"
        aria-label="Nexia home"
        className="group/logo mb-6 flex h-16 w-16 items-center justify-center rounded-full"
      >
        <LogoMark size={56} />
      </Link>
      <StatusNote
        title="There's no page here"
        headingLevel="h1"
        actions={<Button href="/profiles">Open your slambook</Button>}
      >
        The link may be old, or mistyped.
      </StatusNote>
    </main>
  );
}
