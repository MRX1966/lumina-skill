import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { CoursesPage, CourseDetailPage } from '@/pages/CoursesPages';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/pages/AuthPages';
import {
  CheckoutPage,
  PaymentSuccessPage,
  PaymentFailedPage,
  PaymentCancelledPage,
} from '@/pages/PaymentPages';
import { StudentDashboard, StudentCoursesPage } from '@/pages/StudentDashboardPage';
import { StudentLessonPage } from '@/pages/StudentLessonPage';
import {
  StudentAssignmentsPage,
  StudentQuizzesPage,
  StudentResultsPage,
  StudentCertificatesPage,
  StudentNotificationsPage,
  StudentProfilePage,
  StudentSettingsPage,
} from '@/pages/StudentPages';
import {
  AdminDashboard,
  AdminStudentsPage,
  AdminCoursesPage,
  AdminCourseForm,
} from '@/pages/AdminPages';
import { CourseBuilderPage } from '@/pages/CourseBuilderPage';
import { ROUTES } from '@/constants/navigation';

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
      <BrowserRouter>
        <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
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
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;