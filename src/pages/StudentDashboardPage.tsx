import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, ArrowRight, PlayCircle, BookOpen, Certificate, Trophy, Check,
  ArrowClockwise, ClipboardText, Exam, XCircle, TrendUp, ShieldCheck,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

type EnrollmentRow = { id: string; course_id: string; status?: string; progress: number | null; enrolled_at: string | null; completed_at: string | null };
type CourseRow = { id: string; title: string; slug: string; image: string | null; duration_hours: number | null; total_lessons: number | null; total_modules: number | null };
type DashboardCourse = { enrollment: EnrollmentRow; course: CourseRow | null; progressPct: number; lessonCount: number };
type AssignmentItem = { id: string; title: string; due_date: string | null; status: string; lesson_title: string };
type QuizResultItem = { id: string; score: number | null; total_questions: number | null; passed: boolean | null; created_at: string | null; lesson_title: string };
type ProfileStatsRow = { full_name: string | null; email: string | null; phone: string | null };
type CertificateStatsRow = { revoked: boolean | null };

const itemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } } };

function getEnrollmentProgress(enrollment: EnrollmentRow) {
  if (enrollment.status === 'completed' || enrollment.completed_at) return 100;
  return Math.max(0, Math.min(100, Number(enrollment.progress ?? 0)));
}

export function StudentDashboard() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState({ enrolled: 0, certificates: 0, progress: 0, profileCompletion: 0 });
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResultItem[]>([]);
  const [lastVisitedCourse, setLastVisitedCourse] = useState<DashboardCourse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) setLoadError('Your session could not be verified. Please sign in again.');
          return;
        }

        const [enrollmentResult, catalogResult, certificateResult, profileResult] = await Promise.all([
          supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', user.id)
            .order('enrolled_at', { ascending: false }),
          supabase
            .from('courses')
            .select('id, title, slug, image, duration_hours, total_lessons, total_modules')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(6),
          supabase
            .from('certificates')
            .select('revoked')
            .eq('user_id', user.id),
          supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);
        if (enrollmentResult.error) throw enrollmentResult.error;
        if (catalogResult.error) {
          toast.error(`Failed to load course recommendations: ${catalogResult.error.message}`);
        }
        if (certificateResult.error) toast.error(`Failed to load certificates: ${certificateResult.error.message}`);
        if (profileResult.error) toast.error(`Failed to load profile summary: ${profileResult.error.message}`);
        const enrollments = (enrollmentResult.data || []) as EnrollmentRow[];

        const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.course_id))];
        const { data: courseData, error: courseError } = courseIds.length
          ? await supabase
              .from('courses')
              .select('id, title, slug, image, duration_hours, total_lessons, total_modules')
              .in('id', courseIds)
          : { data: [], error: null };
        if (courseError) throw courseError;
        if (!active) return;
        if (!catalogResult.error) {
          const enrolledCourseIds = new Set(courseIds);
          setRecommendedCourses(((catalogResult.data || []) as CourseRow[])
            .filter((course) => !enrolledCourseIds.has(course.id))
            .slice(0, 3));
        }

        const availableEnrollments = enrollments.filter((enrollment) => !['suspended', 'cancelled', 'refunded'].includes(enrollment.status || ''));
        const averageProgress = availableEnrollments.length
          ? Math.round(availableEnrollments.reduce((sum, enrollment) => sum + getEnrollmentProgress(enrollment), 0) / availableEnrollments.length)
          : 0;
        const profile = profileResult.data as ProfileStatsRow | null;
        const profileFields = [profile?.full_name, profile?.email, profile?.phone];
        const profileCompletion = Math.round((profileFields.filter((value) => Boolean(value?.trim())).length / profileFields.length) * 100);
        const certificates = certificateResult.error
          ? 0
          : ((certificateResult.data || []) as CertificateStatsRow[]).filter((certificate) => !certificate.revoked).length;
        setStats({
          enrolled: availableEnrollments.length,
          certificates,
          progress: averageProgress,
          profileCompletion,
        });

        const courseById = new Map(
          ((courseData || []) as CourseRow[]).map((course) => [course.id, course]),
        );
        const enriched = enrollments.map((enrollment) => {
          const course = courseById.get(enrollment.course_id) || null;
          const progressPct = Math.round(getEnrollmentProgress(enrollment));
          return { enrollment, course, progressPct, lessonCount: course?.total_lessons || 0 };
        });

        setCourses(enriched);

        const isEnrollmentCompleted = (item: EnrollmentRow) => item.status === 'completed' || Boolean(item.completed_at) || Number(item.progress ?? 0) >= 100;
        const isAccessRevoked = (item: EnrollmentRow) => ['suspended', 'cancelled', 'refunded'].includes(item.status);
        const availableCourses = enriched.filter((item) => !isAccessRevoked(item.enrollment));
        const activeCourses = availableCourses.filter((item) => !isEnrollmentCompleted(item.enrollment));
        const sortedByProgress = [...activeCourses].sort((a, b) => b.progressPct - a.progressPct);
        setLastVisitedCourse(sortedByProgress[0] || null);

        const [assignmentResult, quizResult] = await Promise.all([
          courseIds.length
            ? supabase.from('assignments').select('id, title, due_date, module_id').in('course_id', courseIds).order('due_date', { ascending: true }).limit(5)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('quiz_attempts').select('*, quizzes:quiz_id(title, passing_score)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(5),
        ]);
        if (!active) return;
        if (assignmentResult.error) toast.error(`Failed to load assignments: ${assignmentResult.error.message}`);
        if (quizResult.error) toast.error(`Failed to load quiz results: ${quizResult.error.message}`);
        const { data: assignData } = assignmentResult;
        const { data: quizData } = quizResult;

        const nextAssignments = assignData
          ? (assignData as { id: string; title: string; due_date: string | null; module_id: string | null }[])
              .map((assignment) => ({
                id: assignment.id,
                title: assignment.title,
                due_date: assignment.due_date,
                status: 'pending',
                lesson_title: assignment.module_id ? 'Course Assignment' : 'Assignment',
              }))
          : [];
        setAssignments(nextAssignments);

        const nextQuizResults = quizData
          ? (quizData as {
              id: string;
              score: number | null;
              total_points: number | null;
              passed: boolean | null;
              completed_at: string | null;
              started_at: string | null;
              quizzes: { title: string } | null;
            }[]).map((result) => ({
              id: result.id,
              score: result.score,
              total_questions: result.total_points,
              passed: result.passed,
              created_at: result.completed_at || result.started_at,
              lesson_title: result.quizzes?.title || 'Quiz',
            }))
          : [];
        setQuizResults(nextQuizResults);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        setLoadError(message);
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [reloadKey]);

  const isEnrollmentCompleted = (enrollment: EnrollmentRow) => enrollment.status === 'completed' || Boolean(enrollment.completed_at) || Number(enrollment.progress ?? 0) >= 100;
  const isAccessRevoked = (enrollment: EnrollmentRow) => ['suspended', 'cancelled', 'refunded'].includes(enrollment.status || '');
  const activeCourses = courses.filter((course) => !isAccessRevoked(course.enrollment) && !isEnrollmentCompleted(course.enrollment));
  const completedCourses = courses.filter((course) => !isAccessRevoked(course.enrollment) && isEnrollmentCompleted(course.enrollment));

  const quickStats = [
    { label: 'Courses enrolled', value: stats.enrolled, icon: BookOpen, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Certificates', value: stats.certificates, icon: Certificate, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Progress', value: `${stats.progress}%`, icon: TrendUp, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Profile complete', value: `${stats.profileCompletion}%`, icon: ShieldCheck, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  ];

  const getGreeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-8">
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{getGreeting()}!</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Track your learning and jump back into your courses.</p>
      </motion.div>

      {loadError && (
        <motion.div variants={itemVariants} role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>We couldn’t load your learning data: {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </motion.div>
      )}
      {loading && !loadError && (
        <motion.p variants={itemVariants} role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          Syncing your learning data…
        </motion.p>
      )}

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.tint}`}><Icon size={20} /></div>
                <div className="min-w-0"><p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p><p className="text-xs text-zinc-500 truncate">{stat.label}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Continue Learning Hero */}
      {lastVisitedCourse && lastVisitedCourse.course && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4"><ArrowClockwise size={18} className="text-emerald-600" /><h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Continue Learning</h2></div>
          <Link to={`/student/courses/${lastVisitedCourse.course.id}/lessons`}>
            <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow cursor-pointer">
              <CardContent className="p-6 flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                  {lastVisitedCourse.course.image ? <img src={lastVisitedCourse.course.image} alt={lastVisitedCourse.course.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle size={28} className="text-zinc-300" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-zinc-900 dark:text-white mb-1 truncate">{lastVisitedCourse.course.title}</h3>
                  <p className="text-sm text-zinc-500 mb-3">Resume where you left off</p>
                  <div className="flex items-center gap-3">
                    <Progress value={lastVisitedCourse.progressPct} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 shrink-0">{lastVisitedCourse.progressPct}%</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-zinc-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}

      {/* New Courses */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">New Courses</h2>
          <Link to={ROUTES.courses} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">Explore catalog <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedCourses.length === 0 ? (
            <Card className="col-span-full border-dashed border-zinc-300 dark:border-zinc-700">
              <CardContent className="p-6 text-center text-sm text-zinc-500">
                No new courses to recommend right now. <Link to={ROUTES.courses} className="font-medium text-emerald-600 hover:text-emerald-700">Browse the catalog</Link>
              </CardContent>
            </Card>
          ) : recommendedCourses.map((course) => (
            <Card key={course.id} className="border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 overflow-hidden">
                {course.image ? <img src={course.image} alt={course.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800"><BookOpen size={28} className="text-zinc-400" /></div>}
              </div>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">Available course</p>
                <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-white">{course.title}</h3>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>{course.total_lessons || 0} lessons</span>
                  <span>{course.duration_hours || 0}h</span>
                </div>
                <Link to={`/courses/${course.slug}`} className="block">
                  <Button variant="outline" className="mt-4 w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">Explore course</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Active Courses */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My Courses</h2><Link to={ROUTES.studentCourses} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">View all <ArrowRight size={14} /></Link></div>
        {activeCourses.length === 0 ? (
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4"><BookOpen size={24} className="text-zinc-400" /></div>
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No enrolled courses yet</h3>
            <p className="text-sm text-zinc-500 mb-6">Browse the catalog and start your first course today.</p>
            <Link to={ROUTES.courses}><Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Browse Courses <ArrowRight size={16} /></Button></Link>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCourses.map((item) => {
              const { course, enrollment, progressPct } = item;
              return (
                <motion.div key={enrollment.id} variants={itemVariants}>
                  <Link to={`/student/courses/${enrollment.course_id}/lessons`}>
                    <Card className="border-zinc-200 dark:border-zinc-800 h-full overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow">
                      <div className="flex">
                        <div className="w-28 h-28 shrink-0 bg-zinc-100 dark:bg-zinc-800 relative">
                          {course?.image ? <img src={course.image} alt={course.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><PlayCircle size={28} className="text-zinc-300" /></div>}
                        </div>
                        <CardContent className="p-4 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-2 mb-1">{course?.title || 'Course details unavailable'}</h3>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-4"><span className="flex items-center gap-1"><PlayCircle size={12} />{course?.total_lessons || 0} lessons</span><span className="flex items-center gap-1"><Clock size={12} />{course?.duration_hours || 0}h</span></div>
                          {progressPct > 0 ? <div className="flex items-center gap-2"><Progress value={progressPct} className="h-1.5" /><span className="text-xs font-medium text-zinc-500 shrink-0">{progressPct}%</span></div> : <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">Start Learning</Badge>}
                          {!course && <p className="text-xs text-amber-600 dark:text-amber-400">Your enrollment is saved, but course details are currently unavailable.</p>}
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Assignments & Quiz Results */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ClipboardText size={16} className="text-amber-600" />Upcoming Assignments</CardTitle></CardHeader>
          <CardContent>
            {assignments.length === 0 ? <p className="text-sm text-zinc-500 text-center py-4">No upcoming assignments.</p> : (
              <div className="space-y-3">{assignments.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.status === 'submitted' ? 'bg-emerald-500' : a.status === 'graded' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{a.title}</p><p className="text-xs text-zinc-500">{a.lesson_title}</p></div>
                  <span className="text-xs text-zinc-400 shrink-0">{a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No deadline'}</span>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Exam size={16} className="text-blue-600" />Recent Quiz Results</CardTitle></CardHeader>
          <CardContent>
            {quizResults.length === 0 ? <p className="text-sm text-zinc-500 text-center py-4">No quiz results yet.</p> : (
              <div className="space-y-3">{quizResults.slice(0, 4).map((q) => (
                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${q.passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>{q.passed ? <Check size={14} weight="bold" /> : <XCircle size={14} weight="bold" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{q.lesson_title}</p><p className="text-xs text-zinc-500">{q.score !== null && q.total_questions !== null ? `${Math.round((q.score / q.total_questions) * 100)}% (${q.score}/${q.total_questions})` : 'No score yet'}</p></div>
                  <span className="text-xs text-zinc-400 shrink-0">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</span>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4"><Trophy size={18} className="text-emerald-600" /><h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Completed</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedCourses.map((item) => {
              const { course, enrollment } = item;
              return (
                <Card key={enrollment.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0"><Certificate size={24} className="text-emerald-600" /></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{course?.title || 'Course details unavailable'}</p><p className="text-xs flex items-center gap-1 text-emerald-600 mt-1"><Check size={12} weight="bold" />Completed {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : ''}</p></div>
                    <Button size="sm" variant="ghost" className="text-emerald-600">View</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export { StudentCoursesPage } from './StudentPages';