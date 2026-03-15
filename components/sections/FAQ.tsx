import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { siteData } from "@/lib/data";

export default function FAQ() {
  return (
    <section id="faq" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="FAQ"
          title="Questions fréquentes"
          description="Informations pratiques sur les inscriptions, les niveaux et le fonctionnement des cours."
        />

        <div className="mt-10 space-y-4">
          {siteData.faq.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <summary className="cursor-pointer text-base font-semibold text-white sm:text-lg">
                {item.question}
              </summary>
              <p className="mt-4 leading-7 text-zinc-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
