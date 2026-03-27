import React from 'react';
import { Gamepad2, Code2 } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#232527] to-[#000000] text-white">
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-16 text-center">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-[#FF0000] to-[#00A2FF] bg-clip-text text-transparent">
            ROBLOX
          </h1>
          <p className="text-xl mt-4 text-gray-300">Powering Imagination™</p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Executor Card */}
          <div className="group backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 rounded-3xl p-8 flex flex-col items-center">
            <div className="bg-[#FF0000] rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
              <Gamepad2 size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Executor</h2>
            <p className="text-gray-300 text-center mb-6">Run your favorite scripts with our powerful executor</p>
            <button className="bg-gradient-to-r from-[#FF0000] to-[#FF3333] hover:opacity-90 text-white font-semibold py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
              Browse
            </button>
          </div>

          {/* Scripts Card */}
          <div className="group backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-300 rounded-3xl p-8 flex flex-col items-center">
            <div className="bg-[#00A2FF] rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
              <Code2 size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Scripts</h2>
            <p className="text-gray-300 text-center mb-6">Access our vast library of premium scripts</p>
            <button className="bg-gradient-to-r from-[#00A2FF] to-[#33B1FF] hover:opacity-90 text-white font-semibold py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
              Browse
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-400">
          <p>© 2025 Roblox Clone. This is a demo website.</p>
          <p className="text-sm mt-2">Not affiliated with Roblox Corporation</p>
        </div>
      </div>
    </div>
  );
}

export default App;