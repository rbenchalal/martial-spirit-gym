import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PUBLIC_TARIFFS } from "@/lib/tarifs/public-tarifs";

export default function Pricing() {
  return (
    <section id="tarifs" className="border-b border-white/10 py-20">
      <Container>
        <SectionTitle
          eyebrow="Tarifs"
          title="Des formules adaptées à votre pratique"
        />
        <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
          Consultez nos abonnements 2 cours par semaine, nos formules Full access
          et nos cartes de 5 ou 10 cours.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PUBLIC_TARIFFS.audiences.map((audience) => (
            <li
              key={audience.id}
              className="rounded-2xl border border-white/10 bg-zinc-900/70 px-5 py-4 text-sm font-medium text-zinc-200"
            >
              {audience.title}
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <PrimaryButton href="/tarifs">Voir tous les tarifs</PrimaryButton>
        </div>
      </Container>
    </section>
  );
}
