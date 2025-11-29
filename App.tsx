
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, Panel, Character, Script, AppStep } from './types';
import { ProjectContext } from './hooks/useProjectContext';
import { hasApiKey } from './services/geminiService';

import WizardNav from './components/wizard/WizardNav';
import Step1Topic from './components/wizard/Step1Topic';
import Step2Script from './components/wizard/Step2Script';
import Step3Characters from './components/wizard/Step3Characters';
import Step4Panels from './components/wizard/Step4Panels';
import { GithubIcon, SparklesIcon, SettingsIcon } from './components/Icons';
import ThemeToggle from './components/ui/ThemeToggle';
import SettingsModal from './components/settings/SettingsModal';
import Button from './components/ui/Button';

type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.TOPIC);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [project, setProject] = useState<Project>({
    title: '',
    genre: '일상',
    style: 'kr-webtoon',
    format: '4-cut',
    script: null,
    instagramPost: null,
  });

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem('theme');
        if (['light', 'dark', 'system'].includes(storedTheme!)) {
            return storedTheme as Theme;
        }
    }
    return 'system';
  });

  useEffect(() => {
    const applyTheme = (t: Theme) => {
        const root = window.document.documentElement;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (t === 'dark' || (t === 'system' && prefersDark)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        if (localStorage.getItem('theme') === 'system') {
            applyTheme('system');
        }
    };
    
    mediaQuery.addEventListener('change', handleChange);

    return () => {
        mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme]);

  // Check for API key on mount
  useEffect(() => {
    if (!hasApiKey()) {
        const timer = setTimeout(() => setIsSettingsOpen(true), 500);
        return () => clearTimeout(timer);
    }
  }, []);

  const updateProject = useCallback((updates: Partial<Project>) => {
    setProject(prev => ({ ...prev, ...updates }));
  }, []);
  
  const contextValue = useMemo(() => ({ project, updateProject, setProject, step, setStep }), [project, updateProject, step, setStep]);

  const renderStep = () => {
    switch (step) {
      case AppStep.TOPIC:
        return <Step1Topic />;
      case AppStep.SCRIPT:
        return <Step2Script />;
      case AppStep.CHARACTERS:
        return <Step3Characters />;
      case AppStep.PANELS:
        return <Step4Panels />;
      default:
        return <Step1Topic />;
    }
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
        <header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-8 h-8 text-purple-400" />
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  만화 생성 웹앱 <span className="text-purple-400">PRO</span>
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    aria-label="Settings"
                >
                    <SettingsIcon className="w-5 h-5" />
                </Button>
                <ThemeToggle theme={theme} setTheme={setTheme} />
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                <a
                  href="https://github.com/google/generative-ai-docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label="GitHub Repository"
                >
                  <GithubIcon className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <WizardNav />
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
              {renderStep()}
            </div>
          </div>
        </main>
        
        <footer className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          <p>Powered by Google Gemini</p>
        </footer>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </ProjectContext.Provider>
  );
};

export default App;
