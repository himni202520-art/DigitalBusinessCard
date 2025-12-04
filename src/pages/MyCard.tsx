
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessCardData, BusinessCard } from '@/types/business-card';
import { BusinessCardPreview } from '@/components/business-card-preview';
import { BusinessCardForm } from '@/components/business-card-form';
import { QRCodeComponent } from '@/components/qr-code';
import { CreditCard, Edit, X, Save, Loader2, Share2, Menu, LogOut, Nfc } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateSlug } from '@/lib/slug';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function MyCard() {
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
    photoUrl: '',
    logoUrl: '',
    layoutStyle: 1,
  });
  const [slug, setSlug] = useState<string>('');
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [isWritingNfc, setIsWritingNfc] = useState(false);
  const { user, loading, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Load user's personal card and auto-create if missing
  useEffect(() => {
    if (!user) return;

    const loadOrCreateCard = async () => {
      setIsLoading(true);
      
      // Load personal card for user
      const { data: existingCard, error } = await supabase
        .from('business_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_type', 'personal')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading card:', error);
        setIsLoading(false);
        return;
      }

      let personalCard = existingCard;

      // Auto-create if missing
      if (!personalCard) {
        const userSlug = generateSlug(user.username || user.email, user.id);
        const { data: newCard, error: createError } = await supabase
          .from('business_cards')
          .insert({
            user_id: user.id,
            name: '',
            job_title: '',
            company_name: '',
            email: user.email,
            mobile: '',
            website: '',
            whatsapp: '',
            linkedin: '',
            about: '',
            slug: userSlug,
            card_type: 'personal',
            is_default: true,
            layout_style: 1,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating card:', createError);
          setIsLoading(false);
          return;
        }
        personalCard = newCard;
      }

      setCard(personalCard);
      setIsLoading(false);
    };

    loadOrCreateCard();
  }, [user]);

  // Update card data when card loads
  useEffect(() => {
    if (!card) return;
    
    setCardData({
      name: card.name || '',
      jobTitle: card.job_title || '',
      companyName: card.company_name || '',
      mobile: card.mobile || '',
      email: card.email || '',
      website: card.website || '',
      whatsapp: card.whatsapp || '',
      linkedin: card.linkedin || '',
      about: card.about || '',
      photoUrl: card.photo_url || '',
      logoUrl: card.logo_url || '',
      layoutStyle: card.layout_style || 1,
    });
    setSlug(card.slug || '');
  }, [card]);

  const handleCardDataChange = (newData: BusinessCardData) => {
    setCardData(newData);
  };

  const handleSave = async () => {
    if (!user || !card) return;

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
      const { data: updatedCard, error } = await supabase
        .from('business_cards')
        .update({
          name: cardData.name,
          job_title: cardData.jobTitle,
          company_name: cardData.companyName,
          mobile: cardData.mobile || null,
          email: cardData.email || null,
          website: cardData.website || null,
          whatsapp: cardData.whatsapp || null,
          linkedin: cardData.linkedin || null,
          about: cardData.about || null,
          photo_url: cardData.photoUrl || null,
          logo_url: cardData.logoUrl || null,
          layout_style: cardData.layoutStyle || 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', card.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setCard(updatedCard);
      setIsEditing(false);
      toast({
        title: 'Saved Successfully',
        description: 'Your card has been updated.',
      });
    } catch (error: any) {
      console.error('Error saving card:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save your card.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };



  const handleShare = async () => {
    const url = `${window.location.origin}/card/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${cardData.name}'s Business Card`,
          text: `${cardData.name} - ${cardData.jobTitle} at ${cardData.companyName}`,
          url: url,
        });
      } catch (error) {
        console.log('Share cancelled:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: 'Link Copied',
          description: 'Business card link copied to clipboard.',
        });
      } catch (error) {
        toast({
          title: 'Copy Failed',
          description: 'Unable to copy link.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    logout();
    navigate('/');
  };

  const handleWriteNfc = async () => {
    if (!publicUrl) {
      toast({
        title: 'No URL Available',
        description: 'Your card must be saved before writing to NFC.',
        variant: 'destructive',
      });
      return;
    }

    // Check NFC support
    if (!('NDEFReader' in window)) {
      toast({
        title: 'NFC Not Supported',
        description: 'NFC is not supported on this device or browser. Works mainly on Android devices using Chrome.',
        variant: 'destructive',
      });
      return;
    }

    setIsWritingNfc(true);
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [
          { recordType: 'url', data: publicUrl }
        ]
      });

      // Log NFC write to database
      if (user && card) {
        await supabase
          .from('nfc_links')
          .insert({
            user_id: user.id,
            card_id: card.id,
            public_url: publicUrl,
          });
      }

      toast({
        title: 'NFC Card Linked Successfully!',
        description: 'Your business card URL has been written to the NFC tag.',
      });
      setNfcModalOpen(false);
    } catch (error: any) {
      console.error('NFC write error:', error);
      toast({
        title: 'NFC Write Failed',
        description: error.message || 'Failed to write to NFC card. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsWritingNfc(false);
    }
  };

  const publicUrl = slug ? `${window.location.origin}/card/${slug}` : '';

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigate('/my-card')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  My Card
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/crm')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  CRM
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Right: Title */}
            <h1 className="text-lg font-semibold">My Business Card</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Edit Button */}
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? 'destructive' : 'default'}
            className={!isEditing ? 'gradient-bg' : ''}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Close
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </>
            )}
          </Button>

          {/* Business Card Preview (no label) */}
          <BusinessCardPreview data={cardData} />

          {/* QR Code (clean, no extra text) */}
          {slug && (
            <div className="flex justify-center">
              <QRCodeComponent value={`${window.location.origin}/card/${slug}`} size={200} />
            </div>
          )}

          {/* NFC Card Writer */}
          {slug && (
            <Button
              onClick={() => setNfcModalOpen(true)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Nfc className="w-4 h-4 mr-2" />
              Connect NFC Card
            </Button>
          )}

          {/* Share Button */}
          {slug && (
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}

          {/* Edit Form (shown when editing) */}
          {isEditing && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Details</h2>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
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
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
              <BusinessCardForm data={cardData} onChange={handleCardDataChange} />
            </div>
          )}
        </div>
      </main>

      {/* NFC Write Modal */}
      <Dialog open={nfcModalOpen} onOpenChange={setNfcModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect NFC Card</DialogTitle>
            <DialogDescription>
              Hold your NFC card behind your phone when prompted. We will write your public link to this card.
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Works only on supported NFC devices (mainly Android + Chrome)
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Your Card URL:</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 break-all">{publicUrl}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleWriteNfc}
                disabled={isWritingNfc}
                className="flex-1 gradient-bg"
              >
                {isWritingNfc ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Writing... Hold NFC Card Near Phone
                  </>
                ) : (
                  <>
                    <Nfc className="w-4 h-4 mr-2" />
                    Write to NFC Card
                  </>
                )}
              </Button>
              <Button
                onClick={() => setNfcModalOpen(false)}
                variant="outline"
                disabled={isWritingNfc}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
