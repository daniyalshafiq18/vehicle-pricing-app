import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, LoadingScreen } from '@components/ui';
import { useDataSource } from '@data';
import {
  ArrowRight,
  Car,
  Shield,
  BarChart3,
  TrendingUp,
  Search,
  CheckCircle,
  Star,
  Zap,
  Tag,
  Gauge,
} from 'lucide-react';
import { useAnalytics } from '@hooks';
import { formatCurrency, formatNumber } from '@utils';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.5 },
};

const stagger = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { staggerChildren: 0.1 },
};

export function LandingPage() {
  const { data: analytics, isLoading } = useAnalytics();
  const { isInitializing } = useDataSource();
  const [showSplash, setShowSplash] = useState(true);

  // Keep splash visible until BOTH:
  //   1. Data source is fully initialized (all vehicle pages fetched via keyset pagination)
  //   2. Analytics query has resolved
  useEffect(() => {
    if (!isInitializing && !isLoading) {
      const timeout = setTimeout(() => setShowSplash(false), 200);
      return () => clearTimeout(timeout);
    }
  }, [isInitializing, isLoading]);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-0 z-50"
          >
            <LoadingScreen message="Loading vehicle data..." />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
      {/* ─── Hero Section ─────────────────────────── */}
      <section className="relative bg-grid-glow">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#19b8a5]/8 via-transparent to-background" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#19b8a5]/8 blur-3xl animate-float" />

        <div className="relative mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20 md:py-32">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-6 inline-flex animate-bounce-gentle items-center gap-2 rounded-full border border-[#bfe9e2] bg-[#19b8a5] px-4 py-1.5 text-sm font-semibold tracking-wide text-white shadow-md shadow-[rgba(25,184,165,0.22)] dark:border-[#31545a] dark:bg-[#19b8a5]">
              <Zap className="h-3.5 w-3.5 text-[#ecfbf8]" />
              UAE Vehicle Pricing Intelligence
            </span>

            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white md:text-6xl lg:text-7xl">
              Know the{' '}
              <span className="shimmer-text">True Value</span>
              <br />
              of Any Vehicle
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground dark:text-slate-300 md:text-xl">
              Data-driven vehicle valuations powered by comprehensive UAE market analysis.
              Get accurate pricing, market insights, and confidence-backed recommendations.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild variant="gradient" size="xl" className="group shadow-xl shadow-[rgba(25,184,165,0.22)]">
                <Link to="/valuation">
                  Start Valuation
                  <ArrowRight className="ml-2 h-5 w-5 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="group">
                <Link to="/admin">
                  <BarChart3 className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-16 grid gap-6 md:grid-cols-3"
            variants={stagger}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              { icon: Car, label: 'Vehicles Analyzed', value: isLoading ? '...' : formatNumber(analytics?.overview.totalVehicles ?? 0) },
              { icon: TrendingUp, label: 'Market Value', value: isLoading ? '...' : formatCurrency(analytics?.overview.averageMarketPrice ?? 0) },
              { icon: Shield, label: 'Manufacturers', value: isLoading ? '...' : formatNumber(analytics?.overview.totalMakes ?? 0) },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="interactive-card group border-[#d9e2e8] bg-white/90 p-6 dark:border-[#31545a] dark:bg-[#0c2530]/90"
              >
                <stat.icon className="mb-3 h-8 w-8 text-[#19b8a5] transition-all duration-300 group-hover:scale-110 group-hover:text-[#08766c] dark:group-hover:text-[#8fb6cc]" />
                <p className="text-3xl font-bold text-slate-800 transition-colors duration-300 group-hover:text-[#08766c] dark:text-white dark:group-hover:text-[#19b8a5]">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────── */}
      <section className="border-t border-[#d9e2e8] bg-[#f3f7f7] dark:border-[#31545a] dark:bg-[#061821]">
        <div className="mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20">
          <motion.div className="text-center" {...fadeUp}>
            <h2 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-muted-foreground dark:text-slate-300">
              Get a comprehensive vehicle valuation in three simple steps.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Your Details',
                desc: 'Share your basic contact information so we can deliver your personalized report.',
                icon: Search,
              },
              {
                step: '02',
                title: 'Select Vehicle',
                desc: 'Choose the year, make, model, and specification from our comprehensive database.',
                icon: Car,
              },
              {
                step: '03',
                title: 'Get Valuation',
                desc: 'Receive a detailed valuation with market insights, comparables, and confidence scores.',
                icon: BarChart3,
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                initial="initial"
                whileInView="whileInView"
                viewport={{ once: true }}
                className="interactive-card group border-[#d9e2e8] bg-white/90 p-8 dark:border-[#31545a] dark:bg-[#0c2530]/90"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-4xl font-bold text-[#19b8a5]/25 transition-all duration-300 group-hover:scale-110 group-hover:text-[#19b8a5]/45">
                    {item.step}
                  </span>
                  <item.icon className="h-6 w-6 text-[#19b8a5] transition-all duration-300 group-hover:rotate-[-8deg] group-hover:text-[#08766c] dark:group-hover:text-[#8fb6cc]" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-800 transition-colors duration-300 group-hover:text-[#08766c] dark:text-slate-100 dark:group-hover:text-[#19b8a5]">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────── */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20">
          <motion.div className="text-center" {...fadeUp}>
            <h2 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
              Premium Features
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-muted-foreground dark:text-slate-300">
              Everything you need for intelligent vehicle pricing decisions.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BarChart3, title: 'Market Analytics', desc: 'Comprehensive market analysis with price distributions, trends, and segment breakdowns.' },
              { icon: TrendingUp, title: 'Market Valuations', desc: 'Data-driven market valuations based on actual UAE market listings and vehicle specifications.' },
              { icon: Tag, title: 'Price Range', desc: 'View minimum and maximum market prices for any vehicle specification.' },
              { icon: Gauge, title: 'Detailed Specs', desc: 'Access comprehensive vehicle specifications including engine, transmission, and body type.' },
              { icon: Star, title: 'Market Insights', desc: 'Contextual observations and analysis alongside your vehicle valuation.' },
              { icon: CheckCircle, title: 'Export Ready', desc: 'Export valuations as PDF and download inquiry data as spreadsheets.' },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                initial="initial"
                whileInView="whileInView"
                viewport={{ once: true }}
                className="interactive-card group border-[#d9e2e8] bg-white/90 p-6 dark:border-[#31545a] dark:bg-[#0c2530]/90"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#ecfbf8] text-[#19b8a5] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-[#dff7f4] group-hover:text-[#08766c] dark:bg-[#0f3f43] dark:group-hover:text-[#8fb6cc]">
                  <feature.icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-800 transition-colors duration-300 group-hover:text-[#08766c] dark:text-slate-100 dark:group-hover:text-[#19b8a5]">{feature.title}</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-[#d9e2e8] bg-[#f3f7f7] dark:border-[#31545a] dark:bg-[#061821]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#19b8a5]/8 via-[#8fb6cc]/8 to-[#19b8a5]/8 animate-gradient-shift bg-[length:200%_100%]" />
        <div className="relative mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            {...fadeUp}
          >
            <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
              Ready to Discover Your Vehicle's{' '}
              <span className="shimmer-text">True Value</span>?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground dark:text-slate-300">
              Join thousands of users who trust us for accurate vehicle valuations.
            </p>
            <Button asChild variant="gradient" size="xl" className="group shadow-xl shadow-[rgba(25,184,165,0.22)]">
              <Link to="/valuation">
                Start Your Valuation
                <ArrowRight className="ml-2 h-5 w-5 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </motion.div>
    </>
  );
}
