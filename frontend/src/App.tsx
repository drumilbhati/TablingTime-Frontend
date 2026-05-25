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
import { useAuth } from "./context/AuthContext.tsx";

import { Toaster } from "sonner";
import { LoaderCircle, Sparkles } from "lucide-react";

// Redirects non-admin users away from admin-only routes.
// Shows nothing while auth is still loading to avoid a flash redirect.
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated, userRole, authLoading } = useAuth();

	if (authLoading) {
		return (
			<div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-gradient-to-b from-white via-gray-50 to-white px-4 py-12">
				<div className="w-full max-w-md rounded-[2rem] border border-gray-100 bg-white p-8 shadow-xl shadow-black/5 text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20">
						<LoaderCircle size={30} className="animate-spin" />
					</div>
					<div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
						<Sparkles size={12} />
						Loading session
					</div>
					<h1 className="mt-4 text-2xl font-black text-gray-900">
						Checking your access
					</h1>
					<p className="mt-2 text-sm leading-6 text-gray-500">
						We’re verifying your session and preparing the timetable page.
						This may take a moment while the backend finishes scheduler automation processing.
					</p>
					<div className="mt-7 h-2 overflow-hidden rounded-full bg-gray-100">
						<div className="h-full w-1/3 rounded-full bg-gradient-to-r from-black via-gray-500 to-amber-400 animate-[loading-bar_1.5s_ease-in-out_infinite]" />
					</div>
				</div>
			</div>
		);
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
				<SchedulingReportProvider>
					<CoursesProvider>
						<div className="min-h-screen">
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
			</AuthProvider>
		</GoogleOAuthProvider>
	);
}

export default App;
