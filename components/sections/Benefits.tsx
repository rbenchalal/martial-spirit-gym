import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function Benefits() {
  return (
    <section id="benefits" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Bénéfices"
          title="Ce que vous développez au club"
          description="Les entraînements renforcent la technique, le physique et le mental dans la durée."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {siteData.benefits.map((benefit) => (
            <div
              key={benefit}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-zinc-200"
            >
              {benefit}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
