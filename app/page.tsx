export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24">
        <span className="mb-6 inline-block rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
          Martial Spirit Gym
        </span>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Boxe Thaïlandaise & MMA à Gland pour Kids et Adultes
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
          École d’arts martiaux dédiée à la boxe thaïlandaise et au MMA. Cours
          pour enfants dès 8 ans, adultes, débutants et pratiquants confirmés.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="#planning"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500"
          >
            Voir le planning
          </a>
          <a
            href="#tarifs"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Voir les tarifs
          </a>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-400">Public</p>
            <p className="mt-2 text-lg font-semibold">Kids dès 8 ans</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-400">Disciplines</p>
            <p className="mt-2 text-lg font-semibold">Muay Thaï & MMA</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-400">Cours</p>
            <p className="mt-2 text-lg font-semibold">Collectifs & privés</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-zinc-400">Lieu</p>
            <p className="mt-2 text-lg font-semibold">Gland, Suisse</p>
          </div>
        </div>

        <section id="planning" className="mt-24">
          <h2 className="text-2xl font-bold sm:text-3xl">Planning</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <h3 className="text-xl font-semibold">Boxe Thaïlandaise – Kids (8+)</h3>
              <ul className="mt-4 space-y-2 text-zinc-300">
                <li>Lundi : 17h30 – 18h45</li>
                <li>Mercredi : 16h30 – 17h45</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <h3 className="text-xl font-semibold">Boxe Thaïlandaise – Adultes</h3>
              <ul className="mt-4 space-y-2 text-zinc-300">
                <li>Lundi : 19h00 – 20h30</li>
                <li>Vendredi : 18h30 – 20h00</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <h3 className="text-xl font-semibold">MMA – Kids</h3>
              <ul className="mt-4 space-y-2 text-zinc-300">
                <li>Samedi : 15h00 – 16h15</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <h3 className="text-xl font-semibold">MMA – Adultes</h3>
              <ul className="mt-4 space-y-2 text-zinc-300">
                <li>Samedi : 16h30 – 18h00</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="tarifs" className="mt-24">
          <h2 className="text-2xl font-bold sm:text-3xl">Tarifs</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
              <h3 className="text-xl font-semibold">Cours collectifs Kids</h3>
              <ul className="mt-4 space-y-2 text-zinc-200">
                <li>Trimestriel : 170 CHF</li>
                <li>Semestriel : 320 CHF</li>
                <li>Annuel : 600 CHF</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <h3 className="text-xl font-semibold">Cours collectifs Adultes</h3>
              <ul className="mt-4 space-y-2 text-zinc-200">
                <li>Trimestriel : 280 CHF</li>
                <li>Semestriel : 540 CHF</li>
                <li>Annuel : 990 CHF</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              <h3 className="text-xl font-semibold">Carte 10 cours Adultes</h3>
              <ul className="mt-4 space-y-2 text-zinc-200">
                <li>250 CHF</li>
                <li>Valable 6 mois</li>
              </ul>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
