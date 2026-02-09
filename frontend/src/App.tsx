import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupRoleSelectionPage from './pages/SignupRoleSelectionPage';
import SignupCandidatePage from './pages/SignupCandidatePage';
import SignupRecruiterPage from './pages/SignupRecruiterPage';
import SignupAdminPage from './pages/SignupAdminPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

// Recruiter pages
import RecruiterDashboardPage from './pages/recruiter/RecruiterDashboardPage';
import JobsPage from './pages/recruiter/JobsPage';
import CreateJobPage from './pages/recruiter/CreateJobPage';
import CustomQuestionsPage from './pages/recruiter/CustomQuestionsPage';
import AssessmentsPage from './pages/recruiter/AssessmentsPage';
import CandidatesPage from './pages/recruiter/CandidatesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="login/*" element={<LoginPage />} />
          <Route path="register" element={<SignupRoleSelectionPage />} />
          {/* Clerk handles its own sub-routes for verification, so use wildcard */}
          <Route path="register/candidate/*" element={<SignupCandidatePage />} />
          <Route path="register/recruiter/*" element={<SignupRecruiterPage />} />
          <Route path="register/admin/*" element={<SignupAdminPage />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Recruiter Routes */}
          <Route
            path="recruiter/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
                <RecruiterDashboardPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="recruiter/jobs"
            element={
              <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
                <JobsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="recruiter/jobs/new"
            element={
              <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
                <CreateJobPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="recruiter/questions"
            element={
              <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
                <CustomQuestionsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="recruiter/assessments"
            element={
              <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
                <AssessmentsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="recruiter/candidates"
            element={
              <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
                <CandidatesPage />
              </RoleProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
