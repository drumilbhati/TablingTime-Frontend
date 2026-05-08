import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSchedulingReport } from "../context/SchedulingReportContext";

const Navbar = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated, userRole, userName, authLoading, logout } =
		useAuth();
	const { hasVisibleReport } = useSchedulingReport();

	const isActive = (path: string) => location.pathname === path;

	const isAdmin = userRole === "admin";
	const navButtonClass = (path: string) =>
		`px-3 py-2 text-sm font-medium transition-colors ${
			isActive(path) ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
		}`;

	const getRoleBadgeStyle = (role: string) => {
		switch (role) {
			case "admin":
				return "bg-red-50 text-red-700 border-red-100";
			case "faculty":
				return "bg-blue-50 text-blue-700 border-blue-100";
			case "student":
				return "bg-green-50 text-green-700 border-green-100";
			default:
				return "bg-gray-50 text-gray-700 border-gray-100";
		}
	};

	return (
		<nav className="top-0 left-0 w-full bg-white border-b border-gray-200 z-50">
			<div className="max-w-full mx-auto px-6 py-3 flex justify-between items-center">
				{/* Logo */}
				<div
					className="app-brand cursor-pointer hover:opacity-70 transition-opacity"
					onClick={() => navigate("/")}
				>
					TablingTime
				</div>

				{/* Nav links */}
				<div className="flex items-center gap-4">
					<button
						onClick={() => navigate("/timetable")}
						className={navButtonClass("/timetable")}
					>
						Timetable
					</button>

					{/* Admin-only nav links */}
					{isAdmin && (
						<>
							<button
								onClick={() => navigate("/occupied")}
								className={navButtonClass("/occupied")}
							>
								Occupied
							</button>
							<button
								onClick={() => navigate("/vacant")}
								className={navButtonClass("/vacant")}
							>
								Vacant
							</button>
							<button
								onClick={() => navigate("/enrolment")}
								className={navButtonClass("/enrolment")}
							>
								Enrolment
							</button>
							<button
								onClick={() => navigate("/professor-preferences")}
								className={navButtonClass("/professor-preferences")}
							>
								Preferences
							</button>
							<button
								onClick={() => navigate("/scheduler")}
								className={`${navButtonClass("/scheduler")} relative flex items-center gap-2`}
							>
								Scheduler
								{hasVisibleReport ? (
									<span className="inline-flex h-2 w-2 rounded-full bg-red-500 shadow-sm" />
								) : null}
							</button>
						</>
					)}

					{/* Auth section */}
					{authLoading ? (
						<div className="w-20 h-8 bg-gray-50 rounded animate-pulse" />
					) : isAuthenticated ? (
						<div className="flex items-center gap-4 border-l border-gray-100 pl-4">
							{/* Name + role */}
							<div className="flex flex-col items-end">
								{userName && (
									<span className="text-xs font-bold text-gray-900 leading-none tracking-tight">
										{userName}
									</span>
								)}
								{userRole && (
									<span
										className={`badge-label mt-1 ${getRoleBadgeStyle(userRole)}`}
									>
										{userRole}
									</span>
								)}
							</div>

							{/* Logout button */}
							<button
								onClick={logout}
								className="btn-outline px-3 py-1.5 text-xs"
							>
								Logout
							</button>
						</div>
					) : (
						<button
							onClick={() => navigate("/login")}
							className="btn-primary px-4 py-1.5 text-xs"
						>
							Login
						</button>
					)}
				</div>
			</div>
		</nav>
	);
};

export default Navbar;
