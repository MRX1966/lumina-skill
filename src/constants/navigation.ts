import type { NavItem, User } from '@/types';

export const BRAND_NAME = 'NetNetHub LMS';
export const BRAND_TAGLINE = 'Learn. Grow. Succeed.';
export const BRAND_EMAIL = 'hello@nennethub.com';

export const ROUTES = {
  home: '/',
  courses: '/courses',
  courseDetail: '/courses/:slug',
  about: '/about',
  contact: '/contact',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  checkout: '/checkout/:courseId',
  paymentSuccess: '/payment/success',
  paymentFailed: '/payment/failed',
  paymentCancelled: '/payment/cancelled',
  studentDashboard: '/student/dashboard',
  studentCourses: '/student/courses',
  studentLesson: '/student/courses/:courseId/lessons',
  studentAssignments: '/student/assignments',
  studentQuizzes: '/student/quizzes',
  studentResults: '/student/results',
  studentCertificates: '/student/certificates',
  studentNotifications: '/student/notifications',
  studentProfile: '/student/profile',
  studentSettings: '/student/settings',
  adminDashboard: '/admin/dashboard',
  adminStudents: '/admin/students',
  adminCourses: '/admin/courses',
  adminCourseNew: '/admin/courses/new',
  adminCourseEditor: '/admin/courses/:courseId',
  adminPayments: '/admin/payments',
  adminReports: '/admin/reports',
  adminSettings: '/admin/settings',
  notFound: '/404',
} as const;

export const publicNavItems: NavItem[] = [
  { label: 'Home', path: ROUTES.home, icon: 'House' },
  { label: 'Courses', path: ROUTES.courses, icon: 'BookOpen' },
  { label: 'About', path: ROUTES.about, icon: 'Info' },
  { label: 'Contact', path: ROUTES.contact, icon: 'Envelope' },
];

export const studentNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.studentDashboard, icon: 'House' },
  { label: 'My Courses', path: ROUTES.studentCourses, icon: 'BookOpen' },
  { label: 'Assignments', path: ROUTES.studentAssignments, icon: 'ClipboardText' },
  { label: 'Quizzes', path: ROUTES.studentQuizzes, icon: 'Exam' },
  { label: 'Certificates', path: ROUTES.studentCertificates, icon: 'Certificate' },
  { label: 'Profile', path: ROUTES.studentProfile, icon: 'User' },
  { label: 'Settings', path: ROUTES.studentSettings, icon: 'GearSix' },
];

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: ROUTES.adminDashboard, icon: 'House' },
  { label: 'Students', path: ROUTES.adminStudents, icon: 'Users' },
  { label: 'Courses', path: ROUTES.adminCourses, icon: 'BookOpen' },
  { label: 'Payments', path: ROUTES.adminPayments, icon: 'Wallet' },
  { label: 'Reports', path: ROUTES.adminReports, icon: 'ChartLine' },
  { label: 'Settings', path: ROUTES.adminSettings, icon: 'GearSix' },
];

export const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Design',
  'Business',
  'Marketing',
  'Cloud & DevOps',
  'Mobile Development',
  'AI & Machine Learning',
] as const;

// Re-export User type for convenience
export type { User } from '@/types';