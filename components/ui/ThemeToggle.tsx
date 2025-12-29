
import React, { useState, useRef, useEffect } from 'react';
import { SunIcon, MoonIcon, MonitorIcon } from '../Icons';
import Button from './Button';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const themeOptions: { value: Theme; label: string; icon: React.FC<any> }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
];

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const CurrentIcon = theme === 'system' ? MonitorIcon : theme === 'dark' ? MoonIcon : SunIcon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
      >
        <CurrentIcon className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-xl ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="py-1">
            {themeOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleThemeSelect(option.value)}
                  className={`flex items-center w-full px-4 py-2.5 text-sm text-left transition-colors ${
                    theme === option.value
                      ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <IconComponent className="w-4 h-4 mr-3 opacity-80" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
