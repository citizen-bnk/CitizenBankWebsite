import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';

export function LoadingProgress() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (navigation.state === 'loading') {
      setIsLoading(true);
      setProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90; // Stop at 90% until actual load completes
          return prev + Math.random() * 15;
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (navigation.state === 'idle' && isLoading) {
      // Complete the progress
      setProgress(100);
      
      // Hide after animation
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [navigation.state, isLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top loading bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-[#6d52a2] to-[#8f6ec4] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Percentage counter overlay with customer photo background */}
      {progress < 100 && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("/brand/HappyCitizen%201.webp")'
          }}
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#6d52a2]/95 via-[#6d52a2]/85 to-[#5a4289]/75 backdrop-blur-sm" />
          
          {/* Loading content */}
          <div className="relative text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              {/* Circular progress */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              
              {/* Percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            
            <p className="text-sm text-white font-medium">Loading...</p>
          </div>
        </div>
      )}
    </>
  );
}
