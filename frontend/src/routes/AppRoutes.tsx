import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Landing } from '../pages/Landing/Landing';
import { Login } from '../pages/Login/Login';
import { Signup } from '../pages/Signup/Signup';
import { Onboarding } from '../pages/Onboarding/Onboarding';

import { AppLayout } from '../components/layout/AppLayout';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { IdentityTwin } from '../pages/IdentityTwin/IdentityTwin';
import { Learning } from '../pages/Learning/Learning';
import { Opportunity } from '../pages/Opportunity/Opportunity';
import { Planner } from '../pages/Planner/Planner';
import { Reflection } from '../pages/Reflection/Reflection';
import { Notifications } from '../pages/Notifications/Notifications';
import { Profile } from '../pages/Profile/Profile';
import { Analytics } from '../pages/Analytics/Analytics';
import { Assessments } from '../pages/Assessments/Assessments';
import { InstitutionAdmin } from '../pages/InstitutionAdmin/InstitutionAdmin';
import { ScheduleAssessment } from '../pages/InstitutionAdmin/ScheduleAssessment';
import { ScheduleContest } from '../pages/InstitutionAdmin/ScheduleContest';
import { ResultsLeaderboard } from '../pages/InstitutionAdmin/ResultsLeaderboard';
import { Contest } from '../pages/Contest/Contest';
import { ProtectedRoute } from './ProtectedRoute';
import { useApp } from '../context/AppContext';

/** Redirects INSTITUTION_ADMIN / PLATFORM_ADMIN away from student-only pages */
const StudentOnlyRoute: React.FC = () => {
  const { user } = useApp();
  const isAdmin = user.role === 'INSTITUTION_ADMIN' || user.role === 'PLATFORM_ADMIN';
  if (isAdmin) return <Navigate to="/institution/overview" replace />;
  return <Outlet />;
};

/** Redirects STUDENT away from admin-only pages */
const AdminOnlyRoute: React.FC = () => {
  const { user } = useApp();
  // Only block if we have a confirmed role (don't block empty/default state while loading)
  if (user.id && user.role === 'STUDENT') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Authenticated Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          {/* Shared routes (both students and admins can access) */}
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/contest" element={<Contest />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Student-only routes — admins get redirected to /institution/overview */}
          <Route element={<StudentOnlyRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/identity-twin" element={<IdentityTwin />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/opportunities" element={<Opportunity />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/reflection" element={<Reflection />} />
          </Route>

          {/* Admin-only routes — students get redirected to /dashboard */}
          <Route element={<AdminOnlyRoute />}>
            <Route path="/institution/overview" element={<InstitutionAdmin />} />
            <Route path="/institution/schedule-assessment" element={<ScheduleAssessment />} />
            <Route path="/institution/schedule-contest" element={<ScheduleContest />} />
            <Route path="/institution/results" element={<ResultsLeaderboard />} />
            <Route path="/institution/settings" element={<InstitutionAdmin />} />
          </Route>

        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
