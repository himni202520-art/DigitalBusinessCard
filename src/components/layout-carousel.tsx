import { useState } from 'react';
import { BusinessCardData } from '@/types/business-card';
import { BusinessCardPreview } from '@/components/business-card-preview';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LayoutCarouselProps {
  currentData: BusinessCardData;
  selectedLayout: number;
  onSelectLayout: (layoutId: number) => void;
  onClose: () => void;
}

const layouts = [
  { 
    id: 1, 
    name: 'Full Photo Top', 
    desc: 'Square photo at top, info below' 
  },
  { 
    id: 2, 
    name: 'Photo + Logo', 
    desc: 'Square photo left, round logo right' 
  },
  { 
    id: 3, 
    name: 'Logo First', 
    desc: 'Round logo top, photo under name' 
  },
  { 
    id: 4, 
    name: 'Badge Style', 
    desc: 'Round photo with logo badge overlay' 
  },
  { 
    id: 5, 
    name: 'Minimal', 
    desc: 'Logo only, no photo' 
  },
];

export function LayoutCarousel({ 
  currentData, 
  selectedLayout, 
  onSelectLayout, 
  onClose 
}: LayoutCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(selectedLayout - 1);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? layouts.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev === layouts.length - 1 ? 0 : prev + 1));
  };

  const handleSelect = () => {
    onSelectLayout(layouts[currentSlide].id);
    onClose();
  };

  const currentLayout = layouts[currentSlide];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 flex flex-col gap-4 max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex-1 text-center">
            Choose Card Layout
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Carousel Container */}
        <div className="relative overflow-hidden">
          {/* Navigation Arrows */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="w-10 h-10 rounded-full bg-white/90 shadow-lg hover:bg-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="w-10 h-10 rounded-full bg-white/90 shadow-lg hover:bg-white"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Slides */}
          <div
            className="flex transition-transform duration-300 ease-in-out px-12"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {layouts.map((layout) => (
              <div
                key={layout.id}
                className="min-w-full flex flex-col items-center gap-3 px-2"
              >
                {/* Card Preview */}
                <div
                  className={`w-full max-w-xs rounded-2xl border-2 transition-all ${
                    layout.id === selectedLayout
                      ? 'border-purple-500 ring-2 ring-purple-500/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="scale-75 origin-top">
                    <BusinessCardPreview 
                      data={{ 
                        ...currentData, 
                        layoutStyle: layout.id 
                      }} 
                    />
                  </div>
                </div>

                {/* Layout Info */}
                <div className="text-center space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">
                    {layout.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {layout.desc}
                  </p>
                </div>

                {/* Select Button */}
                <Button
                  onClick={handleSelect}
                  variant={layout.id === selectedLayout ? 'default' : 'outline'}
                  className={`mt-2 rounded-full px-6 py-1.5 text-xs font-medium ${
                    layout.id === selectedLayout
                      ? 'gradient-bg'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {layout.id === selectedLayout ? 'Current Layout' : 'Use This Layout'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {layouts.map((layout, index) => (
            <button
              key={layout.id}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all rounded-full ${
                index === currentSlide
                  ? 'w-6 h-2 bg-slate-900'
                  : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to layout ${index + 1}`}
            />
          ))}
        </div>

        {/* Layout Counter */}
        <div className="text-center text-xs text-slate-500">
          Layout {currentSlide + 1} of {layouts.length}
        </div>
      </div>
    </div>
  );
}
