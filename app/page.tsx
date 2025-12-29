'use client';

import { SearchCard } from '@/components/search-card';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  SecretTrigger,
  SecretSections,
  useSecretUnlock,
} from '@/components/secret-sections';

export default function Home() {
  const { unlocked, handleUnlock } = useSecretUnlock();

  return (
    <div className="dotted-bg min-h-svh flex flex-col">
      <ThemeToggle />

      <header className="pt-14 pb-10 text-center px-4">
        <SecretTrigger onUnlock={handleUnlock}>
          <h1 className="text-5xl font-bold tracking-tight">Kaller</h1>
        </SecretTrigger>
        <p className="text-muted-foreground mt-1">Kuwait Phone Directory</p>
      </header>

      <main className="container max-w-md mx-auto px-4 pb-4 space-y-4 flex-1">
        <SearchCard />
        <SecretSections unlocked={unlocked} />
      </main>

      <footer className="py-6 pb-safe text-center">
        <p className="text-xs text-muted-foreground">
          Kaller • Built by{' '}
          <a
            href="https://meshal.me"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            meshal.me
          </a>
        </p>
      </footer>
    </div>
  );
}
