-- ============================================
-- PHASE 2: LMS — Functions, Triggers & RLS
-- ============================================

-- Function to get current user's role (used by RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$;

-- Auto-create or sync profile on signup.
-- This allows first-time profile creation without a service role while keeping
-- role defaults consistent with auth metadata and preventing duplicate rows.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role, status, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student'::user_role),
    'active',
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      role = COALESCE(EXCLUDED.role, public.profiles.role),
      status = COALESCE(EXCLUDED.status, public.profiles.status),
      username = COALESCE(EXCLUDED.username, public.profiles.username),
      updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update profile email when auth email changes
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_update();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_course_categories_updated_at
  BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_course_modules_updated_at
  BEFORE UPDATE ON course_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_assignments_updated_at
  BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_quizzes_updated_at
  BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_course_progress_updated_at
  BEFORE UPDATE ON course_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can create their own row, owners can update it, and admins can manage all rows.
CREATE POLICY profiles_insert_own ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND role = (SELECT role FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY profiles_admin_insert ON profiles FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY profiles_admin_update ON profiles FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY profiles_admin_delete ON profiles FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- COURSE_CATEGORIES: public read; admin write
CREATE POLICY categories_select_public ON course_categories FOR SELECT USING (true);
CREATE POLICY categories_admin_insert ON course_categories FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY categories_admin_update ON course_categories FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY categories_admin_delete ON course_categories FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- COURSES: public read published; instructors/admins write
CREATE POLICY courses_select_published ON courses FOR SELECT
  USING (status = 'published' OR get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY courses_admin_insert ON courses FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY courses_admin_update ON courses FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY courses_admin_delete ON courses FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- COURSE_INSTRUCTORS: public read; admin write
CREATE POLICY course_instructors_select ON course_instructors FOR SELECT USING (true);
CREATE POLICY course_instructors_admin_insert ON course_instructors FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY course_instructors_admin_update ON course_instructors FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY course_instructors_admin_delete ON course_instructors FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- COURSE_MODULES: public read; instructor/admin write
CREATE POLICY modules_select ON course_modules FOR SELECT USING (true);
CREATE POLICY modules_insert ON course_modules FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY modules_update ON course_modules FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY modules_delete ON course_modules FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- LESSONS: public read; instructor/admin write
CREATE POLICY lessons_select ON lessons FOR SELECT USING (true);
CREATE POLICY lessons_insert ON lessons FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY lessons_update ON lessons FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY lessons_delete ON lessons FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- LESSON_RESOURCES: public read; instructor/admin write
CREATE POLICY lesson_resources_select ON lesson_resources FOR SELECT USING (true);
CREATE POLICY lesson_resources_insert ON lesson_resources FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY lesson_resources_update ON lesson_resources FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY lesson_resources_delete ON lesson_resources FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- ENROLLMENTS: students see own; admins see all; instructors see course enrollments
CREATE POLICY enrollments_select_own ON enrollments FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY enrollments_insert_own ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND get_user_role() = 'student');
CREATE POLICY enrollments_admin_update ON enrollments FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- PAYMENTS: students see own; admins see all
CREATE POLICY payments_select_own ON payments FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY payments_insert_own ON payments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY payments_admin_update ON payments FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- ASSIGNMENTS: public read; instructor/admin write
CREATE POLICY assignments_select ON assignments FOR SELECT USING (true);
CREATE POLICY assignments_insert ON assignments FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY assignments_update ON assignments FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY assignments_delete ON assignments FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- ASSIGNMENT_SUBMISSIONS: students see own; instructors see course submissions
CREATE POLICY assignment_submissions_select_own ON assignment_submissions FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY assignment_submissions_insert_own ON assignment_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY assignment_submissions_admin_update ON assignment_submissions FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- QUIZZES: public read; instructor/admin write
CREATE POLICY quizzes_select ON quizzes FOR SELECT USING (true);
CREATE POLICY quizzes_insert ON quizzes FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY quizzes_update ON quizzes FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY quizzes_delete ON quizzes FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- QUIZ_QUESTIONS: public read; instructor/admin write
CREATE POLICY quiz_questions_select ON quiz_questions FOR SELECT USING (true);
CREATE POLICY quiz_questions_insert ON quiz_questions FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY quiz_questions_update ON quiz_questions FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY quiz_questions_delete ON quiz_questions FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- QUIZ_OPTIONS: public read; instructor/admin write
CREATE POLICY quiz_options_select ON quiz_options FOR SELECT USING (true);
CREATE POLICY quiz_options_insert ON quiz_options FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY quiz_options_update ON quiz_options FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY quiz_options_delete ON quiz_options FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin', 'instructor'));

-- QUIZ_ATTEMPTS: students see own; admins see all
CREATE POLICY quiz_attempts_select_own ON quiz_attempts FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY quiz_attempts_insert_own ON quiz_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY quiz_attempts_admin_update ON quiz_attempts FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- QUIZ_ANSWERS: students see own; admins see all
CREATE POLICY quiz_answers_select_own ON quiz_answers FOR SELECT
  USING (attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid()) OR get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY quiz_answers_insert_own ON quiz_answers FOR INSERT
  WITH CHECK (attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = auth.uid()));

-- LESSON_PROGRESS: students see own; instructors/admins see all
CREATE POLICY lesson_progress_select_own ON lesson_progress FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY lesson_progress_insert_own ON lesson_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY lesson_progress_update_own ON lesson_progress FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- COURSE_PROGRESS: students see own; instructors/admins see all
CREATE POLICY course_progress_select_own ON course_progress FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin', 'instructor'));
CREATE POLICY course_progress_insert_own ON course_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY course_progress_update_own ON course_progress FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CERTIFICATES: students see own; admins see all
CREATE POLICY certificates_select_own ON certificates FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY certificates_admin_insert ON certificates FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY certificates_admin_update ON certificates FOR UPDATE
  USING (get_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY certificates_admin_delete ON certificates FOR DELETE
  USING (get_user_role() IN ('admin', 'super_admin'));

-- NOTIFICATIONS: users see own; admins see all
CREATE POLICY notifications_select_own ON notifications FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY notifications_update_own ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_admin_insert ON notifications FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));

-- AUDIT_LOGS: admins only
CREATE POLICY audit_logs_admin_select ON audit_logs FOR SELECT
  USING (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY audit_logs_admin_insert ON audit_logs FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'super_admin'));