import { useLocation, useNavigate } from 'react-router';

// Every screen's address, in one place. The dashboard, Admin Studio and the AI pipeline add their
// own tab/step after these (/dashboard/mocks, /admin/courses, /ai-pipeline/upload?subject=...).
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  courses: '/courses',
  subscription: '/subscription',
  typing: '/typing',
  admin: '/admin',
  pipeline: '/ai-pipeline',
  exam: '/exam',
  results: '/results',
  terms: '/legal/terms-of-use',
  privacy: '/legal/privacy-policy',
  about: '/about-us',
  refund: '/legal/refund-policy',
  cart: '/cart',
};

// /dashboard/<tab>; the first one is the default.
export const DASHBOARD_TABS = ['mission', 'analytics', 'courses', 'typing', 'mocks', 'support'];

export const courseDetailPath = (courseId) => `${ROUTES.courses}/${encodeURIComponent(courseId)}`;

// Where "home" is: a signed-in admin or student goes to their own area, a guest to the landing page.
export const homePathFor = (user) => (user ? (user.role === 'admin' ? ROUTES.admin : ROUTES.dashboard) : ROUTES.home);

// Opens a course's detail page and remembers the address it was opened from (whatever screen or
// dashboard tab that was), so the page's "back" returns to exactly there.
export const useOpenCourse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (courseId) => navigate(courseDetailPath(courseId), { state: { from: location.pathname + location.search } });
};
