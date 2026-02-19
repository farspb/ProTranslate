import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { Spinner } from './components/Spinner';
import { ProgressBar } from './components/ProgressBar';
import { Language, LoadingState, FileData } from './types';
import { translateTextStream } from './services/geminiService';
import { downloadFile } from './utils/fileHelpers';
import { ArrowRightLeft, Download, FileText, CheckCircle2, AlertCircle, Sparkles, PenLine, UploadCloud, Loader2, Save } from 'lucide-react';
import { LANGUAGE_OPTIONS, EXPORT_EXTENSIONS } from './constants';

type InputMode = 'manual' | 'file';
type SaveStatus = 'idle' | 'preparing';

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState<Language>(Language.AUTO);
  const [targetLang, setTargetLang] = useState<Language>(Language.PERSIAN);
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [status, setStatus] = useState<LoadingState>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  // Progress states
  const [progress, setProgress] = useState<number>(0);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  
  // Custom save settings
  const [saveFileName, setSaveFileName] = useState<string>('');
  const [saveExtension, setSaveExtension] = useState<string>('.txt');

  const handleFileLoaded = (fileData: FileData) => {
    setCurrentFile(fileData);
    setInputText(fileData.content);
    setSaveFileName(`${fileData.name}_translated`);
    
    // Determine best default extension
    const ext = fileData.extension.toLowerCase();
    const isExportable = EXPORT_EXTENSIONS.includes(ext);
    setSaveExtension(isExportable ? ext : '.txt');
    
    setInputMode('manual');
    setStatus('idle');
    setOutputText('');
    setProgress(0);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setStatus('translating');
    setOutputText('');
    setProgress(0);

    // Estimation: Output is usually roughly 1.0 - 1.3 times the input length depending on language.
    // We use 1.2 as a heuristic for progress calculation.
    const estimatedLength = inputText.length * 1.2;
    let currentLength = 0;

    try {
      const stream = translateTextStream(inputText, sourceLang, targetLang);
      
      for await (const chunk of stream) {
        setOutputText(prev => {
          const newText = prev + chunk;
          currentLength = newText.length;
          return newText;
        });

        // Calculate progress based on length
        const rawProgress = (currentLength / estimatedLength) * 100;
        // Cap at 95% until finished to avoid overshooting
        setProgress(Math.min(rawProgress, 95));
      }

      setProgress(100);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!outputText) return;
    
    setSaveStatus('preparing');
    setSaveProgress(0);

    // Simulate save steps with progress bar
    const steps = [
      { pct: 20, delay: 200 }, // Preparing data
      { pct: 50, delay: 400 }, // Encoding content
      { pct: 80, delay: 300 }, // Creating Blob
      { pct: 100, delay: 200 } // Triggering Download
    ];

    let totalDelay = 0;

    steps.forEach((step, index) => {
      totalDelay += step.delay;
      setTimeout(() => {
        setSaveProgress(step.pct);
        
        if (index === steps.length - 1) {
          // Final step: actually download
          try {
            downloadFile(outputText, saveFileName || 'translation', saveExtension);
          } catch (e) {
            console.error("Download failed", e);
            alert("Failed to save file.");
          } finally {
            // Small delay to show 100% before closing overlay
            setTimeout(() => {
              setSaveStatus('idle');
              setSaveProgress(0);
            }, 500);
          }
        }
      }, totalDelay);
    });
  };

  const swapLanguages = () => {
    if (sourceLang === Language.AUTO) {
      setSourceLang(targetLang);
      setTargetLang(Language.ENGLISH); 
    } else {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  };

  const getDir = (lang: Language) => {
    return lang === Language.PERSIAN ? 'rtl' : 'ltr';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-2 w-full md:w-auto">
               <select 
                  value={sourceLang} 
                  onChange={(e) => setSourceLang(e.target.value as Language)}
                  className="w-full md:w-48 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 outline-none transition-colors"
                >
                  <option value={Language.AUTO}>{Language.AUTO}</option>
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <button 
                  onClick={swapLanguages}
                  className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                  title="Swap languages"
                >
                  <ArrowRightLeft size={20} />
                </button>

                <select 
                  value={targetLang} 
                  onChange={(e) => setTargetLang(e.target.value as Language)}
                  className="w-full md:w-48 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 outline-none transition-colors"
                >
                  {LANGUAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
            </div>

            <button
              onClick={handleTranslate}
              disabled={status === 'translating' || !inputText}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all
                ${status === 'translating' || !inputText
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md active:transform active:scale-95'
                }`}
            >
              {status === 'translating' ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Translate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)] min-h-[600px]">
          
          {/* Source Column */}
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50/50">
                <button
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${inputMode === 'manual' 
                      ? 'text-primary-600 bg-white border-b-2 border-primary-600' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <PenLine size={16} />
                  Enter Text
                </button>
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${inputMode === 'file' 
                      ? 'text-primary-600 bg-white border-b-2 border-primary-600' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <UploadCloud size={16} />
                  Upload File
                </button>
              </div>
              
              <div className="flex-grow relative bg-white">
                {inputMode === 'manual' ? (
                  <div className="h-full relative">
                    {currentFile && (
                      <div className="absolute top-2 right-2 z-10 bg-primary-50 border border-primary-200 text-primary-700 text-xs px-2 py-1 rounded flex items-center gap-1">
                        <FileText size={10} />
                        From: {currentFile.name}
                      </div>
                    )}
                    <textarea 
                      className={`w-full h-full p-4 resize-none outline-none text-gray-800 leading-relaxed font-sans ${sourceLang === Language.PERSIAN ? 'font-persian' : ''}`}
                      placeholder="Type text or paste content here..."
                      dir={sourceLang === Language.PERSIAN ? 'rtl' : 'ltr'}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="h-full p-6">
                    <FileUploader onFileLoaded={handleFileLoaded} isLoading={status === 'translating'} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Target Column */}
          <div className="flex flex-col gap-4 h-full">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden relative">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  Translation
                </h2>
                {status === 'success' && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Completed
                  </span>
                )}
              </div>

              <div className="flex-grow p-4 bg-white relative">
                 {status === 'translating' && (
                   <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                     <div className="w-full max-w-sm text-center bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                       <Spinner size={48} className="text-primary-600 mx-auto mb-4" />
                       <h3 className="text-lg font-bold text-gray-900 mb-4">Translating...</h3>
                       
                       <ProgressBar progress={progress} />
                       
                       <div className="flex justify-between text-xs font-medium text-gray-500 mt-2 px-1">
                         <span>Done: {Math.round(progress)}%</span>
                         <span>Remaining: {100 - Math.round(progress)}%</span>
                       </div>
                       
                       <p className="text-xs text-gray-400 mt-4 animate-pulse">
                         Generating professional translation...
                       </p>
                     </div>
                   </div>
                 )}
                 
                 {status === 'error' && (
                   <div className="absolute inset-0 z-10 flex items-center justify-center">
                     <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center max-w-md">
                       <AlertCircle size={48} className="mx-auto text-red-500 mb-2" />
                       <h3 className="text-red-800 font-semibold">Translation Failed</h3>
                       <p className="text-red-600 text-sm mt-1">There was an error processing your request.</p>
                       <button 
                          onClick={() => setStatus('idle')}
                          className="mt-4 text-sm bg-white border border-red-200 text-red-700 px-4 py-2 rounded hover:bg-red-50 transition-colors"
                       >
                         Dismiss
                       </button>
                     </div>
                   </div>
                 )}

                 <textarea 
                    className={`w-full h-full resize-none outline-none text-gray-800 leading-relaxed ${targetLang === Language.PERSIAN ? 'font-persian text-right' : 'font-sans text-left'}`}
                    placeholder="Translation will appear here..."
                    dir={getDir(targetLang)}
                    value={outputText}
                    readOnly
                  />
              </div>

              {/* Download Controls */}
              {outputText && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-grow w-full flex items-center gap-2">
                    <input 
                      type="text" 
                      value={saveFileName}
                      onChange={(e) => setSaveFileName(e.target.value)}
                      placeholder="Filename"
                      className="flex-1 min-w-0 bg-white border border-gray-300 text-sm rounded-lg p-2 outline-none focus:border-primary-500"
                    />
                    <select 
                      value={saveExtension}
                      onChange={(e) => setSaveExtension(e.target.value)}
                      className="w-24 bg-white border border-gray-300 text-sm rounded-lg p-2 outline-none focus:border-primary-500 cursor-pointer text-center"
                    >
                      {EXPORT_EXTENSIONS.map(ext => (
                        <option key={ext} value={ext}>{ext}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleDownload}
                    disabled={saveStatus === 'preparing'}
                    className={`w-full sm:w-auto px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors
                      ${saveStatus === 'preparing' 
                        ? 'bg-gray-300 text-gray-700 cursor-wait' 
                        : 'bg-gray-900 hover:bg-black text-white'}`}
                  >
                    <Download size={16} />
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Global Saving Overlay */}
      {saveStatus === 'preparing' && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center">
            <div className="bg-primary-50 p-4 rounded-full mb-4">
              <Save className="text-primary-600" size={32} />
            </div>
            
            <h4 className="text-xl font-bold text-gray-900 mb-2">Saving File...</h4>
            
            <div className="w-full mt-4">
              <ProgressBar progress={saveProgress} />
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                <span>Processing...</span>
                <span>{saveProgress}%</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-6 text-center">
              Please wait while we encode and prepare your download.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;