import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Flame } from "lucide-react";

export default function Splash() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    // Navigate to welcome after 3 seconds
    const timer = setTimeout(() => {
      setLocation("/welcome");
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4">
      {/* Logo and Title */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-full">
            <Flame className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">FIRE ALERT</h1>
          <p className="text-orange-400 text-sm font-semibold tracking-widest">SYSTEM</p>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-center text-gray-300 mb-16 max-w-sm text-lg">
        Real-time Fire Monitoring and Emergency Response
      </p>

      {/* Loading Bar */}
      <div className="w-full max-w-xs">
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-center text-gray-400 text-xs mt-4">Loading...</p>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-orange-500/5 to-transparent"></div>
    </div>
  );
}
