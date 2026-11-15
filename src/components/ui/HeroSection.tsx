import { motion } from 'motion/react';

interface HeroSectionProps {
  isDark: boolean;
}

export function HeroSection({ isDark }: HeroSectionProps) {
  // Opposite background rule:
  // Light mode -> black background image
  // Dark mode -> white/light background image
  const heroImageSrc = isDark
    ? './assets/aistudio/fintech_hero_investment_calculator_png_1794673469892_04690657.jpg'
    : './assets/aistudio/fintech_hero_investment_calculator_dark_png_1794673530989_1c678e64.jpg';

  return (
    <section
      aria-label="Financial trajectory hero"
      className="rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111622] p-6 sm:p-8 lg:p-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center">
        {/* Headline & Subtext */}
        <div className="md:col-span-7 space-y-4">
          <div className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[#5367F5] dark:text-[#7C8CFF]">
            MATHEMATICAL WEALTH INTELLIGENCE
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-slate-900 dark:text-slate-50 [text-wrap:balance]">
            Simulate Your Financial Trajectory with Precision
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Interactive real-time simulators for Lump Sum, SIP, Step-Up, SWP, Fixed Deposits, and a unified multi-stream portfolio aggregator.
          </p>
        </div>

        {/* Right Column 1:1 Hero Visual */}
        <div className="md:col-span-5 flex items-center justify-center">
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
            className="w-full max-w-[300px] sm:max-w-[360px] md:max-w-[420px] aspect-square rounded-[20px] overflow-hidden border border-black/[0.06] dark:border-white/[0.08] shadow-lg"
          >
            <img
              src={heroImageSrc}
              alt="Minimalist 3D financial compounding ribbon and orbital portfolio rings"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
