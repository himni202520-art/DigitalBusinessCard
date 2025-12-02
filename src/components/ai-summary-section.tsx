import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/use-auth';

interface AISummarySectionProps {
  linkedinUrl: string;
  websiteUrl: string;
  about: string;
  savedSummary?: string;
}

export function AISummarySection({ linkedinUrl, websiteUrl, about, savedSummary }: AISummarySectionProps) {
  const [summary, setSummary] = useState<string>(savedSummary || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (savedSummary) {
      setSummary(savedSummary);
    }
  }, [savedSummary]);

  const handleGenerateSummary = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to generate AI summaries.',
        variant: 'destructive',
      });
      return;
    }

    if (!linkedinUrl && !websiteUrl && !about) {
      toast({
        title: 'Missing Information',
        description: 'Please add your LinkedIn URL, website, or about text first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-summary', {
        body: {
          linkedinUrl,
          websiteUrl,
          about,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
          } catch {
            errorMessage = `${error.message || 'Failed to read response'}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.summary) {
        setSummary(data.summary);
        toast({
          title: 'AI Summary Generated',
          description: 'Your professional summary has been created.',
        });
      } else {
        throw new Error('No summary returned from AI');
      }
    } catch (error: any) {
      console.error('Error generating AI summary:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Unable to generate AI summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 card-shadow bg-card space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Summary
        </h3>
        <Button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          size="sm"
          className="gradient-bg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Summary
            </>
          )}
        </Button>
      </div>

      {summary ? (
        <div className="p-4 bg-secondary rounded-lg border border-border">
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
        </div>
      ) : (
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground text-center">
            Click "Generate Summary" to create an AI-powered professional summary
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Note: Connect Supabase to enable AI features
          </p>
        </div>
      )}
    </Card>
  );
}
