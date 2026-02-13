import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white h-screen p-5 flex flex-col shadow-xl border-r border-gray-700">
      
      {/* Logo / Title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 w-10 h-10 flex items-center justify-center rounded-xl font-bold text-lg shadow-md">
          SCM
        </div>
        <h2 className="text-xl font-bold tracking-wide">SCM System</h2>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-3 text-sm font-medium">
        
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-600/80 transition-all duration-200 hover:translate-x-1"
        >
          📦 Inventory Dashboard
        </Link>

        <Link
          to="/supplier"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-600/80 transition-all duration-200 hover:translate-x-1"
        >
          🤝 Supplier Portal
        </Link>

        <Link
          to="/forecast"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-600/80 transition-all duration-200 hover:translate-x-1"
        >
          📊 Forecast Dashboard
        </Link>

        <Link
          to="/orders"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-600/80 transition-all duration-200 hover:translate-x-1"
        >
          🚚 Order Tracking
        </Link>

      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-gray-700 text-xs text-gray-400">
        © 2026 SCM Platform
      </div>

    </div>
  );
}
export default Sidebar;