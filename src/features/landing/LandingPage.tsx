import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Badge, LoadingScreen } from '@components/ui';
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
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <LoadingScreen
        message="Loading vehicle data..."
        onExited={() => setShowSplash(false)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ─── Hero Section ─────────────────────────── */}
      <section className="relative bg-grid-glow">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl animate-float" />

        <div className="relative mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20 md:py-32">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 animate-bounce-gentle px-4 py-1.5 text-sm">
              <Zap className="mr-1 h-3.5 w-3.5 text-accent" />
              UAE Vehicle Pricing Intelligence
            </Badge>

            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Know the{' '}
              <span className="shimmer-text">True Value</span>
              <br />
              of Any Vehicle
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Data-driven vehicle valuations powered by comprehensive UAE market analysis.
              Get accurate pricing, market insights, and confidence-backed recommendations.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild variant="gradient" size="xl" className="group shadow-xl shadow-primary/20">
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
                className="interactive-card group bg-card/50 p-6 backdrop-blur-sm"
              >
                <stat.icon className="mb-3 h-8 w-8 text-primary transition-all duration-300 group-hover:scale-110 group-hover:text-accent" />
                <p className="text-3xl font-bold transition-colors duration-300 group-hover:text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────── */}
      <section className="border-t bg-card/30">
        <div className="mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20">
          <motion.div className="text-center" {...fadeUp}>
            <h2 className="mb-2 text-3xl font-bold md:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-muted-foreground">
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
                className="interactive-card group p-8"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-4xl font-bold text-primary/20 transition-all duration-300 group-hover:text-accent/40 group-hover:scale-110">
                    {item.step}
                  </span>
                  <item.icon className="h-6 w-6 text-primary transition-all duration-300 group-hover:text-accent group-hover:rotate-[-8deg]" />
                </div>
                <h3 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────── */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20">
          <motion.div className="text-center" {...fadeUp}>
            <h2 className="mb-2 text-3xl font-bold md:text-4xl">
              Premium Features
            </h2>
            <p className="mx-auto mb-12 max-w-xl text-muted-foreground">
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
                className="interactive-card group p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-300 group-hover:bg-accent/20 group-hover:text-accent group-hover:scale-110 group-hover:rotate-3">
                  <feature.icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h3 className="mb-2 text-lg font-semibold transition-colors duration-300 group-hover:text-primary">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className="relative border-t bg-card/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-gradient-shift bg-[length:200%_100%]" />
        <div className="relative mx-auto w-full max-w-[1536px] min-[2560px]:max-w-[90%] px-4 py-20">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            {...fadeUp}
          >
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Ready to Discover Your Vehicle's{' '}
              <span className="shimmer-text">True Value</span>?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of users who trust us for accurate vehicle valuations.
            </p>
            <Button asChild variant="gradient" size="xl" className="group shadow-xl shadow-primary/20">
              <Link to="/valuation">
                Start Your Valuation
                <ArrowRight className="ml-2 h-5 w-5 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
