import { cn } from "@/lib/utils";

type SectionTitleProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  align?: "left" | "center";
};

export default function SectionTitle({
  title,
  description,
  eyebrow,
  align = "left",
}: SectionTitleProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-red-300">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-8 text-zinc-300 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
