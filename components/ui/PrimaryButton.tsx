import { cn } from "@/lib/utils";

type PrimaryButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline";
  className?: string;
};

export default function PrimaryButton({
  href,
  children,
  variant = "solid",
  className,
}: PrimaryButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition sm:text-base",
        variant === "solid"
          ? "bg-red-600 text-white hover:bg-red-500"
          : "border border-white/20 text-white hover:bg-white/10",
        className,
      )}
    >
      {children}
    </a>
  );
}
