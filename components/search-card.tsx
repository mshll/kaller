'use client';

import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ResultsList } from '@/components/results-list';
import { search } from '@/lib/api';
import type { SearchResult } from '@/lib/config';
import { toast } from 'sonner';

type SearchType = 'phone' | 'name';

export function SearchCard() {
  const [searchType, setSearchType] = useState<SearchType>('phone');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!term.trim()) {
      toast.error('Enter something to search');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const data = await search(term.trim(), searchType);
      setResults(data);
      if (data.length === 0) {
        toast.info('No matches found');
      } else {
        toast.success(`Found ${data.length} result${data.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      toast.error(message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchType(value as SearchType);
    setTerm('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm p-4">
      <Tabs value={searchType} onValueChange={handleTabChange}>
        <TabsList className="w-full bg-muted/50 h-20">
          <TabsTrigger value="phone">Lookup Number</TabsTrigger>
          <TabsTrigger value="name">Find by Name</TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="mt-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <Input
              type="tel"
              placeholder="Phone number"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="h-12 text-base px-4"
              autoComplete="off"
            />
            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-medium">
              {isLoading ? (
                <Spinner />
              ) : (
                <>
                  <Search className="size-4 mr-2" />
                  Look up
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="name" className="mt-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <Input
              type="text"
              placeholder="Person's name"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="h-12 text-base px-4"
              autoComplete="off"
            />
            <Button type="submit" disabled={isLoading} className="w-full h-12 text-base font-medium">
              {isLoading ? (
                <Spinner />
              ) : (
                <>
                  <Search className="size-4 mr-2" />
                  Look up
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <ResultsList results={results} isLoading={isLoading} hasSearched={hasSearched} />
    </div>
  );
}
