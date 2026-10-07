DROP POLICY IF EXISTS courses_select_published ON public.courses;

CREATE POLICY courses_select_published ON public.courses FOR SELECT
  USING (
    status = 'published'
    OR get_user_role() IN ('admin', 'super_admin', 'instructor')
    OR EXISTS (
      SELECT 1
      FROM public.enrollments
      WHERE enrollments.course_id = courses.id
        AND enrollments.user_id = auth.uid()
    )
  );
