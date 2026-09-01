import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Envelope, Phone, MapPin, Barricade } from '@phosphor-icons/react';
import { BRAND_NAME } from '../constants';

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">About {BRAND_NAME}</h1>
        <p className="text-lg text-slate-500 mb-8">Empowering learners worldwide with high-quality education.</p>
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{BRAND_NAME} is a modern learning platform built for the digital age. We believe that quality education should be accessible to everyone, regardless of their location or background.</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">Our courses are designed by industry experts and cover the most in-demand skills in technology, design, business, and more. With hands-on projects, interactive quizzes, and personalized learning paths, we ensure every student reaches their full potential.</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Join over 20,000 learners who have transformed their careers with {BRAND_NAME}.</p>
        </div>
      </motion.div>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Contact Us</h1>
        <p className="text-lg text-slate-500 mb-8">Have a question? We would love to hear from you.</p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"><Envelope size={20} /></div>
              <div><h3 className="font-medium text-slate-900 dark:text-white">Email</h3><p className="text-sm text-slate-500">hello@nennethub.com</p></div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"><Phone size={20} /></div>
              <div><h3 className="font-medium text-slate-900 dark:text-white">Phone</h3><p className="text-sm text-slate-500">+1 (555) 123-4567</p></div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"><MapPin size={20} /></div>
              <div><h3 className="font-medium text-slate-900 dark:text-white">Office</h3><p className="text-sm text-slate-500">123 Learning Lane, San Francisco, CA 94102</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="space-y-3">
              <input placeholder="Your Name" className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
              <input placeholder="Your Email" className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
              <textarea placeholder="Your Message" rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white resize-none" />
              <button className="w-full h-11 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98]">Send Message</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="text-center">
        <Barricade size={72} className="mx-auto text-slate-300 mb-4" />
        <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <p className="text-lg text-slate-500 mb-8">Page not found. The page you are looking for doesn't exist.</p>
        <Link to="/" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700">Go Home</Link>
      </div>
    </div>
  );
}

export { AboutPage, ContactPage, NotFoundPage };