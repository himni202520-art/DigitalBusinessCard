import { useState, useCallback } from 'react';
import { BusinessCardData } from '@/types/business-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Cropper from 'react-easy-crop';
import { Area, Point } from 'react-easy-crop';
import { LayoutCarousel } from '@/components/layout-carousel';

interface BusinessCardFormProps {
  data: BusinessCardData;
  onChange: (data: BusinessCardData) => void;
}

export function BusinessCardForm({ data, onChange }: BusinessCardFormProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [layoutCarouselOpen, setLayoutCarouselOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleChange = (field: keyof BusinessCardData, value: string | number) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  };

  const handleFileSelect = (file: File, type: 'photo' | 'logo') => {
    if (type === 'photo') {
      // Open crop dialog for photos
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Direct upload for logos
      handleFileUpload(file, type);
    }
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels || !user) return;

    setUploadingPhoto(true);
    setCropDialogOpen(false);

    try {
      const croppedBlob = await createCroppedImage(imageToCrop, croppedAreaPixels);
      const fileName = `${user.id}-photo-${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-cards')
        .upload(filePath, croppedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-cards')
        .getPublicUrl(filePath);

      handleChange('photoUrl', publicUrl);
      toast({
        title: 'Upload Successful',
        description: 'Photo uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
      setImageToCrop(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  };

  const handleFileUpload = async (file: File, type: 'photo' | 'logo') => {
    if (!user) return;

    const setter = setUploadingLogo;
    setter(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-cards')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-cards')
        .getPublicUrl(filePath);

      handleChange('logoUrl', publicUrl);
      toast({
        title: 'Upload Successful',
        description: 'Logo uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file.',
        variant: 'destructive',
      });
    } finally {
      setter(false);
    }
  };



  return (
    <>
      {/* Layout Carousel */}
      {layoutCarouselOpen && (
        <LayoutCarousel
          currentData={data}
          selectedLayout={data.layoutStyle || 1}
          onSelectLayout={(layoutId) => handleChange('layoutStyle', layoutId)}
          onClose={() => setLayoutCarouselOpen(false)}
        />
      )}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
              {imageToCrop && (
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Zoom</Label>
              <div className="flex items-center gap-4">
                <ZoomOut className="w-4 h-4" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setCropDialogOpen(false);
                  setImageToCrop(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCropConfirm} className="gradient-bg">
                Crop & Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="p-6 card-shadow bg-card">
        <h2 className="text-2xl font-bold mb-6 gradient-text">Edit Your Card</h2>
        <div className="space-y-4">
        {/* Photo & Logo Uploads */}
        <div className="grid grid-cols-2 gap-4 pb-4 border-b">
          <div className="space-y-2">
            <Label>Photo (Square)</Label>
            <div className="flex flex-col gap-2">
              {data.photoUrl && (
                <img src={data.photoUrl} alt="Photo" className="w-20 h-20 object-cover rounded-lg" />
              )}
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'photo');
                  }}
                  disabled={uploadingPhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={uploadingPhoto}
                  asChild
                >
                  <span>
                    {uploadingPhoto ? (
                      <>Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Upload Photo</>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo (Round)</Label>
            <div className="flex flex-col gap-2">
              {data.logoUrl && (
                <img src={data.logoUrl} alt="Logo" className="w-20 h-20 object-cover rounded-full" />
              )}
              <label className="cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'logo');
                  }}
                  disabled={uploadingLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={uploadingLogo}
                  asChild
                >
                  <span>
                    {uploadingLogo ? (
                      <>Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Upload Logo</>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>

        {/* Layout Chooser */}
        <div className="space-y-2">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => setLayoutCarouselOpen(true)}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Choose Layout (Current: Layout {data.layoutStyle || 1})
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title *</Label>
          <Input
            id="jobTitle"
            placeholder="Senior Software Engineer"
            value={data.jobTitle}
            onChange={(e) => handleChange('jobTitle', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Tech Corp Inc."
            value={data.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input
            id="mobile"
            type="tel"
            placeholder="+1 234 567 8900"
            value={data.mobile}
            onChange={(e) => handleChange('mobile', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john.doe@example.com"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://example.com"
            value={data.website}
            onChange={(e) => handleChange('website', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp Number</Label>
          <Input
            id="whatsapp"
            type="tel"
            placeholder="+1 234 567 8900"
            value={data.whatsapp}
            onChange={(e) => handleChange('whatsapp', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn URL</Label>
          <Input
            id="linkedin"
            type="url"
            placeholder="https://linkedin.com/in/johndoe"
            value={data.linkedin}
            onChange={(e) => handleChange('linkedin', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="about">About / Notes</Label>
          <Textarea
            id="about"
            placeholder="Paste a short bio from LinkedIn or your website..."
            value={data.about}
            onChange={(e) => handleChange('about', e.target.value)}
            rows={5}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Add a brief description about yourself or your business
          </p>
        </div>
      </div>
    </Card>
    </>
  );
}
