import Link from "next/link";

const Page = () => {
  return (
    <div className="min-h-[100svh] bg-bg text-ink">
      <section className="flex w-full flex-col items-center justify-center px-5 pb-20 pt-32">
        <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ink/50">
          Floor
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
          Pick a machine
        </h1>
        <Link href="/games/claw" className="mt-8 w-full max-w-md">
          <div className="group flex h-[220px] flex-col justify-between border-4 border-ink bg-cabinet p-8 text-butter shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-butter/50">
                Machine 01
              </p>
              <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">
                The Claw
              </p>
            </div>
            <p className="font-body text-base text-butter/70">
              Drop for a sealed prize. Claim when you&apos;re ready.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
};

export default Page;
