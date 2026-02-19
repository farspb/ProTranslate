import React from 'react';
import { Languages } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary-600 p-2 rounded-lg text-white">
            <Languages size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">ProTranslatio</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Professional AI Translation</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
           <span className="hidden md:inline font-persian">مترجم هوشمند و حرفه‌ای</span>
        </div>
      </div>
    </header>
  );
};