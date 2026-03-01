interface ErrorStateProps {
  error?: string | null;
  onRetry?: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load courses
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {error
            ? error
            : "Could not reach the server. Check your connection and try again."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
