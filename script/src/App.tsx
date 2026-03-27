import React, { useState, useEffect } from 'react';
import { Terminal, Search, Check, AlertCircle, Download, ChevronDown, Loader2 } from 'lucide-react';

function App() {
  const [step, setStep] = useState(1);
  const [robloxId, setRobloxId] = useState('');
  const [searching, setSearching] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [installEnabled, setInstallEnabled] = useState(false);
  const [selectedScript, setSelectedScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ minutes: 1, seconds: 25 });
  const [generatedKey, setGeneratedKey] = useState('');
  const [processing, setProcessing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(850);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const scripts = [
    { name: 'Unfair Hub', downloads: '2.4M' },
    { name: 'Forge Hub', downloads: '2.4M' },
    { name: 'Oblivion V1', downloads: '1.6M' },
    { name: 'Bean Hub', downloads: '1.4M' },
    { name: 'Mango Hub', downloads: '1.2M' },
    { name: 'Stingray', downloads: '1.2M' },
    { name: 'PEELY HUB', downloads: '1.2M' },
    { name: 'XIBA HUB', downloads: '1.2M' },
    { name: 'Soggyware', downloads: '1.1M' },
    { name: 'BT Project', downloads: '1.1M' },
    { name: 'Project M', downloads: '1.1M' },
    { name: 'Sub Hub v3', downloads: '1.1M' },
    { name: 'BANANA S', downloads: '1.1M' },
    { name: 'CHIBB HUB', downloads: '1.0M' },
    { name: 'PS99', downloads: '999.8k' },
    { name: 'SystemB', downloads: '980.1k' },
    { name: 'Versus', downloads: '970.1k' },
    { name: 'UC Hub', downloads: '968.2k' },
  ];

  // Get current date in a readable format
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Update online users randomly
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers(prev => {
        const change = Math.floor(Math.random() * 20) - 10; // Random number between -10 and 10
        const newValue = prev + change;
        return Math.min(Math.max(newValue, 800), 900); // Keep between 800 and 900
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const simulateProgress = (duration: number, callback: () => void) => {
    setLoadingProgress(0);
    const startTime = Date.now();
    
    const updateProgress = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      setLoadingProgress(Math.floor(progress));
      
      if (progress < 100) {
        requestAnimationFrame(updateProgress);
      } else {
        callback();
      }
    };
    
    requestAnimationFrame(updateProgress);
  };

  const searchUser = async () => {
    if (!robloxId) return;
    setSearching(true);
    
    simulateProgress(5000, () => {
      setSearching(false);
      setUserFound(true);
      setStep(2);
    });
  };

  const handleContinue = async () => {
    if (!selectedScript) return;
    setLoading(true);
    
    simulateProgress(5000, () => {
      setLoading(false);
      setStep(3);
      setGeneratedKey('KEY_1a13dd88f189ace4f2e568**********');
    });
  };

  useEffect(() => {
    if (step === 3 && timeLeft.minutes >= 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev.seconds > 0) {
            return { ...prev, seconds: prev.seconds - 1 };
          } else if (prev.minutes > 0) {
            return { minutes: prev.minutes - 1, seconds: 59 };
          } else {
            clearInterval(timer);
            return prev;
          }
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Loading Overlay Component
  const LoadingOverlay = ({ message }: { message: string }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900/90 p-8 rounded-xl border border-zinc-800/50 shadow-2xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          <div className="space-y-3 w-full">
            <p className="text-lg text-center text-zinc-300">{message}</p>
            <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-center text-zinc-500">{Math.floor(loadingProgress)}%</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Loading Overlays */}
      {searching && <LoadingOverlay message="Searching for user..." />}
      {loading && <LoadingOverlay message="Processing your request..." />}

      {/* Top Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-zinc-900 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Terminal className="w-12 h-12 text-blue-500" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Delta Executor
              </h1>
            </div>
            
            {/* Description */}
            <p className="text-lg text-zinc-400 max-w-2xl text-center">
              The most powerful and reliable Roblox script executor, trusted by millions of users worldwide.
            </p>
            
            {/* Stats */}
            <div className="flex items-center space-x-8 text-sm">
              <div className="text-zinc-500">
                Date Updated: <span className="text-zinc-300">{currentDate}</span>
              </div>
              <div className="text-zinc-500">
                Online Users: <span className="text-emerald-400">{onlineUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Roblox ID */}
          {step === 1 && (
            <div className="bg-zinc-900/50 backdrop-blur p-8 rounded-xl border border-zinc-800/50 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center">Enter Your Roblox ID</h2>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={robloxId}
                    onChange={(e) => setRobloxId(e.target.value)}
                    placeholder="Enter Roblox ID"
                    className="w-full bg-black/50 p-4 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-zinc-800/50"
                  />
                  <button
                    onClick={searchUser}
                    disabled={searching || !robloxId}
                    className="absolute right-2 top-2 bg-blue-500 p-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {searching ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <Search className="w-6 h-6" />
                    )}
                  </button>
                </div>
                {userFound && (
                  <div className="flex items-center justify-center space-x-2 text-emerald-400">
                    <Check className="w-5 h-5" />
                    <span>User Found!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Script Selection */}
          {step === 2 && (
            <div className="bg-zinc-900/50 backdrop-blur p-8 rounded-xl border border-zinc-800/50 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-center">Select Script</h2>
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    id="install"
                    checked={installEnabled}
                    onChange={(e) => setInstallEnabled(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500 bg-black border-zinc-700"
                  />
                  <label htmlFor="install" className="text-lg text-zinc-300">
                    Install the latest version of Delta Executor to "{robloxId}"
                  </label>
                </div>

                <select
                  value={selectedScript}
                  onChange={(e) => setSelectedScript(e.target.value)}
                  disabled={!installEnabled}
                  className="w-full bg-black/50 p-4 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 border border-zinc-800/50"
                >
                  <option value="">Select a script</option>
                  {scripts.map((script) => (
                    <option key={script.name} value={script.name}>
                      {script.name} - {script.downloads} downloads
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleContinue}
                  disabled={!installEnabled || !selectedScript || loading}
                  className="w-full bg-blue-500 p-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Final Step */}
          {step === 3 && (
            <div className="bg-zinc-900/50 backdrop-blur p-8 rounded-xl border border-zinc-800/50 shadow-2xl">
              <div className="text-center space-y-6">
                <div className="text-emerald-400 flex items-center justify-center space-x-2">
                  <Check className="w-6 h-6" />
                  <span className="text-xl font-bold">API CONNECTED!</span>
                </div>

                <p className="text-zinc-400">
                  You have successfully connected your account to the Delta Executor Server API using this online tool!
                </p>

                <div className="bg-black/50 p-6 rounded-lg border border-zinc-800/50">
                  <div className="mb-4">
                    <p className="text-zinc-500">User Connected:</p>
                    <p className="text-xl font-semibold text-zinc-300">{robloxId}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-zinc-500">ACTIVATION KEY GENERATED:</p>
                    <p className="text-xl font-mono text-emerald-400">{generatedKey}</p>
                  </div>

                  <div>
                    <p className="text-zinc-500">Time Left:</p>
                    <p className="text-xl text-amber-400">
                      {timeLeft.minutes}Minutes {timeLeft.seconds}Seconds
                    </p>
                  </div>
                </div>

                <button className="w-full bg-blue-500 p-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                  Complete CAPTCHA Verification
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;