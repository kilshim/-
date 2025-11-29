// FIX: Import React to provide the React namespace for types like React.Dispatch.
import React, { createContext, useContext } from 'react';
import { Project, AppStep } from '../types';

interface ProjectContextType {
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  step: AppStep;
  setStep: (step: AppStep) => void;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjectContext = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
