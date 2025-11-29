
import React from 'react';
import { useProjectContext } from '../../hooks/useProjectContext';
import { AppStep } from '../../types';

const WizardNav: React.FC = () => {
  const { step } = useProjectContext();
  const steps = [
    { id: AppStep.TOPIC, name: '1. 주제 선정' },
    { id: AppStep.SCRIPT, name: '2. 대본 확인' },
    { id: AppStep.CHARACTERS, name: '3. 등장인물 확인' },
    { id: AppStep.PANELS, name: '4. 만화 생성' },
  ];

  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((s, index) => (
          <li key={s.name} className={`relative ${index !== steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex items-center text-sm font-medium">
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                step >= s.id ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                {step > s.id ? (
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={`${step === s.id ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{s.id}</span>
                )}
              </span>
              <span className={`ml-3 hidden md:inline-block ${step >= s.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{s.name}</span>
            </div>

            {index !== steps.length - 1 && (
              <div className="absolute right-0 top-4 -ml-px h-0.5 w-full bg-gray-300 dark:bg-gray-600" aria-hidden="true">
                 <div className={`h-0.5 w-full ${step > s.id ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default WizardNav;
