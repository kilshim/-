
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, AppStep } from './types';
import { ProjectContext } from './hooks/useProjectContext';

import WizardNav from './components/wizard/WizardNav';
import Step1Topic from './components/wizard/Step1Topic';
import Step2Script from './components/wizard/Step2Script';
import Step3Characters from './components/wizard/Step3Characters';
import Step4Panels from './components/wizard/Step4Panels';
import { SparklesIcon, SettingsIcon } from './components/Icons';
import ThemeToggle from './components/ui/ThemeToggle';
import Button from './components/ui/Button';
import SettingsModal from './components/settings/SettingsModal';

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
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
            return storedTheme as Theme;
        }
    }
    return 'system';
  });

  // 테마 적용 함수 - DOM을 직접 조작하여 가장 확실하게 변경 사항 반영
  const applyTheme = useCallback((t: Theme) => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const shouldBeDark = t === 'dark' || (t === 'system' && mediaQuery.matches);
    
    if (shouldBeDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    
    localStorage.setItem('theme', t);
  }, []);

  // 테마 상태가 바뀔 때마다 DOM 업데이트
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    setProject(prev => ({ ...prev, ...updates }));
  }, []);
  
  const contextValue = useMemo(() => ({ project, updateProject, setProject, step, setStep }), [project, updateProject, step, setStep]);

  const renderStep = () => {
    switch (step) {
      case AppStep.TOPIC: return <Step1Topic />;
      case AppStep.SCRIPT: return <Step2Script />;
      case AppStep.CHARACTERS: return <Step3Characters />;
      case AppStep.PANELS: return <Step4Panels />;
      default: return <Step1Topic />;
    }
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">
        <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-gray-700/50 transition-all duration-300">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2 select-none">
                <SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  만화 생성 웹앱 <span className="text-purple-600 dark:text-purple-400">PRO</span>
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsSettingsOpen(true)} 
                  className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  aria-label="Settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </Button>
                <ThemeToggle theme={theme} setTheme={setTheme} />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <WizardNav />
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden">
              {renderStep()}
            </div>
          </div>
        </main>
        
        <footer className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm flex flex-col items-center space-y-2">
          <p>Powered by Google Gemini</p>
          <a 
            href="https://xn--design-hl6wo12cquiba7767a.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-600/80 dark:text-purple-400/80 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors border-b border-transparent hover:border-current"
          >
            떨림과울림Design.com
          </a>
        </footer>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </ProjectContext.Provider>
  );
};

export default App;
