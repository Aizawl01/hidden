
import React from 'react';
import type { Theme } from '../types';

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: (theme: Theme) => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isSelected, onSelect }) => {
  const { name, description, icon: Icon } = theme;

  return (
    <button
      onClick={() => onSelect(theme)}
      className={`p-4 text-left bg-slate-900/50 rounded-lg border-2 transition-all duration-200 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        isSelected ? 'border-amber-400' : 'border-slate-700 hover:border-slate-500'
      }`}
    >
      <Icon className="w-6 h-6 mb-3 text-amber-400" />
      <h3 className="font-bold text-sm text-white">{name}</h3>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </button>
  );
};

export default ThemeCard;
