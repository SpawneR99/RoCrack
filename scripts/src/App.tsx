import React from 'react';
import { ExternalLink } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="relative space-y-6 text-center">
        <div className="relative p-8">
          <h1 className="text-5xl font-bold text-white mb-12 tracking-tight">
            Select Your Script
          </h1>
          
          <div className="space-y-6">
            <a
              href="#"
              className="glass flex items-center justify-between w-full sm:w-96 px-8 py-6 
              text-white rounded-2xl transition-all duration-500 hover:scale-105 group
              hover:bg-white/10 hover:border-white/30"
            >
              <span className="text-2xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text">
                Blox Fruits
              </span>
              <ExternalLink className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-all duration-500" />
            </a>

            <a
              href="#"
              className="glass flex items-center justify-between w-full sm:w-96 px-8 py-6 
              text-white rounded-2xl transition-all duration-500 hover:scale-105 group
              hover:bg-white/10 hover:border-white/30"
            >
              <span className="text-2xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text">
                Fisch Script
              </span>
              <ExternalLink className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-all duration-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;