
import React from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { AppStep } from '../../types';

const ChevronRight = () => (
  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const WizardNav: React.FC = () => {
  const { step } = useProjectContext();
  const steps = [
    { id: AppStep.TOPIC, name: '1. 주제 선정' },
    { id: AppStep.SCRIPT, name: '2. 대본 확인' },
    { id: AppStep.CHARACTERS, name: '3. 등장인물 확인' },
    { id: AppStep.PANELS, name: '4. 만화 생성' },
  ];

  return (
    <nav aria-label="Progress" className="py-4 w-full">
      <ol role="list" className="flex items-center justify-between w-full">
        {steps.map((s, index) => (
          <React.Fragment key={s.name}>
            <li className="flex items-center">
              <div className="flex items-center text-sm font-medium">
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  step >= s.id ? 'bg-purple-600 shadow-lg shadow-purple-500/20' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {step > s.id ? (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={`${step === s.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{s.id}</span>
                  )}
                </span>
                <span className={`ml-3 hidden md:inline-block whitespace-nowrap transition-colors duration-300 ${
                  step >= s.id ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-gray-500'
                }`}>
                  {s.name}
                </span>
              </div>
            </li>
            {index !== steps.length - 1 && (
              <ChevronRight />
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};

export default WizardNav;
