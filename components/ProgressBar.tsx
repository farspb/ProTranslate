import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  colorClass?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label, 
  colorClass = "bg-primary-600" 
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-700">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-300 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-300 ease-out ${colorClass}`} 
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
};