
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
