import logoUrl from "@/assets/minicar-kids-logo-full.png";

export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-36 w-36",
  }[size];
  return (
    <div className="flex flex-col items-center">
      <img
        src={logoUrl}
        alt="MiniCar Kids"
        className={`${sizes} object-contain`}
        decoding="async"
      />
    </div>
  );
}
