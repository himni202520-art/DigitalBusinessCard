import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useParams } from 'react-router-dom';
import { BusinessCardData } from '@/types/business-card';
import { BusinessCardPreview } from '@/components/business-card-preview';
import { ViewerShareSection } from '@/components/viewer-share-section';
import { CreditCard, Loader2, Share2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>();
  const [cardData, setCardData] = useState<BusinessCardData | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showSignupCTA, setShowSignupCTA] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!slug) return;

    const loadPublicCard = async () => {
      setIsLoading(true);
      
      // Try to load the default card for this slug
      let { data, error } = await supabase
        .from('business_cards')
        .select('*')
        .eq('slug', slug)
        .eq('is_default', true)
        .single();

      // If no default card found, fall back to personal card
      if (error || !data) {
        console.log('No default card found, trying personal card...');
        const { data: personalData, error: personalError } = await supabase
          .from('business_cards')
          .select('*')
          .eq('slug', slug)
          .eq('card_type', 'personal')
          .single();

        if (personalError || !personalData) {
          console.error('Error loading public card:', personalError);
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        
        data = personalData;
      }

      // Set card data from the loaded card
      setCardData({
        name: data.name || '',
        jobTitle: data.job_title || '',
        companyName: data.company_name || '',
        mobile: data.mobile || '',
        email: data.email || '',
        website: data.website || '',
        whatsapp: data.whatsapp || '',
        linkedin: data.linkedin || '',
        about: data.about || '',
        photoUrl: data.photo_url || '',
        logoUrl: data.logo_url || '',
        layoutStyle: data.layout_style || 1,
      });
      setOwnerUserId(data.user_id || '');
      setIsLoading(false);
    };

    loadPublicCard();
  }, [slug]);

  // Store slug in localStorage for post-signup flow
  useEffect(() => {
    if (slug) {
      localStorage.setItem('scannedCardSlug', slug);
    }
  }, [slug]);

  const handleShareSuccess = () => {
    setShowSignupCTA(true);
  };

  const handleCreateCard = () => {
    // Redirect to signup/login
    window.location.href = '/';
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: cardData?.name ? `${cardData.name}'s Business Card` : 'Business Card',
          text: cardData?.jobTitle
            ? `${cardData.name} - ${cardData.jobTitle} at ${cardData.companyName}`
            : 'Check out my business card',
          url: url,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: 'Link Copied',
          description: 'Business card link copied to clipboard.',
        });
      } catch (error) {
        toast({
          title: 'Copy Failed',
          description: 'Unable to copy link to clipboard.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveContact = () => {
    // Placeholder for future vCard download functionality
    toast({
      title: 'Coming Soon',
      description: 'vCard download feature will be available soon.',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !cardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <CreditCard className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Card Not Found</h1>
          <p className="text-muted-foreground">
            This business card does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Digital Business Card</h1>
              <p className="text-xs text-muted-foreground">{cardData.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Business Card Preview */}
          <BusinessCardPreview data={cardData} />

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleSaveContact}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Save Contact
            </Button>
            <Button
              onClick={handleShare}
              className="w-full gradient-bg"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Share Your Details Section */}
          {slug && ownerUserId && (
            <div className="pt-8">
              <ViewerShareSection
                cardSlug={slug}
                ownerUserId={ownerUserId}
                ownerName={cardData.name}
                onShareSuccess={handleShareSuccess}
              />
            </div>
          )}

          {/* Signup CTA - Show after sharing details and if not logged in */}
          {showSignupCTA && !user && (
            <div className="space-y-4 animate-slide-up">
              {/* Success Message */}
              <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    Your details have been shared successfully with {cardData.name}.
                  </h3>
                </div>
              </Card>

              {/* Create Your Card CTA */}
              <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto gradient-bg rounded-full flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 gradient-text">
                      Create your own digital business card
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Start building your professional network with your own digital card
                    </p>
                    <Button
                      onClick={handleCreateCard}
                      size="lg"
                      className="w-full sm:w-auto gradient-bg text-base font-semibold py-6 px-8"
                    >
                      Create Your Digital Card
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center pt-8">
            <p className="text-sm text-muted-foreground">
              Create your own digital business card
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
