import { Mail, Phone, Globe, Linkedin, MessageCircle, User, Briefcase, Building2 } from 'lucide-react';
import { BusinessCardData } from '@/types/business-card';
import { Card } from '@/components/ui/card';

interface BusinessCardPreviewProps {
  data: BusinessCardData;
}

export function BusinessCardPreview({ data }: BusinessCardPreviewProps) {
  const layoutStyle = data.layoutStyle || 1;
  const photoUrl = data.photoUrl;
  const logoUrl = data.logoUrl;
  const handleMobileClick = () => {
    if (data.mobile) {
      window.location.href = `tel:${data.mobile}`;
    }
  };

  const handleEmailClick = () => {
    if (data.email) {
      window.location.href = `mailto:${data.email}`;
    }
  };

  const handleWebsiteClick = () => {
    if (data.website) {
      const url = data.website.startsWith('http') ? data.website : `https://${data.website}`;
      window.open(url, '_blank');
    }
  };

  const handleWhatsAppClick = () => {
    if (data.whatsapp) {
      const number = data.whatsapp.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${number}`, '_blank');
    }
  };

  const handleLinkedInClick = () => {
    if (data.linkedin) {
      const url = data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}`;
      window.open(url, '_blank');
    }
  };

  // Layout 1: Full-width square photo at top
  const renderLayout1 = () => (
    <>
      {photoUrl && (
        <div className="w-full h-48 overflow-hidden rounded-lg mb-4">
          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{data.name || 'Your Name'}</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <p className="text-lg">{data.jobTitle || 'Job Title'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <p className="text-base">{data.companyName || 'Company Name'}</p>
        </div>
      </div>
    </>
  );

  // Layout 2: Square photo left + round logo right
  const renderLayout2 = () => (
    <>
      <div className="flex gap-4 items-start mb-4">
        {photoUrl && (
          <div className="w-24 h-24 overflow-hidden rounded-lg flex-shrink-0">
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
        )}
        {logoUrl && (
          <div className="w-16 h-16 overflow-hidden rounded-full flex-shrink-0 ml-auto">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{data.name || 'Your Name'}</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <p className="text-lg">{data.jobTitle || 'Job Title'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <p className="text-base">{data.companyName || 'Company Name'}</p>
        </div>
      </div>
    </>
  );

  // Layout 3: Logo top, name, then photo
  const renderLayout3 = () => (
    <div className="text-center space-y-4">
      {logoUrl && (
        <div className="w-16 h-16 mx-auto overflow-hidden rounded-full">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{data.name || 'Your Name'}</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <p className="text-lg">{data.jobTitle || 'Job Title'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <p className="text-base">{data.companyName || 'Company Name'}</p>
        </div>
      </div>
      {photoUrl && (
        <div className="w-32 h-32 mx-auto overflow-hidden rounded-lg">
          <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );

  // Layout 4: Round photo with logo badge
  const renderLayout4 = () => (
    <div className="text-center space-y-4">
      <div className="relative w-32 h-32 mx-auto">
        {photoUrl ? (
          <div className="w-32 h-32 overflow-hidden rounded-full">
            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-32 h-32 gradient-bg rounded-full flex items-center justify-center">
            <User className="w-16 h-16 text-white" />
          </div>
        )}
        {logoUrl && (
          <div className="absolute bottom-0 right-0 w-12 h-12 overflow-hidden rounded-full border-4 border-card">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{data.name || 'Your Name'}</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <p className="text-lg">{data.jobTitle || 'Job Title'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <p className="text-base">{data.companyName || 'Company Name'}</p>
        </div>
      </div>
    </div>
  );

  // Layout 5: Minimal - logo only
  const renderLayout5 = () => (
    <div className="text-center space-y-4">
      {logoUrl ? (
        <div className="w-20 h-20 mx-auto overflow-hidden rounded-full">
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-20 h-20 mx-auto gradient-bg rounded-full flex items-center justify-center">
          <Building2 className="w-10 h-10 text-white" />
        </div>
      )}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{data.name || 'Your Name'}</h1>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4" />
          <p className="text-lg">{data.jobTitle || 'Job Title'}</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <p className="text-base">{data.companyName || 'Company Name'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="p-8 card-shadow-lg bg-card animate-fade-in">
      <div className="space-y-6">
        {/* Header Section - Dynamic Layout */}
        <div className="pb-6 border-b border-border">
          {layoutStyle === 1 && renderLayout1()}
          {layoutStyle === 2 && renderLayout2()}
          {layoutStyle === 3 && renderLayout3()}
          {layoutStyle === 4 && renderLayout4()}
          {layoutStyle === 5 && renderLayout5()}
        </div>

        {/* About Section */}
        {data.about && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {data.about}
            </p>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h3>
          
          {data.mobile && (
            <button
              onClick={handleMobileClick}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="text-sm font-medium text-foreground">{data.mobile}</p>
              </div>
            </button>
          )}

          {data.email && (
            <button
              onClick={handleEmailClick}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground break-all">{data.email}</p>
              </div>
            </button>
          )}

          {data.website && (
            <button
              onClick={handleWebsiteClick}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Globe className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Website</p>
                <p className="text-sm font-medium text-foreground break-all">{data.website}</p>
              </div>
            </button>
          )}

          {data.whatsapp && (
            <button
              onClick={handleWhatsAppClick}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-medium text-foreground">{data.whatsapp}</p>
              </div>
            </button>
          )}

          {data.linkedin && (
            <button
              onClick={handleLinkedInClick}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Linkedin className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">LinkedIn</p>
                <p className="text-sm font-medium text-foreground">Connect on LinkedIn</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
