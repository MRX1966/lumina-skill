import { supabase } from '@/integrations/supabase/client';
import type { CourseRow, ModuleRow, LessonRow, EnrollmentRow, CategoryRow, InstructorRow, TestimonialRow, LessonProgressRow, PaymentRow } from '@/integrations/supabase/types';

export type CourseWithRelations = CourseRow & {
  category: CategoryRow | null;
  instructor: InstructorRow | null;
};

export type ModuleWithLessons = ModuleRow & {
  lessons: LessonRow[];
};

export type AdminCourseRow = CourseRow & {
  categories: CategoryRow | null;
  instructors: InstructorRow | null;
  enrollment_count: number;
};

const tableNames = {
  courses: 'courses',
  modules: 'course_modules',
  categories: 'course_categories',
  instructors: 'profiles',
  lessons: 'lessons',
  lessonResources: 'lesson_resources',
  enrollments: 'enrollments',
  payments: 'payments',
  lessonProgress: 'lesson_progress',
  testmonials: 'testimonials',
};

/* ── Public methods ── */

export async function getPublishedCourses() {
  const { data, error } = await supabase
    .from(tableNames.courses)
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CourseWithRelations[];
}

export async function getPublishedCoursesPage({
  page,
  pageSize,
  search,
  categoryId,
}: {
  page: number;
  pageSize: number;
  search: string;
  categoryId?: string;
}) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const offset = (safePage - 1) * safePageSize;
  let query = supabase
    .from(tableNames.courses)
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + safePageSize - 1);

  if (search.trim()) {
    query = query.ilike('title', `%${search.trim()}%`);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return {
    courses: (data || []) as CourseWithRelations[],
    total: count ?? 0,
  };
}

export async function getFeaturedCourses() {
  const { data, error } = await supabase
    .from(tableNames.courses)
    .select('*')
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data || []) as CourseWithRelations[];
}

export async function getCourseBySlug(slug: string) {
  const { data, error } = await supabase
    .from(tableNames.courses)
    .select('*')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as CourseWithRelations | null) ?? null;
}

export async function getCourseModulesWithLessons(courseId: string) {
  const { data, error } = await supabase
    .from(tableNames.modules)
    .select('*, lessons(*)')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as ModuleWithLessons[];
}

export async function getCategories() {
  const { data, error } = await supabase
    .from(tableNames.categories)
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CategoryRow[];
}

export async function getTestimonials() {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('featured', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as TestimonialRow[];
}

/* ── Admin methods ── */

export async function getAdminCourses({
  page,
  pageSize,
  search,
  status,
  categoryId,
}: {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  categoryId: string;
}) {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const offset = (safePage - 1) * safePageSize;
  let query = supabase
    .from(tableNames.courses)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + safePageSize - 1);

  if (search.trim()) query = query.ilike('title', `%${search.trim()}%`);
  if (status !== 'all') query = query.eq('status', status);
  if (categoryId !== 'all') query = query.eq('category_id', categoryId);

  const { data, count, error } = await query;
  if (error) throw error;

  const courses = (data || []) as CourseRow[];
  const courseIds = courses.map((c) => c.id);

  const [enrollResult, categoryResult] = courseIds.length
    ? await Promise.all([
        supabase.from(tableNames.enrollments).select('course_id').in('course_id', courseIds),
        supabase.from(tableNames.categories).select('*').in('id', courses.map((c) => c.category_id).filter(Boolean)),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (enrollResult.error) throw enrollResult.error;
  if (categoryResult.error) throw categoryResult.error;

  const categoryMap = Object.fromEntries((categoryResult.data || []).map((category) => [category.id, category]));
  const enrollCounts: Record<string, number> = {};
  for (const e of enrollResult.data || []) {
    enrollCounts[e.course_id] = (enrollCounts[e.course_id] || 0) + 1;
  }

  return {
    courses: courses.map((course) => ({
      ...course,
      categories: categoryMap[course.category_id] ?? null,
      instructors: null,
      enrollment_count: enrollCounts[course.id] || 0,
    })) as AdminCourseRow[],
    total: count ?? 0,
  };
}

export async function getAdminCourseStats() {
  const [total, published, drafts, enrollments] = await Promise.all([
    supabase.from(tableNames.courses).select('id', { count: 'exact', head: true }),
    supabase.from(tableNames.courses).select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from(tableNames.courses).select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from(tableNames.enrollments).select('id', { count: 'exact', head: true }),
  ]);
  for (const result of [total, published, drafts, enrollments]) {
    if (result.error) throw result.error;
  }

  return {
    totalCourses: total.count ?? 0,
    publishedCourses: published.count ?? 0,
    draftCourses: drafts.count ?? 0,
    totalEnrolled: enrollments.count ?? 0,
  };
}

export async function getAdminCourseById(id: string) {
  const { data, error } = await supabase
    .from(tableNames.courses)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const categoryId = data.category_id;
  const [categoryResult] = await Promise.all([
    categoryId ? supabase.from(tableNames.categories).select('*').eq('id', categoryId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  if (categoryResult.error && categoryResult.error.code !== 'PGRST116') throw categoryResult.error;

  return {
    ...data,
    categories: categoryResult.data ?? null,
    instructors: null,
  };
}

export async function createCourse(courseData: Partial<CourseRow>) {
  const { data, error } = await supabase
    .from(tableNames.courses)
    .insert(courseData)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function updateCourse(id: string, courseData: Partial<CourseRow>) {
  const { data, error } = await supabase
    .from(tableNames.courses)
    .update(courseData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function duplicateCourse(id: string) {
  const original = await getAdminCourseById(id);
  const newSlug = `${original.slug}-copy-${Date.now()}`;
  const insertData: Partial<CourseRow> = {
    title: `${original.title} (Copy)`,
    slug: newSlug,
    subtitle: original.subtitle,
    description: original.description,
    long_description: original.long_description,
    category_id: original.category_id,
    level: original.level,
    price: Number(original.price ?? 0),
    original_price: original.original_price,
    image: original.image,
    duration_hours: original.duration_hours,
    featured: false,
    status: 'draft',
    skills: original.skills,
    tags: original.tags,
    requirements: original.requirements,
    learning_objectives: original.learning_objectives,
  };

  const { data, error } = await supabase
    .from(tableNames.courses)
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase
    .from(tableNames.courses)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateCourseStatus(id: string, status: 'draft' | 'published' | 'archived') {
  const updateData: Partial<CourseRow> = { status };
  if (status === 'published') {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(tableNames.courses)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CourseRow;
}

export async function getInstructors() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'instructor')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data as InstructorRow[];
}

export async function getCourseCategories() {
  const { data, error } = await supabase
    .from(tableNames.categories)
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CategoryRow[];
}

export async function getEnrollmentCount(courseId: string) {
  const { count, error } = await supabase
    .from(tableNames.enrollments)
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (error) throw error;
  return count || 0;
}

/* ─── Storage & Enrollment Methods (Phase 5/6) ─── */

export async function enrollStudent(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from(tableNames.enrollments)
    .insert({ user_id: userId, course_id: courseId })
    .select()
    .single();

  if (error) throw error;
  return data as EnrollmentRow;
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from(tableNames.enrollments)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getLessonProgress(userId: string, lessonId: string) {
  const { data, error } = await supabase
    .from(tableNames.lessonProgress)
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as LessonProgressRow | null) ?? null;
}

export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  updates: Partial<LessonProgressRow>,
) {
  const { data, error } = await supabase
    .from(tableNames.lessonProgress)
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      ...updates,
    }, { onConflict: 'user_id,lesson_id' })
    .select()
    .single();

  if (error) throw error;
  return data as LessonProgressRow;
}

export async function createLesson(data: Partial<LessonRow>) {
  const { data: result, error } = await supabase
    .from(tableNames.lessons)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as LessonRow;
}

export async function updateLesson(id: string, data: Partial<LessonRow>) {
  const { data: result, error } = await supabase
    .from(tableNames.lessons)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as LessonRow;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase
    .from(tableNames.lessons)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateLessonsOrder(updates: Array<{ id: string; module_id: string; sort_order: number }>) {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from(tableNames.lessons).update({ sort_order }).eq('id', id),
    ),
  );

  const failure = results.find((item) => item.error);
  if (failure?.error) throw failure.error;
}

export async function createModule(data: Partial<ModuleRow>) {
  const { data: result, error } = await supabase
    .from(tableNames.modules)
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return result as ModuleRow;
}

export async function updateModule(id: string, data: Partial<ModuleRow>) {
  const { data: result, error } = await supabase
    .from(tableNames.modules)
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as ModuleRow;
}

export async function deleteModule(id: string) {
  const { error } = await supabase
    .from(tableNames.modules)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateModulesOrder(updates: Array<{ id: string; sort_order: number }>) {
  const results = await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from(tableNames.modules).update({ sort_order }).eq('id', id),
    ),
  );

  const failure = results.find((item) => item.error);
  if (failure?.error) throw failure.error;
}

export async function getPaymentByReference(reference: string) {
  const { data, error } = await supabase
    .from(tableNames.payments)
    .select('*')
    .eq('transaction_reference', reference)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') return null;
  return (data as PaymentRow | null) ?? null;
}

export async function updatePaymentStatus(paymentId: string, status: string, metadata?: Record<string, unknown>) {
  const { data, error } = await supabase
    .from(tableNames.payments)
    .update({ status, gateway_response: metadata ?? undefined, paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentRow;
}
