import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessCardData } from '@/types/business-card';
import { BusinessCardPreview } from '@/components/business-card-preview';
import { BusinessCardForm } from '@/components/business-card-form';
import { AISummarySection } from '@/components/ai-summary-section';
import { AuthSection } from '@/components/auth-section';
import { CreditCard, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { generateSlug } from '@/lib/slug';

export default function Index() {
  const [cardData, setCardData] = useState<BusinessCardData>({
    name: '',
    jobTitle: '',
    companyName: '',
    mobile: '',
    email: '',
    website: '',
    whatsapp: '',
    linkedin: '',
    about: '',
  });
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect to /my-card if user is logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/my-card');
    }
  }, [user, loading, navigate]);

  // Load user's business card data
  useEffect(() => {
    if (!user) return;

    const loadCardData = async () => {
      const { data, error } = await supabase
        .from('business_cards')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error loading card data:', error);
        }
        return;
      }

      if (data) {
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
        });
        setAiSummary(data.ai_summary || '');
      }
    };

    loadCardData();
  }, [user]);

  const handleCardDataChange = (newData: BusinessCardData) => {
    setCardData(newData);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save your business card.',
        variant: 'destructive',
      });
      return;
    }

    if (!cardData.name || !cardData.jobTitle || !cardData.companyName) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in Name, Job Title, and Company Name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Generate slug for the card
      const cardSlug = generateSlug(cardData.name, user.id);

      const { error } = await supabase
        .from('business_cards')
        .upsert({
          user_id: user.id,
          name: cardData.name,
          job_title: cardData.jobTitle,
          company_name: cardData.companyName,
          mobile: cardData.mobile || null,
          email: cardData.email || null,
          website: cardData.website || null,
          whatsapp: cardData.whatsapp || null,
          linkedin: cardData.linkedin || null,
          about: cardData.about || null,
          slug: cardSlug,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast({
        title: 'Saved Successfully',
        description: 'Your business card has been saved.',
      });

      // Redirect to My Card page
      navigate('/my-card');
    } catch (error: any) {
      console.error('Error saving card:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save your business card.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Digital Business Card</h1>
              <p className="text-xs text-muted-foreground">Create & share your professional card</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          /* Auth Section - Show Only When Not Logged In */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 gradient-text">Welcome</h2>
              <p className="text-muted-foreground">
                Sign in or create an account to create your digital business card
              </p>
            </div>
            <AuthSection />
          </div>
        ) : (
          /* Business Card Editor - Show Only When Logged In */
          <>
            {/* Save Button */}
            <div className="max-w-7xl mx-auto mb-6 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="gradient-bg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
                  </>
                )}
              </Button>
            </div>

            {/* Split Layout */}
            <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {/* Left Side - Preview */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Live Preview</h2>
                  <p className="text-sm text-muted-foreground">Your card updates in real-time</p>
                </div>
                <BusinessCardPreview data={cardData} />
                
                {/* AI Summary Section */}
                <AISummarySection
                  linkedinUrl={cardData.linkedin}
                  websiteUrl={cardData.website}
                  about={cardData.about}
                  savedSummary={aiSummary}
                />
              </div>

              {/* Right Side - Form */}
              <div className="space-y-6">
                <div className="mb-4">
                  <AuthSection />
                </div>
                <BusinessCardForm data={cardData} onChange={handleCardDataChange} />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Built with React, TypeScript, and Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
