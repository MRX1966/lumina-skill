import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, MagnifyingGlass, CaretDown, DotsThreeVertical,
  NotePencil, Copy, Check, X, Trash, Archive,
  BookOpen, Users,
  FileText, Stack
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ROUTES } from '@/constants/navigation';
import { getAdminCourses, getAdminCourseStats, getCourseCategories, getInstructors, deleteCourse, updateCourseStatus, duplicateCourse } from '@/services/courseService';
import type { AdminCourseRow } from '@/services/courseService';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const } },
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={20} weight="bold" />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminCourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<AdminCourseRow[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [instructors, setInstructors] = useState<Tables<'instructors'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<AdminCourseRow | null>(null);
  const [page, setPage] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [stats, setStats] = useState({ totalCourses: 0, publishedCourses: 0, draftCourses: 0, totalEnrolled: 0 });
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [coursePage, courseStats] = await Promise.all([
        getAdminCourses({
          page,
          pageSize,
          search,
          status: statusFilter,
          categoryId: categoryFilter,
        }),
        getAdminCourseStats(),
      ]);
      setCourses(coursePage.courses);
      setTotalCourses(coursePage.total);
      setStats(courseStats);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page, pageSize, search, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCourseCategories(), getInstructors()])
      .then(([categoryData, instructorData]) => {
        if (!cancelled) {
          setCategories(categoryData || []);
          setInstructors(instructorData || []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load course filters');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(fetchData, search.trim() ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [fetchData, search]);

  const handleStatusToggle = async (course: AdminCourseRow) => {
    try {
      const newStatus = course.status === 'published' ? 'draft' : 'published';
      if (newStatus === 'published') {
        const missing: string[] = [];
        if (!course.title) missing.push('Title');
        if (!course.description) missing.push('Description');
        if (!course.category_id) missing.push('Category');
        if (!course.instructor_id) missing.push('Instructor');
        if ((course.price ?? 0) <= 0) missing.push('Price');
        if (missing.length > 0) {
          toast.error(`Cannot publish. Missing: ${missing.join(', ')}`);
          return;
        }
      }
      await updateCourseStatus(course.id, newStatus as 'draft' | 'published');
      toast.success(`Course ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleArchive = async (course: AdminCourseRow) => {
    try {
      const newStatus = course.status === 'archived' ? 'draft' : 'archived';
      await updateCourseStatus(course.id, newStatus as 'draft' | 'published' | 'archived');
      toast.success(`Course ${newStatus === 'archived' ? 'archived' : 'restored'}`);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive course');
    }
  };

  const handleDuplicate = async (course: AdminCourseRow) => {
    try {
      await duplicateCourse(course.id);
      toast.success('Course duplicated successfully');
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate course');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourse(deleteTarget.id);
      toast.success('Course deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return '—';
    return categories.find((c) => c.id === id)?.name || 'Unknown';
  };

  const getInstructorName = (id: string | null) => {
    if (!id) return '—';
    return instructors.find((i) => i.id === id)?.name || 'Unknown';
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Courses</h1>
          <p className="text-sm text-zinc-500 mt-1">{totalCourses} matching courses</p>
        </div>
        <Link to={ROUTES.adminCourseNew}>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus size={16} weight="bold" /> New Course
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} color="text-blue-600 bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon={Check} label="Published" value={stats.publishedCourses} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" />
        <StatCard icon={FileText} label="Drafts" value={stats.draftCourses} color="text-zinc-600 bg-zinc-50 dark:bg-zinc-800" />
        <StatCard icon={Users} label="Enrolled Students" value={stats.totalEnrolled} color="text-purple-600 bg-purple-50 dark:bg-purple-900/20" />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            aria-label="Search courses by title"
            placeholder="Search courses by title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-11 pl-9 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            aria-label="Filter courses by status"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 pl-3 pr-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            aria-label="Filter courses by category"
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="h-11 pl-3 pr-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <CaretDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 text-left border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Instructor</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Students</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">Loading courses...</td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <BookOpen size={32} />
                        <p>No courses found</p>
                        {search || statusFilter !== 'all' || categoryFilter !== 'all' ? (
                          <button onClick={() => { setSearch(''); setStatusFilter('all'); setCategoryFilter('all'); setPage(1); }} className="text-emerald-600 text-sm hover:underline">
                            Clear filters
                          </button>
                        ) : (
                          <Link to={ROUTES.adminCourseNew} className="text-emerald-600 text-sm hover:underline">Create your first course</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : courses.map((course) => (
                  <tr key={course.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-9 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                          {course.image ? (
                            <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <BookOpen size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white truncate max-w-[200px]">{course.title}</p>
                          <p className="text-xs text-zinc-400 truncate max-w-[200px]">{course.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {getCategoryName(course.category_id)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {course.currency || 'GHS'} {course.price ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[course.status] || STATUS_STYLES.draft}`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{getInstructorName(course.instructor_id)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Users size={14} /> {course.enrollment_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {course.created_at ? format(new Date(course.created_at), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
                            <DotsThreeVertical size={16} weight="bold" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}`)}>
                            <NotePencil size={16} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/builder`)}>
                            <Stack size={16} className="mr-2" /> Builder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(course)}>
                            <Copy size={16} className="mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusToggle(course)}>
                            {course.status === 'published' ? (
                              <><X size={16} className="mr-2" /> Unpublish</>
                            ) : (
                              <><Check size={16} className="mr-2" /> Publish</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(course)}>
                            <Archive size={16} className="mr-2" />
                            {course.status === 'archived' ? 'Restore' : 'Archive'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteTarget(course)}
                          >
                            <Trash size={16} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {totalCourses > 0 && (
        <nav aria-label="Admin course result pages" className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-zinc-500" aria-live="polite">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCourses)} of {totalCourses}
          </p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            <span className="flex min-h-11 items-center px-2 text-sm text-zinc-600 dark:text-zinc-300" aria-label={`Page ${page} of ${Math.max(1, Math.ceil(totalCourses / pageSize))}`}>
              {page} / {Math.max(1, Math.ceil(totalCourses / pageSize))}
            </span>
            <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" disabled={page >= Math.ceil(totalCourses / pageSize) || loading} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </nav>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone. All associated modules, lessons, and enrollments will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash size={16} className="mr-2" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}