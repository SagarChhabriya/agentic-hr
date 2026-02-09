export default function Footer() {
  return (
    <footer className="mt-8 border-t border-gray-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm">
        <p className="mb-2 sm:mb-0 opacity-70">
          © {new Date().getFullYear()} Agentic HR Automation. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <a href="#about" className="hover:underline">
            About
          </a>
          <a href="#privacy" className="hover:underline">
            Privacy
          </a>
          <a href="#terms" className="hover:underline">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}

