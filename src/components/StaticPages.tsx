import { useState } from 'react';
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
  const contactCards = [
    { icon: Envelope, label: 'Direct Email', value: 'hello@lms.com' },
    { icon: Phone, label: 'Phone', value: '+1 (555) 123 4567' },
    { icon: MapPin, label: 'Office', value: '123 Learning Lane, San Francisco, CA 94102' },
    { icon: Envelope, label: 'Support Hours', value: 'Mon-Fri, 8am-6pm PT' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Course Inquiry',
    message: '',
  });
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState('submitting');
    setSubmitMessage('');

    const payload = {
      name: formData.name,
      email: formData.email,
      topic: formData.topic,
      message: formData.message,
      _subject: `Contact Form: ${formData.topic}`,
      _captcha: 'false',
      _template: 'table',
      _replyto: formData.email,
    };

    try {
      const response = await fetch('https://formsubmit.co/ajax/mrxmail26@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let result: unknown;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = null;
      }

      const responseData =
        typeof result === 'object' && result !== null
          ? result as { success?: unknown; message?: unknown; error?: unknown }
          : null;
      const serviceMessage =
        typeof responseData?.message === 'string'
          ? responseData.message
          : typeof responseData?.error === 'string'
            ? responseData.error
            : responseText.trim();

      if (!response.ok) {
        throw new Error(serviceMessage || `Email service returned ${response.status}`);
      }

      if (
        !responseData ||
        (responseData.success !== true && responseData.success !== 'true')
      ) {
        throw new Error(serviceMessage || 'Email service did not accept the submission');
      }

      setFormData({ name: '', email: '', topic: 'Course Inquiry', message: '' });
      setSubmitState('success');
      setSubmitMessage(
        'Your submission was accepted by the email service, but delivery is not confirmed. If this is your first submission, check the inbox and spam folder for mrxmail26@gmail.com for FormSubmit’s activation email and confirm it.',
      );
    } catch {
      setSubmitState('error');
      setSubmitMessage(
        'We could not send your message online. Use the email option below to send it directly.',
      );
    }
  };

  const mailSubject = encodeURIComponent(`Contact Form: ${formData.topic}`);
  const mailBody = encodeURIComponent(
    `Name: ${formData.name}\nEmail: ${formData.email}\nTopic: ${formData.topic}\n\nMessage:\n${formData.message}`,
  );
  const mailtoFallback = `mailto:mrxmail26@gmail.com?subject=${mailSubject}&body=${mailBody}`;

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Get in touch
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
            We would love to hear from{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">you</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
            Questions about a course, a team rollout, or teaching with us? Send a note and a
            real human replies within 24 hours.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Average response time: under 24 hours
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="space-y-4">
            {contactCards.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{value}</p>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-100/80 px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <Envelope size={18} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">Live Helpdesk</p>
                  <p className="text-sm text-slate-600">Chat with support in real time</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  40+ Countries
                </span>
                <span>24/7 support</span>
                <span>Community forum</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.04)] sm:p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Send us a message</h2>
              <p className="mt-2 text-sm text-slate-500">Fields marked with * are required.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-slate-700">Full name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="contact-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    required
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    required
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-topic" className="mb-2 block text-sm font-medium text-slate-700">Topic</label>
                <select
                  id="contact-topic"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option>Course Inquiry</option>
                  <option>Partnership</option>
                  <option>Technical Support</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-slate-700">Message <span className="text-red-500">*</span></label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help..."
                  required
                  minLength={10}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-2 text-xs text-slate-400">Message should be at least 10 characters.</p>
              </div>

              <button
                type="submit"
                disabled={submitState === 'submitting'}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
              >
                <Envelope size={16} />
                {submitState === 'submitting' ? 'Sending...' : 'Send message'}
              </button>

              {submitMessage && (
                <div
                  className={`text-sm ${submitState === 'success' ? 'text-emerald-600' : 'text-slate-600'}`}
                  role="status"
                >
                  <p>{submitMessage}</p>
                  {submitState === 'error' && (
                    <p className="mt-2">
                      You can also{' '}
                      <a className="font-semibold text-emerald-700 underline" href={mailtoFallback}>
                        open this message in your email app
                      </a>
                      .
                    </p>
                  )}
                </div>
              )}
            </form>
          </div>
        </motion.div>
      </div>
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