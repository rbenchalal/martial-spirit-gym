import {
  formatChf,
  type PublicCourseCard,
  type PublicTariffDuration,
  type PublicTariffFormula,
  type PublicTariffPayment,
  type PublicTariffs,
} from "@/lib/tarifs/public-tarifs";

export type PublicTarifsDisplayProps = {
  tarifs: PublicTariffs;
};

const INSTALLMENT_COLUMNS = [1, 2, 3] as const;

function findPayment(
  payments: PublicTariffPayment[],
  installments: 1 | 2 | 3,
): PublicTariffPayment | undefined {
  return payments.find((payment) => payment.installments === installments);
}

function PaymentCellContent({
  payment,
}: {
  payment: PublicTariffPayment | undefined;
}) {
  if (!payment) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">Non proposé</span>
      </>
    );
  }

  if (payment.installments === 1) {
    return <span>{formatChf(payment.totalChf)}</span>;
  }

  return (
    <span className="block space-y-1">
      <span className="block">
        {payment.installments} × {formatChf(payment.perInstallmentChf)}
      </span>
      <span className="block text-sm text-zinc-300">
        Total : {formatChf(payment.totalChf)}
      </span>
    </span>
  );
}

function DesktopFormulaTable({
  audienceTitle,
  formula,
}: {
  audienceTitle: string;
  formula: PublicTariffFormula;
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-zinc-100">
        <caption className="mb-4 text-left text-base font-semibold text-white">
          {audienceTitle} — {formula.label}
        </caption>
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-amber-200/90">
            <th scope="col" className="py-3 pr-4 font-semibold">
              Durée
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Paiement en 1 fois
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Paiement en 2 fois
            </th>
            <th scope="col" className="py-3 pl-4 font-semibold">
              Paiement en 3 fois
            </th>
          </tr>
        </thead>
        <tbody>
          {formula.durations.map((duration) => (
            <tr
              key={duration.id}
              className="border-b border-white/10 align-top last:border-b-0"
            >
              <th
                scope="row"
                className="py-4 pr-4 text-base font-semibold text-white"
              >
                {duration.label}
              </th>
              {INSTALLMENT_COLUMNS.map((installments) => (
                <td
                  key={installments}
                  className={
                    installments === 1
                      ? "px-4 py-4"
                      : installments === 2
                        ? "px-4 py-4"
                        : "py-4 pl-4"
                  }
                >
                  <PaymentCellContent
                    payment={findPayment(duration.payments, installments)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobilePaymentOption({
  payment,
  installments,
}: {
  payment: PublicTariffPayment | undefined;
  installments: 1 | 2 | 3;
}) {
  const label =
    installments === 1
      ? "Paiement en 1 fois"
      : installments === 2
        ? "Paiement en 2 fois"
        : "Paiement en 3 fois";

  if (!payment) {
    return (
      <p className="text-sm text-zinc-400">
        {label} : Non proposé
      </p>
    );
  }

  if (payment.installments === 1) {
    return (
      <p className="text-sm text-zinc-200">
        {label} : {formatChf(payment.totalChf)}
      </p>
    );
  }

  return (
    <div className="text-sm text-zinc-200">
      <p>
        {label} : {payment.installments} ×{" "}
        {formatChf(payment.perInstallmentChf)}
      </p>
      <p className="mt-1 text-zinc-300">
        Total : {formatChf(payment.totalChf)}
      </p>
    </div>
  );
}

function MobileDurationCard({ duration }: { duration: PublicTariffDuration }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
      <h4 className="text-base font-semibold text-white">{duration.label}</h4>
      <div className="mt-4 space-y-3">
        {INSTALLMENT_COLUMNS.map((installments) => (
          <MobilePaymentOption
            key={installments}
            installments={installments}
            payment={findPayment(duration.payments, installments)}
          />
        ))}
      </div>
    </article>
  );
}

function FormulaBlock({
  audienceTitle,
  formula,
}: {
  audienceTitle: string;
  formula: PublicTariffFormula;
}) {
  return (
    <section className="mt-8">
      <h3 className="text-xl font-semibold text-white">{formula.label}</h3>

      <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <DesktopFormulaTable
          audienceTitle={audienceTitle}
          formula={formula}
        />

        <div className="grid gap-4 md:hidden">
          {formula.durations.map((duration) => (
            <MobileDurationCard key={duration.id} duration={duration} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CourseCardsBlock({ courseCards }: { courseCards: PublicCourseCard[] }) {
  const groups = [
    {
      audience: "adults" as const,
      label: "Adultes" as const,
      cards: courseCards.filter((card) => card.audience === "adults"),
    },
    {
      audience: "children" as const,
      label: "Enfants" as const,
      cards: courseCards.filter((card) => card.audience === "children"),
    },
  ];

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Cartes de cours
      </h2>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.audience}>
            <h3 className="text-lg font-semibold text-amber-200/90">
              {group.label}
            </h3>
            <div className="mt-4 grid gap-4">
              {group.cards.map((card) => (
                <article
                  key={`${card.audience}-${card.courses}`}
                  className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6"
                >
                  <p className="text-base font-semibold text-white">
                    {card.courses} cours
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {formatChf(card.priceChf)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    Valable {card.validityMonths} mois
                  </p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PublicTarifsDisplay({
  tarifs,
}: PublicTarifsDisplayProps) {
  return (
    <div className="space-y-16">
      {tarifs.audiences.map((audience) => (
        <section key={audience.id}>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {audience.title}
          </h2>
          {audience.note ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              {audience.note}
            </p>
          ) : null}

          {audience.formulas.map((formula) => (
            <FormulaBlock
              key={`${audience.id}-${formula.id}`}
              audienceTitle={audience.title}
              formula={formula}
            />
          ))}
        </section>
      ))}

      <CourseCardsBlock courseCards={tarifs.courseCards} />
    </div>
  );
}
