import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";

const userName = import.meta.env.VITE_USER_NAME || "Friend";

export default function Home({ onExplore }: { onExplore: () => void }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070709] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[120px]" />

        <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-fuchsia-600/5 blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#070709_85%)]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <Sparkles size={15} className="text-violet-300" />
          </div>

          <span className="text-sm font-medium tracking-wide text-white/80">
            for {userName}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="hidden text-xs tracking-[0.25em] text-white/30 sm:block"
        >
          A LITTLE SOMETHING
        </motion.div>
      </nav>


      <section className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6">
        <div className="mx-auto w-full max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-7 flex items-center justify-center gap-3"
          >
            <span className="h-px w-8 bg-white/20" />

            <span className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              welcome
            </span>

            <span className="h-px w-8 bg-white/20" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl font-semibold tracking-[-0.04em] sm:text-7xl lg:text-8xl"
          >
            Hey,{" "}
            <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
              {userName}.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mx-auto mt-7 max-w-xl text-base leading-7 text-white/40 sm:text-lg"
          >
            A small corner of the internet with a few things to explore,
            discover, and probably waste some time on.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10 flex justify-center"
          >
            <button
              type="button"
              onClick={onExplore}
              aria-label="Explore this space"
              className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-white px-6 py-3.5 text-sm font-medium text-black transition-all duration-300 hover:scale-[1.03] hover:bg-white/90"
            >
              <span>Explore</span>

              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />

              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-24 flex flex-col items-center gap-3"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/20">
              take your time
            </span>

            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="text-white/20"
            >
              <ArrowDown size={15} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="pointer-events-none absolute bottom-[-250px] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-500/[0.06] blur-[150px]" />
    </main>
  );
}
