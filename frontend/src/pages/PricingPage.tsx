import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Sparkles,
  Shield,
  ArrowRight,
  Star,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const PricingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleSelectPlan = (planName: string) => {
    addToast(
      'info',
      `${planName} Plan Selected`,
      planName === 'Free Starter'
        ? 'You are already enjoying the Starter Plan! Start practicing now.'
        : 'Payment gateway integration will launch soon. Thank you for your interest!'
    );
  };

  const plans = [
    {
      name: 'Free Starter',
      badge: 'Getting Started',
      description: 'Essential mock interviews for students and early-career engineers.',
      price: { monthly: 0, annual: 0 },
      popular: false,
      ctaText: isAuthenticated ? 'Current Plan' : 'Get Started Free',
      ctaVariant: 'outline' as const,
      features: [
        '3 Technical mock interviews / month',
        'Standard AI feedback and rubric breakdown',
        'Basic PDF resume skill extraction',
        'Access to Frontend & Full-Stack tracks',
        'Standard response generation latency',
        'Community discussion access',
      ],
      notIncluded: [
        'HR & Behavioral round simulations',
        'Voice audio low-latency interviewer',
        'Deep concept gap & code reviews',
        'Shareable FAANG hiring verdict reports',
      ],
    },
    {
      name: 'Pro Candidate',
      badge: 'Most Popular',
      description: 'Full interview mastery for engineers preparing for Senior, Staff & FAANG roles.',
      price: { monthly: 799, annual: 599 },
      popular: true,
      ctaText: 'Upgrade to Pro',
      ctaVariant: 'primary' as const,
      features: [
        'Unlimited Technical & System Design interviews',
        'Full HR & Behavioral interview rounds',
        'Ultra low-latency Voice AI speech synthesis',
        'Deep skill gap & architecture coaching',
        'FAANG benchmark score comparisons',
        'Executive PDF evaluation report exports',
        'Global leaderboard ranking & verification',
        'Priority model allocation (Gemini 2.5 & Groq Llama)',
      ],
      notIncluded: [],
    },
    {
      name: 'Campus & Bootcamp',
      badge: 'Teams & Universities',
      description: 'Dedicated assessment cohorts, custom question sets, and hiring analytics.',
      price: { monthly: 3999, annual: 2999 },
      popular: false,
      ctaText: 'Contact Enterprise',
      ctaVariant: 'secondary' as const,
      features: [
        'Everything in Pro Candidate for up to 25 seats',
        'Custom institutional interview tracks & rubrics',
        'Recruiter & instructor cohort analytics dashboard',
        'Bulk resume upload & ATS matching radar',
        'API access for LMS integrations',
        'Dedicated account manager & SLA guarantee',
      ],
      notIncluded: [],
    },
  ];

  const comparisonFeatures = [
    { feature: 'Technical Rounds (Frontend, Backend, ML)', free: '3 / mo', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'HR & Behavioral Practice (STAR method)', free: false, pro: true, enterprise: true },
    { feature: 'Live Voice AI Audio Interviewer', free: false, pro: true, enterprise: true },
    { feature: 'Resume PDF Skill Extraction', free: 'Basic', pro: 'Deep Semantic', enterprise: 'Deep Semantic + ATS' },
    { feature: 'Question Difficulty Adaptation', free: 'Standard', pro: 'Real-Time Adaptive', enterprise: 'Real-Time Adaptive' },
    { feature: 'Executive PDF Report Downloads', free: false, pro: true, enterprise: true },
    { feature: 'Global Verified Leaderboard', free: 'View Only', pro: 'Full Access', enterprise: 'Cohort Analytics' },
    { feature: 'Response Latency Guarantee', free: 'Standard', pro: '< 1.5s Ultra-fast', enterprise: 'Priority Dedicated' },
  ];

  const pricingFaqs = [
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Yes, absolutely. You can upgrade, downgrade, or cancel your subscription at any time directly from your Platform Settings page without cancellation fees.',
    },
    {
      q: 'How does the Voice AI interview experience work?',
      a: 'Mockora uses browser Web Audio APIs and streaming inference to ask oral interview questions in a natural conversational cadence. You can reply using your microphone or keyboard.',
    },
    {
      q: 'What is the STAR method behavioral evaluation?',
      a: 'Our HR round evaluates behavioral responses against the Situation, Task, Action, and Result (STAR) framework commonly used by Amazon, Meta, and Google hiring committees.',
    },
    {
      q: 'Are my resume and interview answers private?',
      a: 'Yes. We enforce strict zero-training policies with our AI inference providers, and all personal identifiers (email, phone number) are masked before processing.',
    },
  ];

  return (
    <PageWrapper className="py-10 space-y-12 max-w-6xl">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Transparent, Candidate-First Pricing
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
        >
          Invest in Your Next Tech Offer
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
        >
          Practice realistic technical, system design, and behavioral loops with adaptive AI.
          Land top-tier engineering roles with confidence.
        </motion.p>

        {/* Monthly / Annual Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-4 flex items-center justify-center gap-3"
        >
          <span className={`text-xs sm:text-sm font-semibold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Monthly Billing
          </span>

          <button
            type="button"
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-800 p-1 transition-colors focus:outline-none"
            aria-label="Toggle billing cycle"
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`w-5 h-5 rounded-full bg-brand-600 shadow-md ${
                billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>

          <span className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            Annual Billing
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
              Save 25%
            </span>
          </span>
        </motion.div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch pt-4">
        {plans.map((plan) => {
          const currentPrice = billingCycle === 'annual' ? plan.price.annual : plan.price.monthly;

          return (
            <Card
              key={plan.name}
              className={`relative p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 ${
                plan.popular
                  ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10 dark:shadow-glow-primary'
                  : 'border border-slate-200 dark:border-border-dark'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-brand-600 text-white shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {plan.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    {!plan.popular && (
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="border-y border-slate-100 dark:border-white/5 py-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      {currentPrice === 0 ? 'Free' : `₹${currentPrice}`}
                    </span>
                    {currentPrice > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        / month {billingCycle === 'annual' && '(billed annually)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Included with this plan:
                  </span>
                  <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-slate-400 dark:text-slate-600 line-through">
                        <span className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0 mt-0.5 text-center">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA Action */}
              <div className="pt-8 mt-auto">
                <Button
                  variant={plan.ctaVariant}
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 ${
                    plan.popular ? 'shadow-lg shadow-brand-500/25' : ''
                  }`}
                >
                  {plan.ctaText}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="pt-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Plan Feature Comparison
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Compare capabilities across tiers to find the perfect fit for your preparation timeline.
          </p>
        </div>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-border-dark bg-slate-50/50 dark:bg-surface-dark-elevated/40">
                <th className="p-4 font-bold text-slate-900 dark:text-slate-100">Capability</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Free Starter</th>
                <th className="p-4 font-bold text-brand-600 dark:text-brand-400">Pro Candidate</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Bootcamp / Teams</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {comparisonFeatures.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                    {row.feature}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">
                    {typeof row.free === 'boolean' ? (
                      row.free ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      row.free
                    )}
                  </td>
                  <td className="p-4 font-semibold text-brand-600 dark:text-brand-400">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      row.pro
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">
                    {typeof row.enterprise === 'boolean' ? (
                      row.enterprise ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-slate-300 dark:text-slate-600">—</span>
                    ) : (
                      row.enterprise
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Frequently Asked Questions */}
      <div className="pt-8 space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Everything you need to know about subscriptions, billing, and interview tokens.
          </p>
        </div>

        <div className="space-y-3">
          {pricingFaqs.map((faq, index) => (
            <Card
              key={faq.q}
              className="p-4 sm:p-5 cursor-pointer transition-colors"
              onClick={() => setActiveFaq(activeFaq === index ? null : index)}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {faq.q}
                </h4>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    activeFaq === index ? 'rotate-180 text-brand-500' : ''
                  }`}
                />
              </div>

              {activeFaq === index && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Trust & Guarantee Callout */}
      <Card className="p-8 text-center bg-gradient-to-r from-brand-50/40 via-surface-light-card to-indigo-50/40 dark:from-brand-950/20 dark:via-surface-dark-card dark:to-indigo-950/20 border-brand-200/60 dark:border-brand-900/40 space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/25">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          7-Day Money-Back Guarantee
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          If you don&apos;t feel noticeably more confident in your technical communication and system design
          reasoning within 7 days, email our support team for a full refund.
        </p>
        <div className="pt-2">
          <Link to={isAuthenticated ? '/roles' : '/signup'}>
            <Button variant="primary" className="px-6 py-2.5 font-bold rounded-xl text-xs sm:text-sm">
              Start Practicing Risk-Free
            </Button>
          </Link>
        </div>
      </Card>
    </PageWrapper>
  );
};
