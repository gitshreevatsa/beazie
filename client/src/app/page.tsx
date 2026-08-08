"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const HERO_COLORS = ["#FF5A5F", "#FFE566", "#7FCFB8", "#6EB5FF", "#FF8A8E"];

export default function Home() {
  return (
    <div className="bg-bg text-ink">
      <main className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-16 pt-[120px] m500:pb-10 m500:pt-24">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 80% at 70% 40%, #FFE566 0%, transparent 45%), linear-gradient(160deg, #B8E8D8 0%, #7FCFB8 45%, #FF8A8E 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 48px, #121212 49px)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute right-[-2%] top-[20%] h-[65vh] w-[min(48vw,480px)] m800:right-[-12%] m800:top-[24%] m800:h-[50vh] m800:w-[72vw]"
          aria-hidden
        >
          <HeroBoxes />
        </motion.div>

        <div className="relative z-10 max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-[clamp(4.5rem,14vw,9rem)] font-extrabold leading-[0.85] tracking-[-0.04em] text-ink"
          >
            Veil
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-6 max-w-md font-body text-xl font-medium leading-snug text-ink/80 m500:text-lg"
          >
            Mystery boxes that stay private until you open them.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="mt-10"
          >
            <Link
              href="/play"
              className="inline-flex items-center gap-3 border-4 border-ink bg-ink px-8 py-3.5 font-display text-xl font-bold text-butter shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
            >
              Play a round
              <span aria-hidden>→</span>
            </Link>
          </motion.div>
        </div>
      </main>

      <section className="border-t-4 border-ink bg-ink px-6 py-20 text-butter m500:py-14">
        <div className="mx-auto max-w-3xl">
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-butter/45">
            The loop
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight m500:text-3xl">
            Pick. Open. Win.
          </h2>
          <p className="mt-5 max-w-2xl font-body text-lg leading-relaxed text-butter/80 m500:text-base">
            Choose a box, open it, and pull a prize. The outcome stays private
            until it lands in your hands.
          </p>
        </div>
      </section>

      <section className="border-t-4 border-ink bg-butter px-6 py-16 m500:py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ink/50">
              Fair play
            </p>
            <p className="mt-3 max-w-md font-display text-3xl font-bold leading-tight text-ink m500:text-2xl">
              No peeking mid-round. Ever.
            </p>
          </div>
          <Link
            href="/play"
            className="inline-flex w-fit border-4 border-ink bg-main px-6 py-3 font-display text-lg font-bold text-ink shadow-base transition-all hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
          >
            Try it
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroBoxes() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-[6%] bottom-0 top-[10%] border-[5px] border-ink bg-cabinet shadow-strong">
        <div className="absolute inset-[6%] overflow-hidden border-[3px] border-ink/40 bg-[#2a3f4a]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,229,102,0.25),transparent_55%)]" />
          <div className="absolute inset-x-4 bottom-8 top-10 flex flex-wrap items-end justify-center gap-3 content-end">
            {HERO_COLORS.map((c, i) => (
              <motion.div
                key={i}
                className="relative h-16 w-16 border-[3px] border-ink"
                style={{ backgroundColor: c }}
                animate={{
                  y: [0, -12 - i * 2, 0],
                  rotate: [-6 + i, 6 - i, -6 + i],
                }}
                transition={{
                  duration: 2.2 + i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.15,
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-extrabold text-ink/20">
                  ?
                </span>
                <div className="absolute left-1 right-1 top-[30%] h-[2px] bg-ink/25" />
              </motion.div>
            ))}
          </div>
        </div>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 border-[3px] border-ink bg-main px-4 py-1 font-display text-sm font-bold tracking-wide text-ink">
          VEIL
        </div>
      </div>
    </div>
  );
}
