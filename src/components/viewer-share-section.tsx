import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, User, Linkedin, Instagram, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ViewerShareSectionProps {
  cardSlug: string;
  ownerUserId: string;
  ownerName: string;
  onShareSuccess?: () => void;
}

export function ViewerShareSection({ cardSlug, ownerUserId, ownerName, onShareSuccess }: ViewerShareSectionProps) {
  const [shareBasicInfo, setShareBasicInfo] = useState(false);
  const [shareLinkedIn, setShareLinkedIn] = useState(false);
  const [shareInstagram, setShareInstagram] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Auto-fill from logged-in user's business card
  useEffect(() => {
    const loadViewerData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('business_cards')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setName(data.name || '');
          setEmail(data.email || user.email || '');
          setMobile(data.mobile || '');
          setLinkedinUrl(data.linkedin || '');
          setWhatsapp(data.whatsapp || '');
          setInstagramUrl(''); // Instagram not in business_cards, leave empty
        } else {
          // No business card, just use email
          setEmail(user.email || '');
        }
      } catch (error) {
        console.error('Error loading viewer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadViewerData();
  }, [user]);

  const handleShare = async () => {
    // Validate at least one section is enabled
    if (!shareBasicInfo && !shareLinkedIn && !shareInstagram) {
      toast({
        title: 'No Information Selected',
        description: 'Please enable at least one section to share your details.',
        variant: 'destructive',
      });
      return;
    }

    // Validate basic info fields if enabled
    if (shareBasicInfo && (!name || !email)) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your name and email.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Normalize values for duplicate detection
      const normalizedName = name.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();
      // Remove all non-digits from phone numbers
      const normalizedMobile = (mobile || whatsapp || '').replace(/[^0-9]/g, '');

      // Check for existing contact with ALL THREE matching
      let existingContact = null;
      if (shareBasicInfo && normalizedName && normalizedEmail && normalizedMobile) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('owner_user_id', ownerUserId)
          .ilike('name', normalizedName)
          .ilike('email', normalizedEmail);

        if (!error && data && data.length > 0) {
          // Check if mobile/whatsapp also matches (after normalization)
          existingContact = data.find(contact => {
            const existingMobile = (contact.mobile || contact.whatsapp || '').replace(/[^0-9]/g, '');
            return existingMobile === normalizedMobile;
          });
        }
      }

      const contactData = {
        owner_user_id: ownerUserId,
        viewer_user_id: user?.id || null,
        card_slug: cardSlug,
        name: shareBasicInfo ? name : null,
        email: shareBasicInfo ? email : null,
        mobile: shareBasicInfo ? mobile : null,
        whatsapp: shareBasicInfo ? whatsapp : null,
        linkedin_url: shareLinkedIn ? linkedinUrl : null,
        instagram_url: shareInstagram ? instagramUrl : null,
      };

      if (existingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            ...contactData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingContact.id);

        if (error) throw error;
      } else {
        // Insert new contact
        const { error } = await supabase
          .from('contacts')
          .insert(contactData);

        if (error) throw error;
      }

      setIsSuccess(true);
      toast({
        title: 'Details Shared Successfully',
        description: `Your details have been shared with ${ownerName}.`,
      });
      
      // Notify parent component
      onShareSuccess?.();

      // Keep success message visible (don't auto-reset)
    } catch (error: any) {
      console.error('Error sharing details:', error);
      toast({
        title: 'Share Failed',
        description: error.message || 'Failed to share your details.',
        variant: 'destructive',
      });
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="p-8 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
              Details Shared Successfully!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your details have been shared with {ownerName}.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Share your details with this contact</h2>
        <p className="text-sm text-muted-foreground">
          Choose what information you'd like to share with {ownerName}
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Basic Info</p>
              <p className="text-sm text-muted-foreground">Name, email, phone</p>
            </div>
          </div>
          <Switch
            checked={shareBasicInfo}
            onCheckedChange={setShareBasicInfo}
          />
        </div>

        {shareBasicInfo && (
          <div className="space-y-3 pl-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="viewer-name">Name *</Label>
              <Input
                id="viewer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewer-email">Email *</Label>
              <Input
                id="viewer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewer-mobile">Mobile</Label>
              <Input
                id="viewer-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewer-whatsapp">WhatsApp</Label>
              <Input
                id="viewer-whatsapp"
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        )}
      </div>

      {/* LinkedIn Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <p className="font-medium">LinkedIn Profile</p>
              <p className="text-sm text-muted-foreground">Connect on LinkedIn</p>
            </div>
          </div>
          <Switch
            checked={shareLinkedIn}
            onCheckedChange={setShareLinkedIn}
          />
        </div>

        {shareLinkedIn && (
          <div className="pl-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="viewer-linkedin">LinkedIn URL</Label>
              <Input
                id="viewer-linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>
        )}
      </div>

      {/* Instagram Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-500" />
            </div>
            <div>
              <p className="font-medium">Instagram Profile</p>
              <p className="text-sm text-muted-foreground">Connect on Instagram</p>
            </div>
          </div>
          <Switch
            checked={shareInstagram}
            onCheckedChange={setShareInstagram}
          />
        </div>

        {shareInstagram && (
          <div className="pl-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="viewer-instagram">Instagram Handle/URL</Label>
              <Input
                id="viewer-instagram"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="@yourusername or https://instagram.com/yourusername"
              />
            </div>
          </div>
        )}
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShare}
        disabled={isSaving}
        className="w-full gradient-bg"
        size="lg"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sharing...
          </>
        ) : (
          'Share my details'
        )}
      </Button>
    </Card>
  );
}
