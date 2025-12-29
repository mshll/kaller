'use client';

import { useState, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AdvancedSettings } from './advanced-settings';
import { ConfigSection } from './config-section';

const TAP_COUNT = 5;
const TAP_TIMEOUT = 2000;

export function SecretTrigger({
  children,
  onUnlock,
}: {
  children: ReactNode;
  onUnlock: () => void;
}) {
  const tapCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = () => {
    tapCountRef.current += 1;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (tapCountRef.current >= TAP_COUNT) {
      tapCountRef.current = 0;
      onUnlock();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, TAP_TIMEOUT);
  };

  return (
    <span onClick={handleTap} className="cursor-default select-none">
      {children}
    </span>
  );
}

export function SecretSections({ unlocked }: { unlocked: boolean }) {
  if (!unlocked) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
      <AdvancedSettings />
      <ConfigSection />
    </div>
  );
}

export function useSecretUnlock() {
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = () => {
    if (!unlocked) {
      setUnlocked(true);
      toast.success('Unlocked!');
    }
  };

  return { unlocked, handleUnlock };
}
