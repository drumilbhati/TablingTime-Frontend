import { LoaderCircle, Sparkles } from "lucide-react";

const SessionLoadingScreen = () => {
	return (
		<div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-gradient-to-b from-white via-gray-50 to-white px-4 py-12">
			<div className="w-full max-w-md rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-xl shadow-black/5">
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
};

export default SessionLoadingScreen;