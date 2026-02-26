import type { LucideIcon } from "lucide-react";

export default function ProfileFormSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="glass-panel rounded-2xl border-t border-white/10 p-8">
        <div className="mb-8 flex items-center gap-3 border-b border-white/5 pb-4">
          <div className="rounded-lg bg-[var(--color-primary-from)]/10 p-2 text-[var(--color-primary-from)]">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h2>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
