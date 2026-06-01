import "./App.css";
import Navbar from "./components/Navbar.tsx";
import Footer from "./components/Footer";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import TimetablePage from "./pages/TimetablePage.tsx";

import OccupiedRooms from "./pages/OccupiedRooms.tsx";
import VacantRooms from "./pages/VacantRooms.tsx";
import EnrolmentPage from "./pages/EnrolmentPage.tsx";
import ProfessorPreferences from "./pages/ProfessorPreferences.tsx";
import ManualScheduler from "./pages/ManualScheduler.tsx";
import CoursesBySchool from "./pages/CoursesBySchool.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext.tsx";
import { CoursesProvider } from "./context/CoursesContext.tsx";
import { SchedulingReportProvider } from "./context/SchedulingReportContext.tsx";
import { NotificationProvider } from "./context/NotificationContext";
import { useAuth } from "./context/AuthContext.tsx";
import SessionLoadingScreen from "./components/SessionLoadingScreen";
import ScrollToTop from "./components/ScrollToTop";

import { Toaster } from "sonner";

// Redirects non-admin users away from admin-only routes.
// Shows nothing while auth is still loading to avoid a flash redirect.
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated, userRole, authLoading } = useAuth();

	if (authLoading) {
		return <SessionLoadingScreen />;
	}

	if (!isAuthenticated || userRole !== "admin") {
		return <Navigate to="/timetable" replace />;
	}

	return <>{children}</>;
};

function App() {
	return (
		<GoogleOAuthProvider clientId="169828270266-4rvkkr0t2p9l1l8g74akau8k5e4peprn.apps.googleusercontent.com">
			<AuthProvider>
				<NotificationProvider>
				<SchedulingReportProvider>
					<CoursesProvider>
						<div className="min-h-screen">
							<ScrollToTop />
							<Toaster richColors position="top-right" closeButton />
							<Navbar />
							<Routes>
								<Route
									path="/"
									element={<Navigate to="/timetable" replace />}
								/>
								<Route path="/timetable" element={<TimetablePage />} />

								<Route
									path="/occupied"
									element={
										<AdminRoute>
											<OccupiedRooms />
										</AdminRoute>
									}
								/>
								<Route
									path="/vacant"
									element={
										<AdminRoute>
											<VacantRooms />
										</AdminRoute>
									}
								/>
								<Route
									path="/enrolment"
									element={
										<AdminRoute>
											<EnrolmentPage />
										</AdminRoute>
									}
								/>
								<Route
									path="/professor-preferences"
									element={
										<AdminRoute>
											<ProfessorPreferences />
										</AdminRoute>
									}
								/>
								<Route
									path="/courses-by-school"
									element={
										<AdminRoute>
											<CoursesBySchool />
										</AdminRoute>
									}
								/>
								<Route
									path="/scheduler"
									element={
										<AdminRoute>
											<ManualScheduler />
										</AdminRoute>
									}
								/>
								<Route path="/login" element={<Login />} />
							</Routes>
							<Footer />
						</div>
					</CoursesProvider>
				</SchedulingReportProvider>
				</NotificationProvider>
			</AuthProvider>
		</GoogleOAuthProvider>
	);
}

export default App;
