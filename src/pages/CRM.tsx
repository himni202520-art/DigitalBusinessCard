import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { downloadVCard } from '@/lib/vcard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Phone,
  Mail,
  Linkedin,
  MessageCircle,
  Download,
  Loader2,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  linkedin_url?: string;
  whatsapp?: string;
  created_at: string;
}

export default function CRM() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Load contacts
  useEffect(() => {
    if (!user) return;

    const loadContacts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contacts:', error);
        toast({
          title: 'Load Failed',
          description: 'Failed to load contacts.',
          variant: 'destructive',
        });
      } else {
        setContacts(data || []);
      }
      setIsLoading(false);
    };

    loadContacts();
  }, [user, toast]);

  const handleCall = (mobile?: string) => {
    if (!mobile) return;
    window.location.href = `tel:${mobile}`;
  };

  const handleEmail = (email?: string) => {
    if (!email) return;
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsApp = (whatsapp?: string) => {
    if (!whatsapp) return;
    const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const handleLinkedIn = (linkedin?: string) => {
    if (!linkedin) return;
    window.open(linkedin, '_blank');
  };

  const handleSaveContact = (contact: Contact) => {
    downloadVCard({
      name: contact.name,
      email: contact.email,
      mobile: contact.mobile,
      linkedin: contact.linkedin_url,
      whatsapp: contact.whatsapp,
    });
    toast({
      title: 'Contact Saved',
      description: `${contact.name}'s vCard has been downloaded.`,
    });
  };

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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">CRM</h1>
                <p className="text-xs text-muted-foreground">
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-card')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              My Card
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {contacts.length === 0 ? (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto gradient-bg rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">No Contacts Yet</h2>
                  <p className="text-muted-foreground mb-6">
                    Share your business card to start collecting contacts
                  </p>
                  <Button onClick={() => navigate('/my-card')} className="gradient-bg">
                    <CreditCard className="w-4 h-4 mr-2" />
                    View My Card
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="w-full space-y-3">
              {contacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-lg transition-shadow">
                  {/* Mobile Layout - Stacked Card */}
                  <div className="block md:hidden p-4 space-y-2">
                    {/* Name */}
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {contact.name}
                    </h3>
                    
                    {/* Email */}
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {contact.email}
                        </p>
                      </div>
                    )}
                    
                    {/* Phone + WhatsApp Row */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      {/* Phone */}
                      {contact.mobile ? (
                        <button
                          onClick={() => handleCall(contact.mobile)}
                          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="truncate">{contact.mobile}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No phone</span>
                      )}
                      
                      {/* WhatsApp Button */}
                      {contact.whatsapp && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(contact.whatsapp)}
                          className="h-7 px-3 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                    
                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {contact.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEmail(contact.email)}
                          className="h-7 px-3 text-xs"
                        >
                          <Mail className="w-3.5 h-3.5 mr-1" />
                          Email
                        </Button>
                      )}
                      {contact.linkedin_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkedIn(contact.linkedin_url)}
                          className="h-7 px-3 text-xs"
                        >
                          <Linkedin className="w-3.5 h-3.5 mr-1" />
                          LinkedIn
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSaveContact(contact)}
                        className="h-7 px-3 text-xs gradient-bg ml-auto"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Desktop/Tablet Layout - Grid */}
                  <div className="hidden md:grid md:grid-cols-[minmax(160px,2fr)_minmax(160px,2fr)_minmax(120px,1.5fr)_minmax(140px,1fr)] gap-3 p-5 items-center">
                    {/* Name Column */}
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {contact.name}
                      </h3>
                    </div>
                    
                    {/* Email Column */}
                    <div className="flex items-center gap-2 min-w-0">
                      {contact.email ? (
                        <>
                          <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <button
                            onClick={() => handleEmail(contact.email)}
                            className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors truncate"
                          >
                            {contact.email}
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </div>
                    
                    {/* Phone Column */}
                    <div className="flex items-center gap-2">
                      {contact.mobile ? (
                        <>
                          <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <button
                            onClick={() => handleCall(contact.mobile)}
                            className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                          >
                            {contact.mobile}
                          </button>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </div>
                    
                    {/* Actions Column */}
                    <div className="flex items-center gap-2 justify-end">
                      {contact.whatsapp && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(contact.whatsapp)}
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {contact.linkedin_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkedIn(contact.linkedin_url)}
                          title="LinkedIn"
                        >
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSaveContact(contact)}
                        className="gradient-bg"
                        title="Save Contact"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
