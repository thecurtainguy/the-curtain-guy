import { BrandLogo } from "@/components/brand-logo";

type AccountAuthBrandHeaderProps = {
  label: string;
};

export function AccountAuthBrandHeader({ label }: AccountAuthBrandHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      <BrandLogo href="" size="footer" />
      <p className="flex w-full max-w-[12rem] items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
        <span
          className="h-px min-w-3 flex-1 bg-gradient-to-r from-transparent via-primary/55 to-primary/80"
          aria-hidden
        />
        <span className="shrink-0 whitespace-nowrap">{label}</span>
        <span
          className="h-px min-w-3 flex-1 bg-gradient-to-l from-transparent via-primary/55 to-primary/80"
          aria-hidden
        />
      </p>
    </div>
  );
}
