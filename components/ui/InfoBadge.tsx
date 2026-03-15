type InfoBadgeProps = {
  label: string;
  value: string;
};

export default function InfoBadge({ label, value }: InfoBadgeProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
