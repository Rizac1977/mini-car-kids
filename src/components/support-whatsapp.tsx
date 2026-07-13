export function SupportWhatsapp({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://wa.me/5584998472400?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20MiniCar%20Gest%C3%A3o"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o suporte no WhatsApp"
      className={
        "fixed z-50 right-4 bottom-6 h-14 w-14 rounded-full grid place-items-center text-white shadow-[var(--shadow-elevated)] hover:scale-105 transition-transform " +
        className
      }
      style={{ backgroundColor: "#25D366" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.24c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.24-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Zm-5.55 7.6h-.01a10.94 10.94 0 0 1-5.57-1.52l-.4-.24-4.14 1.08 1.1-4.03-.26-.42a10.9 10.9 0 0 1-1.68-5.82c0-6.03 4.92-10.93 10.97-10.93a10.9 10.9 0 0 1 7.75 3.2 10.85 10.85 0 0 1 3.21 7.74c0 6.03-4.92 10.94-10.97 10.94Zm9.32-20.24A13.14 13.14 0 0 0 13.56 0C6.28 0 .35 5.9.35 13.14c0 2.31.6 4.57 1.75 6.55L.24 27l7.5-1.96a13.16 13.16 0 0 0 6.29 1.6h.01c7.27 0 13.2-5.9 13.2-13.14 0-3.51-1.37-6.81-3.86-9.3Z" />
      </svg>
    </a>
  );
}
