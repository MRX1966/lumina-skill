import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/contexts/AuthContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ROUTES } from '@/constants/navigation';

const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })));
const CoursesPage = lazy(() => import('@/pages/CoursesPages').then((module) => ({ default: module.CoursesPage })));
const CourseDetailPage = lazy(() => import('@/pages/CoursesPages').then((module) => ({ default: module.CourseDetailPage })));
const LoginPage = lazy(() => import('@/pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })));
const CheckoutPage = lazy(() => import('@/pages/PaymentPages').then((module) => ({ default: module.CheckoutPage })));
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentPages').then((module) => ({ default: module.PaymentSuccessPage })));
const PaymentFailedPage = lazy(() => import('@/pages/PaymentPages').then((module) => ({ default: module.PaymentFailedPage })));
const PaymentCancelledPage = lazy(() => import('@/pages/PaymentPages').then((module) => ({ default: module.PaymentCancelledPage })));
const StudentDashboard = lazy(() => import('@/pages/StudentDashboardPage').then((module) => ({ default: module.StudentDashboard })));
const StudentCoursesPage = lazy(() => import('@/pages/StudentDashboardPage').then((module) => ({ default: module.StudentCoursesPage })));
const StudentCourseHistoryPage = lazy(() => import('@/pages/StudentCourseHistoryPage').then((module) => ({ default: module.StudentCourseHistoryPage })));
const StudentLessonPage = lazy(() => import('@/pages/StudentLessonPage').then((module) => ({ default: module.StudentLessonPage })));
const StudentAssignmentsPage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentAssignmentsPage })));
const StudentQuizzesPage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentQuizzesPage })));
const StudentResultsPage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentResultsPage })));
const StudentCertificatesPage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentCertificatesPage })));
const StudentNotificationsPage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentNotificationsPage })));
const StudentProfilePage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentProfilePage })));
const StudentSettingsPage = lazy(() => import('@/pages/StudentPages').then((module) => ({ default: module.StudentSettingsPage })));
const AdminDashboard = lazy(() => import('@/pages/AdminPages').then((module) => ({ default: module.AdminDashboard })));
const AdminStudentsPage = lazy(() => import('@/pages/AdminPages').then((module) => ({ default: module.AdminStudentsPage })));
const AdminIdentityVerificationPage = lazy(() => import('@/pages/IdentityVerificationPages').then((module) => ({ default: module.AdminIdentityVerificationPage })));
const AdminCoursesPage = lazy(() => import('@/pages/AdminPages').then((module) => ({ default: module.AdminCoursesPage })));
const AdminCourseForm = lazy(() => import('@/pages/AdminPages').then((module) => ({ default: module.AdminCourseForm })));
const CourseBuilderPage = lazy(() => import('@/pages/CourseBuilderPage').then((module) => ({ default: module.CourseBuilderPage })));
const AboutPage = lazy(() => import('@/components/StaticPages').then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('@/components/StaticPages').then((module) => ({ default: module.ContactPage })));

function NotFoundPage() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-zinc-900 dark:text-white mb-4">404</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">The page you are looking for does not exist.</p>
      <a href={ROUTES.home} className="text-emerald-600 hover:text-emerald-700 font-medium">
        Go back home
      </a>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500" role="status">
              Loading page…
            </div>
          }
        >
        <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.about} element={<AboutPage />} />
          <Route path={ROUTES.contact} element={<ContactPage />} />
          <Route path={ROUTES.courses} element={<CoursesPage />} />
          <Route path={ROUTES.courseDetail} element={<CourseDetailPage />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.checkout} element={<CheckoutPage />} />
          <Route path={ROUTES.paymentSuccess} element={<PaymentSuccessPage />} />
          <Route path={ROUTES.paymentFailed} element={<PaymentFailedPage />} />
          <Route path={ROUTES.paymentCancelled} element={<PaymentCancelledPage />} />
        </Route>

        {/* Student portal */}
        <Route element={<ProtectedRoute requiredRole="student" />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to={ROUTES.studentDashboard} replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="courses" element={<StudentCoursesPage />} />
            <Route path="history" element={<StudentCourseHistoryPage />} />
            <Route path="courses/:courseId/lessons" element={<StudentLessonPage />} />
            <Route path="assignments" element={<StudentAssignmentsPage />} />
            <Route path="quizzes" element={<StudentQuizzesPage />} />
            <Route path="results" element={<StudentResultsPage />} />
            <Route path="certificates" element={<StudentCertificatesPage />} />
            <Route path="notifications" element={<StudentNotificationsPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
            <Route path="settings" element={<StudentSettingsPage />} />
          </Route>
        </Route>

        {/* Admin portal */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to={ROUTES.adminDashboard} replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="identity-verification" element={<AdminIdentityVerificationPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="courses/new" element={<AdminCourseForm />} />
            <Route path="courses/:courseId" element={<AdminCourseForm />} />
            <Route path="courses/:courseId/builder" element={<CourseBuilderPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path={ROUTES.notFound} element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </MotionConfig>
    </AuthProvider>
  );
}

export default App;