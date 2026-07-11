export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "h-10 w-10", text: "text-lg", sub: "text-[10px]" },
    md: { box: "h-14 w-14", text: "text-2xl", sub: "text-xs" },
    lg: { box: "h-20 w-20", text: "text-3xl", sub: "text-sm" },
  }[size];
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes.box} rounded-2xl bg-primary text-primary-foreground grid place-items-center font-black shadow-[var(--shadow-elevated)]`}
      >
        <span className={sizes.text}>M</span>
      </div>
      <div className="text-center leading-tight">
        <div className="font-bold tracking-tight">MiniCar</div>
        <div className={`${sizes.sub} text-muted-foreground uppercase tracking-widest`}>
          Gestão
        </div>
      </div>
    </div>
  );
}
