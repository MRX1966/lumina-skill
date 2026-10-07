import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, CalendarBlank, Certificate, Clock, GraduationCap,
  Prohibit, Trophy,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EnrollmentRow = {
  id: string;
  course_id: string;
  status: string;
  progress: number | null;
  enrolled_at: string | null;
  completed_at: string | null;
};

type CourseRow = {
  id: string;
  title: string;
  duration_hours: number | null;
  total_lessons: number | null;
};

type CertificateRow = {
  id: string;
  course_id: string;
  issued_at: string | null;
  revoked: boolean | null;
};

type CourseHistoryItem = {
  enrollment: EnrollmentRow;
  course: CourseRow | null;
  certificate: CertificateRow | null;
  progress: number;
  status: 'admitted' | 'completed' | 'revoked';
};

type HistoryFilter = 'all' | 'completed' | 'admitted' | 'revoked';

const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

function getHistoryStatus(enrollment: EnrollmentRow): CourseHistoryItem['status'] {
  if (['suspended', 'cancelled', 'refunded'].includes(enrollment.status)) return 'revoked';
  if (enrollment.status === 'completed' || enrollment.completed_at || Number(enrollment.progress ?? 0) >= 100) return 'completed';
  return 'admitted';
}

function formatDate(date: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

const statusPresentation = {
  admitted: {
    label: 'Admitted',
    description: 'Currently active',
    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  completed: {
    label: 'Completed',
    description: 'Successfully completed',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  revoked: {
    label: 'Revoked',
    description: 'Access removed',
    badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
} as const;

export function StudentCourseHistoryPage() {
  const [items, setItems] = useState<CourseHistoryItem[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, course_id, status, progress, enrolled_at, completed_at')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });
        if (enrollmentError) throw enrollmentError;

        const enrollments = (enrollmentData || []) as EnrollmentRow[];
        const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.course_id))];
        if (courseIds.length === 0) {
          setItems([]);
          return;
        }

        const [courseResult, certificateResult] = await Promise.all([
          supabase
            .from('courses')
            .select('id, title, duration_hours, total_lessons')
            .in('id', courseIds),
          supabase
            .from('certificates')
            .select('id, course_id, issued_at, revoked')
            .eq('user_id', user.id)
            .in('course_id', courseIds),
        ]);
        if (courseResult.error) throw courseResult.error;
        if (certificateResult.error) throw certificateResult.error;

        const coursesById = new Map(
          ((courseResult.data || []) as CourseRow[]).map((course) => [course.id, course]),
        );
        const certificatesByCourseId = new Map(
          ((certificateResult.data || []) as CertificateRow[]).map((certificate) => [certificate.course_id, certificate]),
        );

        setItems(enrollments.map((enrollment) => {
          const numericProgress = Number(enrollment.progress ?? 0);
          return {
            enrollment,
            course: coursesById.get(enrollment.course_id) || null,
            certificate: certificatesByCourseId.get(enrollment.course_id) || null,
            progress: Math.max(0, Math.min(100, Math.round(numericProgress))),
            status: getHistoryStatus(enrollment),
          };
        }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load course history');
      } finally {
        setLoading(false);
      }
    }

    void loadHistory();
  }, []);

  const counts = useMemo(() => ({
    all: items.length,
    completed: items.filter((item) => item.status === 'completed').length,
    admitted: items.filter((item) => item.status === 'admitted').length,
    revoked: items.filter((item) => item.status === 'revoked').length,
  }), [items]);

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.status === filter);
  const stats = [
    { label: 'Total Enrolled', value: counts.all, helper: 'All courses', icon: GraduationCap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Completed', value: counts.completed, helper: 'Successfully completed', icon: Trophy, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Ongoing Course', value: counts.admitted, helper: 'Currently active', icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Revoked', value: counts.revoked, helper: 'Access removed', icon: Prohibit, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
  ];

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading course history">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-6">
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Course History</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Review your enrollments and learning progress.</p>
      </motion.header>

      <motion.section variants={itemVariants} aria-label="Course history summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, helper, icon: Icon, color }) => (
          <Card key={label} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}><Icon size={19} /></div>
                <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
              </div>
              <p className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>
              <p className="mt-1 text-xs text-zinc-500">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </motion.section>

      <motion.section variants={itemVariants} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
          <CardHeader className="gap-4 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              All courses
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800">{counts.all}</span>
            </CardTitle>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as HistoryFilter)}>
              <TabsList className="h-9 w-full justify-start overflow-x-auto sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="admitted">Admitted</TabsTrigger>
                <TabsTrigger value="revoked">Revoked</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <BookOpen size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {items.length === 0 ? 'No course history yet' : 'No courses in this category'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {items.length === 0 ? 'Your enrollments will appear here.' : 'Choose another filter to view your courses.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredItems.map((item, index) => {
                  const { enrollment, course, certificate, progress, status } = item;
                  const presentation = statusPresentation[status];
                  const dateLabel = status === 'completed'
                    ? formatDate(enrollment.completed_at) || formatDate(enrollment.enrolled_at)
                    : formatDate(enrollment.enrolled_at);

                  return (
                    <div key={enrollment.id} className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${index % 2 === 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {course?.title?.charAt(0).toUpperCase() || <BookOpen size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {course && status !== 'revoked' ? (
                            <Link
                              to={`/student/courses/${course.id}/lessons`}
                              className="max-w-full truncate text-sm font-medium text-zinc-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400"
                            >
                              {course.title}
                            </Link>
                          ) : course ? (
                            <span className="max-w-full truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">{course.title}</span>
                          ) : (
                            <span className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">Course no longer available</span>
                          )}
                          <Badge className={`text-[10px] ${presentation.badge}`}>{presentation.label}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarBlank size={12} />
                            {status === 'completed' ? 'Completed' : 'Enrolled'} {dateLabel || 'date unavailable'}
                          </span>
                          {course?.total_lessons != null && <span>{course.total_lessons} lessons</span>}
                          {course?.duration_hours != null && <span>{course.duration_hours}h</span>}
                          {certificate && (
                            <span className={`inline-flex items-center gap-1 ${certificate.revoked ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              <Certificate size={12} />
                              {certificate.revoked ? 'Certificate revoked' : `Certificate issued${formatDate(certificate.issued_at) ? ` · ${formatDate(certificate.issued_at)}` : ''}`}
                            </span>
                          )}
                        </div>
                        {status === 'admitted' && (
                          <div className="mt-3 flex max-w-sm items-center gap-2">
                            <Progress value={progress} className="h-1.5" />
                            <span className="shrink-0 text-[11px] font-medium text-zinc-500">{progress}%</span>
                          </div>
                        )}
                      </div>
                      {status !== 'revoked' && course && (
                        <Link
                          to={`/student/courses/${course.id}/lessons`}
                          aria-label={`Open ${course.title}`}
                          className="hidden rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:block"
                        >
                          <ArrowRight size={16} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">Your course milestones will appear here.</p>
            ) : (
              <ol className="space-y-5">
                {items.map(({ enrollment, course, status }) => {
                  const presentation = statusPresentation[status];
                  const startDate = formatDate(enrollment.enrolled_at);
                  const endDate = formatDate(enrollment.completed_at);
                  const detail = status === 'completed'
                    ? `Completed · ${startDate || 'date unavailable'}${endDate ? ` – ${endDate}` : ''}`
                    : status === 'revoked'
                      ? `Access removed · enrolled ${startDate || 'date unavailable'}`
                      : `Admitted · ${startDate || 'date unavailable'} – present`;

                  return (
                    <li key={enrollment.id} className="relative flex gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${presentation.dot}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{course?.title || 'Course no longer available'}</p>
                        <p className="mt-1 text-xs text-zinc-500">{detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}
