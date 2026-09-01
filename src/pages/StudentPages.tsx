import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Clock, ArrowRight, PlayCircle, Check, ArrowLeft, Trophy, Certificate, FilePdf, Download, Pause, Play, ListDashes, CheckCircle, Spinner, Lock, FileText, Image as ImageIcon, XCircle } from '@phosphor-icons/react';
import { ROUTES } from '@/constants/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl, checkEnrollmentAccess } from '@/services/storageService';
import { useState, useEffect, useRef, useCallback } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

// ─── Types from DB ───────────────────────────────────────────────────
type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  type: string;
  content: string | null;
  video_url: string | null;
  is_free_preview: boolean | null;
  sort_order: number | null;
};

type ModuleRow = {
  id: string;
  title: string;
  lessons: LessonRow[];
};

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  total_lessons: number | null;
  total_modules: number | null;
  instructors?: { name: string }[];
};

type EnrollmentRow = {
  id: string;
  course_id: string;
  completed_at: string | null;
  progress: number | null;
  status: string;
};

type LessonProgressRow = {
  id: string;
  lesson_id: string;
  completed: boolean | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
  last_position_seconds: number | null;
  started_at: string | null;
};

// ─── Student Dashboard ───────────────────────────────────────────────
export function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: enrollData }, { data: courseData }] = await Promise.all([
          supabase.from('enrollments').select('*').eq('user_id', user.id),
          supabase.from('courses').select('id, title, slug, total_lessons, total_modules').in('status', ['published']),
        ]);

        setEnrollments(enrollData || []);
        setCourses(courseData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const inProgress = enrollments.filter((e) => (e.progress || 0) < 100);
  const completed = enrollments.filter((e) => e.completed_at);

  const stats = [
    { icon: BookOpen, label: 'Enrolled Courses', value: enrollments.length, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { icon: PlayCircle, label: 'In Progress', value: inProgress.length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { icon: Trophy, label: 'Completed', value: completed.length, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: Certificate, label: 'Certificates', value: 0, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Student Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Track your learning progress and achievements</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">In Progress</h2>
              <Link to={ROUTES.studentCourses} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {inProgress.length === 0 ? (
                <Card className="border-zinc-200 dark:border-zinc-800">
                  <CardContent className="p-6 text-center">
                    <BookOpen size={32} className="mx-auto text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-500">No courses in progress. Enroll in one to get started!</p>
                    <Link to={ROUTES.courses}><Button variant="outline" size="sm" className="mt-3">Browse Courses</Button></Link>
                  </CardContent>
                </Card>
              ) : (
                inProgress.map((enrollment) => {
                  const course = courses.find((c) => c.id === enrollment.course_id);
                  if (!course) return null;
                  return (
                    <Link key={enrollment.id} to={`/student/courses/${course.id}/lessons`} className="group block">
                      <Card className="border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                              <img src="" alt={course.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">{course.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={enrollment.progress || 0} className="h-1.5 flex-1" />
                                <span className="text-xs text-zinc-500">{Math.round(enrollment.progress || 0)}%</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy size={16} className="text-emerald-600" />
                  Recent Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completed.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">Course Completed!</p>
                    <p className="text-xs text-zinc-500 mt-1">Keep up the great work</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Complete a course to earn an achievement</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── My Courses Page ─────────────────────────────────────────────────
export function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: enrollData }, { data: courseData }] = await Promise.all([
          supabase.from('enrollments').select('*').eq('user_id', user.id),
          supabase.from('courses').select('id, title, slug, total_lessons, total_modules').in('status', ['published']),
        ]);

        setEnrollments(enrollData || []);
        setCourses(courseData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">My Courses</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">All your enrolled courses at a glance</p>
      </motion.div>

      {error && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-6 text-center">
            <XCircle size={48} className="mx-auto text-red-300 mb-4" />
            <h3 className="text-lg font-semibold mb-1 text-zinc-900 dark:text-white">Error loading courses</h3>
            <p className="text-sm text-zinc-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {enrollments.length === 0 ? (
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-8 text-center">
              <BookOpen size={48} className="mx-auto text-zinc-300 mb-4" />
              <h3 className="text-lg font-semibold mb-1">No courses yet</h3>
              <p className="text-sm text-zinc-500 mb-4">Enroll in your first course to start learning</p>
              <Link to={ROUTES.courses}><Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">Browse Courses <ArrowRight size={16} /></Button></Link>
            </CardContent>
          </Card>
        ) : (
          enrollments.map((enrollment) => {
            const course = courses.find((c) => c.id === enrollment.course_id);
            if (!course) return null;
            return (
              <motion.div key={enrollment.id} variants={itemVariants}>
                <Link to={`/student/courses/${course.id}/lessons`} className="group block">
                  <Card className="border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                          <img src="" alt={course.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">General</Badge>
                            <span className="text-xs text-zinc-400 capitalize">beginner</span>
                          </div>
                          <p className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">{course.title}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Progress value={enrollment.progress || 0} className="h-1.5 flex-1 max-w-[200px]" />
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{Math.round(enrollment.progress || 0)}% complete</span>
                          </div>
                        </div>
                        <PlayCircle size={24} className="text-zinc-300 group-hover:text-emerald-500 transition-colors shrink-0" weight="fill" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─── Rich Lesson Player ──────────────────────────────────────────────
export function StudentLessonPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [allLessons, setAllLessons] = useState<LessonRow[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonRow | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressRow | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloadingResource, setDownloadingResource] = useState<string | null>(null);
  const [showResources, setShowResources] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [savingProgress, setSavingProgress] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Flatten lessons from modules
  useEffect(() => {
    const flat = modules.flatMap(m => m.lessons).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setAllLessons(flat);
  }, [modules]);

  // Find current lesson
  useEffect(() => {
    if (allLessons.length > 0 && !currentLesson) {
      setCurrentLesson(allLessons[0]);
    }
  }, [allLessons, currentLesson]);

  // Load lesson data
  useEffect(() => {
    async function load() {
      if (!courseId) return;
      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Please log in to access lessons');
          setLoading(false);
          return;
        }

        // Check enrollment
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        if (!enrollData) {
          setError('You are not enrolled in this course');
          setEnrollment(null);
        } else {
          setEnrollment(enrollData);
        }

        // Fetch course
        const { data: courseData } = await supabase
          .from('courses')
          .select('*, instructors:instructor_id(name)')
          .eq('id', courseId)
          .single();
        setCourse(courseData as unknown as CourseRow);

        // Fetch modules + lessons
        const { data: moduleData } = await supabase
          .from('modules')
          .select('*, lessons(*)')
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true });
        setModules(moduleData as unknown as ModuleRow[]);

        // Fetch lesson progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('lesson_id', allLessons[0]?.id || '');
        if (progressData?.[0]) setLessonProgress(progressData[0]);

        // Fetch lesson resources
        const { data: resData } = await supabase
          .from('lesson_resources')
          .select('*')
          .eq('lesson_id', allLessons[0]?.id || '')
          .order('sort_order', { ascending: true });
        setResources(resData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, allLessons[0]?.id]);

  // Load signed URL when current lesson changes
  useEffect(() => {
    if (!currentLesson || !currentLesson.video_url) {
      setVideoSrc('');
      return;
    }

    async function loadVideo() {
      try {
        const url = await getSignedUrl('course-videos', currentLesson.video_url, 3600);
        setVideoSrc(url);
        // Restore position
        if (lessonProgress?.last_position_seconds) {
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = lessonProgress.last_position_seconds;
            }
          }, 500);
        }
      } catch {
        setVideoSrc('');
      }
    }
    loadVideo();
  }, [currentLesson?.id, currentLesson?.video_url, lessonProgress?.last_position_seconds]);

  // Throttled progress save
  const saveProgressThrottled = useCallback(async () => {
    if (!currentLesson || savingProgress) return;
    setSavingProgress(true);
    try {
      const pos = videoRef.current?.currentTime || 0;
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          lesson_id: currentLesson.id,
          last_position_seconds: Math.floor(pos),
          started_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
      if (error) console.error('save progress error:', error);
    } catch { /* silent */ }
    setSavingProgress(false);
  }, [currentLesson?.id, savingProgress]);

  // Video event handlers
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      // Save every ~30 seconds
      if (Math.floor(videoRef.current.currentTime) % 30 === 0) {
        saveProgressThrottled();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = async () => {
    setIsPlaying(false);
    await markLessonComplete();
  };

  // Mark lesson complete
  const markLessonComplete = async () => {
    if (!currentLesson) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
          time_spent_seconds: Math.floor(duration),
          last_position_seconds: 0,
        }, { onConflict: 'user_id,lesson_id' });

      setLessonProgress(prev => prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : null);
      toast.success('Lesson marked as complete!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save progress');
    }
  };

  // Navigate lessons
  const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
  const nextLesson = allLessons[currentIndex + 1];
  const prevLesson = allLessons[currentIndex - 1];

  const goToLesson = (lesson: LessonRow) => {
    setCurrentLesson(lesson);
    setVideoSrc('');
    setIsPlaying(false);
    setCurrentTime(0);
    setShowResources(false);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Download resource
  const downloadResource = async (resource: any) => {
    if (!resource.storage_path) return;
    setDownloadingResource(resource.id);
    try {
      const url = await getSignedUrl('lesson-resources', resource.storage_path, 3600);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.title || 'resource';
      a.click();
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
    setDownloadingResource(null);
  };

  if (loading) {
    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-6 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <Lock size={48} className="mx-auto text-zinc-300 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-white">Access Required</h2>
        <p className="text-sm text-zinc-500 mb-4">{error}</p>
        {courseId && (
          <Link to={`/checkout/${courseId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              Enroll Now <ArrowRight size={16} />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="text-center py-16">
        <BookOpen size={48} className="mx-auto text-zinc-300 mb-4" />
        <h2 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-white">Lesson not found</h2>
        <Link to={ROUTES.studentCourses}><Button variant="outline" className="gap-2"><ArrowLeft size={16} /> Back to Courses</Button></Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Breadcrumb */}
      <Link to={ROUTES.studentCourses} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-emerald-600 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to My Courses
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {currentLesson.type === 'video' && (
            <div className="aspect-video rounded-xl bg-zinc-900 overflow-hidden relative">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleVideoEnded}
                  onClick={handlePlayPause}
                  controls={!isPlaying}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Spinner size={48} className="animate-spin text-zinc-500" />
                </div>
              )}
              {!videoSrc && currentLesson.video_url && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button onClick={handlePlayPause} className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                    <PlayCircle size={32} className="text-white" weight="fill" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reading / Text Content */}
          {(currentLesson.type === 'reading' || currentLesson.type === 'quiz' || currentLesson.type === 'assignment') && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {currentLesson.content || 'Content for this lesson will appear here.'}
                </p>
              </div>
            </div>
          )}

          {/* Lesson Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="capitalize">{currentLesson.type}</Badge>
              {currentLesson.is_free_preview && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs">Free Preview</Badge>
              )}
              {lessonProgress?.completed && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-xs flex items-center gap-1">
                  <Check size={10} weight="bold" /> Completed
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{currentLesson.title}</h1>
            {currentLesson.description && (
              <p className="text-sm text-zinc-500 mb-4">{currentLesson.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
              <span className="flex items-center gap-1"><Clock size={14} />{currentLesson.duration || 'N/A'}</span>
              {lessonProgress?.time_spent_seconds && (
                <span className="flex items-center gap-1"><Clock size={14} />{Math.floor(lessonProgress.time_spent_seconds / 60)}m spent</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <Button
                onClick={markLessonComplete}
                disabled={!!lessonProgress?.completed}
                className={`gap-2 ${lessonProgress?.completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                <Check size={16} weight="bold" />
                {lessonProgress?.completed ? 'Completed' : 'Mark Complete'}
              </Button>
              <Button variant="outline" onClick={() => setShowResources(!showResources)} className="gap-2">
                <ListDashes size={16} /> Resources
              </Button>
            </div>

            {/* Resources Panel */}
            <AnimatePresence>
              {showResources && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ ease: 'easeOut' as const }}
                  className="overflow-hidden"
                >
                  <Card className="border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Lesson Resources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {resources.length === 0 ? (
                        <p className="text-sm text-zinc-500">No resources available for this lesson.</p>
                      ) : (
                        <div className="space-y-2">
                          {resources.map((res) => {
                            const ResIcon = res.mime_type?.includes('pdf') ? FilePdf : res.mime_type?.includes('image') ? ImageIcon : FileText;
                            return (
                              <div key={res.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <ResIcon size={20} className="text-emerald-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{res.title}</p>
                                  <p className="text-xs text-zinc-500">{res.mime_type?.split('/')[1]?.toUpperCase() || 'File'}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadResource(res)}
                                  disabled={downloadingResource === res.id}
                                  className="gap-1 text-emerald-600"
                                >
                                  {downloadingResource === res.id ? (
                                    <Spinner size={14} className="animate-spin" />
                                  ) : (
                                    <Download size={14} />
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              {prevLesson ? (
                <button
                  onClick={() => goToLesson(prevLesson)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-emerald-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Previous: {prevLesson.title}
                </button>
              ) : <div />}
              {nextLesson ? (
                <button
                  onClick={() => goToLesson(nextLesson)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Next: {nextLesson.title} <ArrowRight size={14} />
                </button>
              ) : (
                <Link to={ROUTES.studentCourses}>
                  <Button variant="outline" className="gap-2">
                    <Trophy size={16} /> Finish Course
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Curriculum */}
        <div className="lg:col-span-1">
          <Card className="border-zinc-200 dark:border-zinc-800 sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{course.title}</CardTitle>
              <CardDescription className="text-xs">
                {modules.length} modules · {allLessons.length} lessons
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[calc(100dvh-12rem)] overflow-y-auto">
                {modules.map((mod) => (
                  <div key={mod.id} className="px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">{mod.title}</p>
                    <div className="space-y-1">
                      {mod.lessons.map((l) => {
                        const isActive = l.id === currentLesson?.id;
                        const isCompleted = lessonProgress?.lesson_id === l.id && lessonProgress.completed;
                        return (
                          <button
                            key={l.id}
                            onClick={() => goToLesson(l)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium'
                                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800'
                            }`}>
                              {isCompleted ? <Check size={8} weight="bold" /> : <PlayCircle size={10} />}
                            </span>
                            <span className="flex-1 truncate">{l.title}</span>
                            <span className="text-zinc-400 shrink-0">{l.duration}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}