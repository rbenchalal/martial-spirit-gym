export default function WhatsAppButton() {
  return (
    <div className="fixed right-4 bottom-4 z-[60] sm:right-6 sm:bottom-6">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/95 p-2 pl-3 shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur">
        <span className="text-xs font-medium text-zinc-300">Contact WhatsApp</span>
        <a
          href="https://wa.me/41789050883"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter Martial Spirit Gym sur WhatsApp"
          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-4 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
