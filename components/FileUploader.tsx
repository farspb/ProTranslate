import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileType } from 'lucide-react';
import { FileData } from '../types';
import { readFileAsText, parseFileName } from '../utils/fileHelpers';
import { SUPPORTED_EXTENSIONS } from '../constants';
import { ProgressBar } from './ProgressBar';

interface FileUploaderProps {
  onFileLoaded: (fileData: FileData) => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isReading, setIsReading] = useState<boolean>(false);

  const handleFileChange = async (file: File) => {
    setIsReading(true);
    setUploadProgress(0);
    
    try {
      const content = await readFileAsText(file, (percent) => {
        setUploadProgress(percent);
      });
      
      const { name, extension } = parseFileName(file.name);
      
      // Small delay to let user see 100%
      setTimeout(() => {
        onFileLoaded({ name, content, extension });
        setIsReading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error("Error reading file:", error);
      alert("Failed to read file. Please ensure it is a valid supported file.");
      setIsReading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isLoading || isReading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [isLoading, isReading]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  if (isReading) {
    return (
      <div className="border-2 border-dashed border-primary-200 bg-primary-50 rounded-xl p-8 h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-xs text-center space-y-4">
          <div className="bg-white p-4 rounded-full inline-block shadow-sm">
            <FileType className="text-primary-600 animate-pulse" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Reading File...</h3>
          <ProgressBar progress={uploadProgress} />
          <p className="text-xs text-gray-500">{uploadProgress}% Loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 h-full flex flex-col items-center justify-center relative
        ${isLoading ? 'opacity-50 cursor-not-allowed border-gray-300' : 'border-primary-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer'}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => !isLoading && !isReading && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef}
        accept={SUPPORTED_EXTENSIONS.join(',')}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="bg-primary-100 p-4 rounded-full text-primary-600">
          <Upload size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Drop file to translate</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            Supports PDF (unlimited size), TXT, MD, JSON, CSV, and more.
          </p>
        </div>
      </div>
    </div>
  );
};