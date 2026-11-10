import React from 'react';
import { Sun, Moon, Volume2, VolumeX, Keyboard, History } from 'lucide-react';
import { CalculatorMode } from '../types/calculator';

interface HeaderProps {
  currentMode: CalculatorMode;
  onModeChange: (mode: CalculatorMode) => void;
  isDark: boolean;
  onToggleDark: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenShortcuts: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  isDark,
  onToggleDark,
  soundEnabled,
  onToggleSound,
  onOpenShortcuts,
  onToggleHistory,
  isHistoryOpen,
  historyCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-8 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-mono font-bold text-base shadow-sm">
          Ω
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          Calculadora Omnia
        </span>
      </div>

      {/* Zone 2: Navigation modes */}
      <nav className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto max-w-full">
        <button
          onClick={() => onModeChange('standard')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentMode === 'standard'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Padrão
        </button>
        <button
          onClick={() => onModeChange('scientific')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentMode === 'scientific'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Científica
        </button>
        <button
          onClick={() => onModeChange('converter')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentMode === 'converter'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Conversor
        </button>
        <button
          onClick={() => onModeChange('financial')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            currentMode === 'financial'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Financeira
        </button>
      </nav>

      {/* Zone 3: Essential utility actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleHistory}
          title="Histórico de cálculos"
          aria-label="Abrir histórico de cálculos"
          className={`relative p-2 rounded-lg transition-colors ${
            isHistoryOpen
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          {historyCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>

        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Desativar som de tecla' : 'Ativar som de tecla'}
          aria-label="Alternar som de clique"
          className={`p-2 rounded-lg transition-colors ${
            soundEnabled
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenShortcuts}
          title="Atalhos do teclado"
          aria-label="Atalhos do teclado"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:flex"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleDark}
          title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          aria-label="Alternar tema"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
