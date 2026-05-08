import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
	error?: string | null;
	onRetry?: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
	return (
		<div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 min-h-[400px]">
			<div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mb-8 border border-rose-100 shadow-sm animate-in zoom-in duration-500">
				<AlertCircle size={32} />
			</div>

			<h2 className="display-title text-gray-900 tracking-tighter">
				System Error
			</h2>

			<div className="mt-4 max-w-md mx-auto">
				<p className="body-md font-medium text-slate-500 leading-relaxed italic">
					"
					{error ||
						"An unexpected synchronization failure occurred within the application core."}
					"
				</p>
			</div>

			{onRetry && (
				<button
					onClick={onRetry}
					className="mt-10 inline-flex items-center gap-2 px-8 py-3 bg-gray-950 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95 group"
				>
					<RefreshCw
						size={14}
						className="group-hover:rotate-180 transition-transform duration-500"
					/>
					Retry Request
				</button>
			)}

			<p className="mt-12 body-xs font-bold text-slate-300 uppercase tracking-widest">
				Error Reference: {new Date().getTime().toString(36).toUpperCase()}
			</p>
		</div>
	);
};

export default ErrorState;
