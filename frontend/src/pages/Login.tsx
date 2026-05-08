import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
	const { isAuthenticated, login } = useAuth();
	const navigate = useNavigate();

	// If already authenticated, redirect away from login
	useEffect(() => {
		if (isAuthenticated) {
			navigate("/timetable", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	return (
		<div className="flex justify-center items-center h-[calc(100svh-73px)] bg-slate-50/50">
			<div className="w-full max-w-sm mx-4">
				{/* Card */}
				<div className="bg-white border border-gray-200 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-10 relative overflow-hidden">
					{/* Decorative Glow */}
					<div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50" />

					{/* Header */}
					<div className="text-center mb-10 relative z-10">
						<h1 className="page-title tracking-tighter">Welcome back</h1>
						<p className="body-sm mt-3 font-medium text-slate-400">
							Sign in to manage your university schedule.
						</p>
					</div>

					{/* Google login button */}
					<button
						onClick={login}
						className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-50 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-slate-50 hover:border-slate-100 transition-all shadow-sm active:scale-[0.98] relative z-10"
					>
						{/* Google "G" SVG icon */}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 48 48"
							className="w-5 h-5"
							aria-hidden="true"
						>
							<path
								fill="#EA4335"
								d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.1-6.1C34.36 3.06 29.47 1 24 1 14.82 1 7.07 6.48 3.67 14.22l7.1 5.52C12.46 13.45 17.77 9.5 24 9.5z"
							/>
							<path
								fill="#4285F4"
								d="M46.52 24.5c0-1.64-.15-3.22-.42-4.74H24v8.98h12.7c-.55 2.94-2.2 5.43-4.68 7.1l7.18 5.58C43.44 37.42 46.52 31.4 46.52 24.5z"
							/>
							<path
								fill="#FBBC05"
								d="M10.77 28.26A14.54 14.54 0 0 1 9.5 24c0-1.48.25-2.91.7-4.26l-7.1-5.52A23.93 23.93 0 0 0 0 24c0 3.87.93 7.53 2.57 10.76l8.2-6.5z"
							/>
							<path
								fill="#34A853"
								d="M24 47c5.47 0 10.06-1.81 13.41-4.92l-7.18-5.58c-1.98 1.33-4.52 2.12-6.23 2.12-6.23 0-11.54-3.95-13.23-9.36l-8.2 6.5C7.07 41.52 14.82 47 24 47z"
							/>
						</svg>
						Continue with Google
					</button>

					{/* Divider */}
					<div className="mt-8 flex items-center gap-4 relative z-10">
						<div className="flex-1 h-px bg-slate-100" />
						<span className="body-xs font-bold text-slate-300 uppercase tracking-widest text-center leading-relaxed">
							University SSO Only
						</span>
						<div className="flex-1 h-px bg-slate-100" />
					</div>
				</div>

				{/* Footer note */}
				<p className="text-center body-xs font-medium text-slate-400 mt-8 px-6 leading-relaxed">
					By signing in, you acknowledge and agree to the institution's
					computing resources usage policy.
				</p>
			</div>
		</div>
	);
};

export default Login;
