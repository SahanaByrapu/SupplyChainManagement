function Navbar() {
  return (
    
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 
                    shadow-lg px-6 py-3 flex justify-between items-center 
                    sticky top-0 z-50">

      {/* Left Section */}
      <div className="flex items-center gap-3">
        <div className="bg-white text-indigo-600 font-bold px-3 py-1 
                        rounded-xl shadow">
          SCM
        </div>

        <h1 className="font-bold text-lg text-white tracking-wide 
                       hidden md:block">
          Supply Chain & Inventory Management
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search inventory, orders..."
          className="hidden md:block px-3 py-1.5 rounded-lg text-sm 
                     outline-none text-black shadow"
        />

        {/* Notification Bell */}
        <div className="relative cursor-pointer">
          <span className="text-xl">🔔</span>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                           text-xs w-4 h-4 flex items-center justify-center 
                           rounded-full">
            3
          </span>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 
                        rounded-xl cursor-pointer hover:bg-white/30 transition">
          <div className="w-8 h-8 bg-white text-indigo-600 font-bold 
                          flex items-center justify-center rounded-full">
            A
          </div>
          <span className="text-white text-sm font-medium hidden md:block">
            Admin
          </span>
        </div>

      </div>
    </div>
  );
}





export default Navbar; 