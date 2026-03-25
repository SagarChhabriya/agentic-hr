import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RecruiterShell from './components/RecruiterShell';
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
// Candidate pages
import CandidateDashboardPage from './pages/candidate/CandidateDashboardPage';
import CandidateProfilePage from './pages/candidate/CandidateProfilePage';
import JobsPage from './pages/recruiter/JobsPage';
import CreateJobPage from './pages/recruiter/CreateJobPage';
import CustomQuestionsPage from './pages/recruiter/CustomQuestionsPage';
import AssessmentsPage from './pages/recruiter/AssessmentsPage';
import CandidatesPage from './pages/recruiter/CandidatesPage';
import RecruiterJobDetailPage from './pages/recruiter/RecruiterJobDetailPage';
import RecruiterEditJobPage from './pages/recruiter/RecruiterEditJobPage';
import RecruiterCandidateDetailPage from './pages/recruiter/RecruiterCandidateDetailPage';
import AssessmentDetailPage from './pages/recruiter/AssessmentDetailPage';
import RecruiterAnalyticsPage from './pages/recruiter/RecruiterAnalyticsPage';
import RecruiterCompanyPage from './pages/recruiter/RecruiterCompanyPage';
import AdminCompanyVerificationsPage from './pages/recruiter/AdminCompanyVerificationsPage';
import BrowseJobsPage from './pages/candidate/BrowseJobsPage';
import JobDetailPage from './pages/candidate/JobDetailPage';
import ApplyJobPage from './pages/candidate/ApplyJobPage';
import MyApplicationsPage from './pages/candidate/MyApplicationsPage';
import AssessmentAttemptPage from './pages/candidate/AssessmentAttemptPage';
import InterviewRoomPage from './pages/candidate/InterviewRoomPage';
import InterviewGuidePage from './pages/candidate/InterviewGuidePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public + candidate routes — use the public Layout with header/footer */}
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="login/*" element={<LoginPage />} />
          <Route path="jobs" element={<BrowseJobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route
            path="jobs/:id/apply"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <ApplyJobPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="candidate/apply/:job_id"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <ApplyJobPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="candidate/applications"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <MyApplicationsPage />
              </RoleProtectedRoute>
            }
          />
          <Route path="register" element={<SignupRoleSelectionPage />} />
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
          <Route
            path="assessment/attempt/:assessmentId"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <AssessmentAttemptPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="interview/room/:interviewId"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <InterviewRoomPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="candidate/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <CandidateDashboardPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="candidate/profile"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <CandidateProfilePage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="candidate/interview-guide"
            element={
              <RoleProtectedRoute allowedRoles={['CANDIDATE']}>
                <InterviewGuidePage />
              </RoleProtectedRoute>
            }
          />
        </Route>

        {/* Recruiter routes — RecruiterShell is the full-page layout, no public header */}
        <Route
          path="/recruiter"
          element={
            <RoleProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <RecruiterShell />
            </RoleProtectedRoute>
          }
        >
          <Route path="dashboard" element={<RecruiterDashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<CreateJobPage />} />
          <Route path="jobs/:id" element={<RecruiterJobDetailPage />} />
          <Route path="jobs/:id/edit" element={<RecruiterEditJobPage />} />
          <Route path="questions" element={<CustomQuestionsPage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="assessments/:id" element={<AssessmentDetailPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:id" element={<RecruiterCandidateDetailPage />} />
          <Route path="analytics" element={<RecruiterAnalyticsPage />} />
          <Route path="company" element={<RecruiterCompanyPage />} />
          <Route path="admin/companies" element={<AdminCompanyVerificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
