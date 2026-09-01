import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, ArrowRight, PlayCircle, BookOpen, Certificate, Trophy, Check,
  GraduationCap, Spinner, FolderSimple, ArrowClockwise,
} from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

type EnrollmentRow = {
  id: string;
  course_id: string;
  status: string;
  progress: number | null;
  enrolled_at: string | null;
  completed_at: string | null;
  payment_id: string | null;
};

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  duration_hours: number | null;
  total_lessons: number | null;
  total_modules: number | null;
};

type DashboardCourse = {
  enrollment: EnrollmentRow;
  course: CourseRow | null;
  progressPct: number;
  lessonCount: number;
};

export function StudentDashboard() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ enrolled: 0, inProgress: 0, completed: 0, hours: 0 });

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: enrollData, error: enrollError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });

        if (enrollError) throw enrollError;
        const enrollments = (enrollData || []) as EnrollmentRow[];

        // Enrich with course details in parallel
        const enriched = await Promise.all(
          enrollments.map(async (enrollment) => {
            const { data: courseData } = await supabase
              .from('courses')
              .select('*')
              .eq('id', enrollment.course_id)
              .single();
            const course = (courseData as CourseRow | undefined) || null;
            const progressPct = Math.round(Number(enrollment.progress || 0));
            return { enrollment, course, progressPct, lessonCount: course?.total_lessons || 0 };
          }),
        );

        setCourses(enriched);

        const active = enriched.filter((c) => c.enrollment.status === 'active');
        const completedEnrollments = enriched.filter((c) => c.enrollment.status === 'completed');
        const inProgress = active.filter((c) => c.progressPct > 0 && c.progressPct < 100);
        const totalHours = active.reduce((sum, c) => sum + (c.course?.duration_hours || 0), 0);

        setStats({
          enrolled: active.length,
          inProgress: inProgress.length,
          completed: completedEnrollments.length,
          hours: totalHours,
        });
      } catch (err: any) {
        toast.error(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCourses = courses.filter((c) => c.enrollment.status === 'active');
  const completedCourses = courses.filter((c) => c.enrollment.status === 'completed');

  const quickStats = [
    { label: 'Enrolled Courses', value: stats.enrolled, icon: GraduationCap, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'In Progress', value: stats.inProgress, icon: ArrowClockwise, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Completed', value: stats.completed, icon: Trophy, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Learning Hours', value: stats.hours, icon: Clock, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
  ];

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: 'easeOut' as const }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Track your learning and jump back into your courses.</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.tint}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-500 truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Learning */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My Courses</h2>
          <Link to={ROUTES.studentCourses} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {activeCourses.length === 0 ? (
          <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
            <CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-zinc-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No enrolled courses yet</h3>
              <p className="text-sm text-zinc-500 mb-6">Browse the catalog and start your first course today.</p>
              <Link to={ROUTES.courses}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  Browse Courses <ArrowRight size={16} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCourses.map((item, index) => {
              const { course, enrollment, progressPct } = item;
              if (!course) return null;
              return (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, ease: 'easeOut' as const }}
                >
                  <Card className="border-zinc-200 dark:border-zinc-800 h-full overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow">
                    <Link to={`/student/courses/${course.id}/lessons`}>
                      <div className="flex">
                        <div className="w-28 h-28 shrink-0 bg-zinc-100 dark:bg-zinc-800 relative">
                          {course.image ? (
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PlayCircle size={28} className="text-zinc-300" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-2 mb-1">
                            {course.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-zinc-400 mb-4">
                            <span className="flex items-center gap-1"><PlayCircle size={12} />{course.total_lessons || 0} lessons</span>
                            <span className="flex items-center gap-1"><Clock size={12} />{course.duration_hours || 0}h</span>
                          </div>
                          {progressPct > 0 ? (
                            <div className="flex items-center gap-2">
                              <Progress value={progressPct} className="h-1.5" />
                              <span className="text-xs font-medium text-zinc-500 shrink-0">{progressPct}%</span>
                            </div>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">
                              Start Learning
                            </Badge>
                          )}
                        </CardContent>
                      </div>
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Completed</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedCourses.map((item) => {
              const { course, enrollment } = item;
              if (!course) return null;
              return (
                <Card key={enrollment.id} className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <Certificate size={24} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{course.title}</p>
                      <p className="text-xs flex items-center gap-1 text-emerald-600 mt-1">
                        <Check size={12} weight="bold" /> Completed {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-emerald-600">View</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </motion.div>
  );
}

export function StudentCoursesPage() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: enrollData, error: enrollError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });
        if (enrollError) throw enrollError;

        const enrollments = (enrollData || []) as EnrollmentRow[];
        const enriched = await Promise.all(
          enrollments.map(async (enrollment) => {
            const { data: courseData } = await supabase
              .from('courses')
              .select('*')
              .eq('id', enrollment.course_id)
              .single();
            const course = (courseData as CourseRow | undefined) || null;
            return {
              enrollment,
              course,
              progressPct: Math.round(Number(enrollment.progress || 0)),
              lessonCount: course?.total_lessons || 0,
            };
          }),
        );
        setCourses(enriched);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = courses.filter((c) => {
    if (filter === 'active') return c.enrollment.status === 'active';
    if (filter === 'completed') return c.enrollment.status === 'completed';
    return true;
  });

  const tabs = [
    { key: 'all' as const, label: 'All Courses', count: courses.length },
    { key: 'active' as const, label: 'In Progress', count: courses.filter((c) => c.enrollment.status === 'active').length },
    { key: 'completed' as const, label: 'Completed', count: courses.filter((c) => c.enrollment.status === 'completed').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">My Courses</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">All courses you have purchased or been enrolled in.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <FolderSimple size={24} className="text-zinc-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No courses here</h3>
            <p className="text-sm text-zinc-500 mb-6">
              {filter === 'all' ? 'Browse the catalog and enroll in your first course.' : 'Nothing matches this filter.'}
            </p>
            <Link to={ROUTES.courses}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                Browse Courses <ArrowRight size={16} />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item, index) => {
            const { course, enrollment, progressPct } = item;
            if (!course) return null;
            const isCompleted = enrollment.status === 'completed';
            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, ease: 'easeOut' as const }}
              >
                <Card className="border-zinc-200 dark:border-zinc-800 h-full overflow-hidden hover:shadow-lg hover:shadow-emerald-900/5 transition-shadow">
                  <Link to={`/student/courses/${course.id}/lessons`}>
                    <div className="flex">
                      <div className="w-28 h-28 shrink-0 bg-zinc-100 dark:bg-zinc-800 relative">
                        {course.image ? (
                          <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PlayCircle size={28} className="text-zinc-300" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-white line-clamp-2 mb-1">{course.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
                          <span className="flex items-center gap-1"><PlayCircle size={12} />{course.total_lessons || 0} lessons</span>
                          <span className="flex items-center gap-1"><Clock size={12} />{course.duration_hours || 0}h</span>
                        </div>
                        <Badge
                          className={
                            isCompleted
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0 text-xs'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs'
                          }
                        >
                          {isCompleted ? 'Completed' : progressPct > 0 ? `${progressPct}% complete` : 'Start Learning'}
                        </Badge>
                      </CardContent>
                    </div>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}