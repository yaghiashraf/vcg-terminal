import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TerminalProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  children, 
  className, 
  title = 'VORTEX TERMINAL' 
}) => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time on client
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn('terminal hedge-fund-terminal', className)}>
      <div className="terminal-header">
        <div className="terminal-dots">
          <div className="terminal-dot red"></div>
          <div className="terminal-dot yellow"></div>
          <div className="terminal-dot green"></div>
        </div>
        <div className="terminal-title">{title}</div>
        <div className="ml-auto text-xs text-gray-400 font-mono">
          {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'} EST
        </div>
      </div>
      {children}
    </div>
  );
};

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  prefix?: string;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Enter command...',
  prefix = '> '
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="flex items-center">
      <span className="text-green-400 mr-2 font-mono">{prefix}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="terminal-input flex-1"
      />
    </div>
  );
};

interface TerminalOutputProps {
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ 
  children, 
  type = 'info' 
}) => {
  const getColor = () => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className={cn('font-mono text-sm data-stream', getColor())}>
      {children}
    </div>
  );
};

interface TerminalCommandProps {
  command: string;
  timestamp?: Date;
}

export const TerminalCommand: React.FC<TerminalCommandProps> = ({ 
  command, 
  timestamp = new Date() 
}) => {
  return (
    <div className="flex items-center mb-2">
      <span className="text-gray-500 text-xs mr-4">
        {timestamp.toLocaleTimeString()}
      </span>
      <span className="text-green-400 mr-2">&gt;</span>
      <span className="text-white font-mono">{command}</span>
    </div>
  );
};