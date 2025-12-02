import { useState, useEffect, useRef } from 'react';
import { BusinessCardData } from '@/types/business-card';
import { BusinessCardPreview } from '@/components/business-card-preview';
import { X } from 'lucide-react';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to selected layout on mount
  useEffect(() => {
    const initialIndex = selectedLayout - 1;
    if (slideRefs.current[initialIndex]) {
      slideRefs.current[initialIndex]?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedLayout]);

  // Track scroll position to update pagination dots
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const slideWidth = container.offsetWidth * 0.8; // 80% width per slide
      const index = Math.round(scrollLeft / slideWidth);
      setCurrentSlide(Math.max(0, Math.min(index, layouts.length - 1)));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectLayout = (layoutId: number) => {
    onSelectLayout(layoutId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
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

        {/* Carousel Container - Touch Swipe Only */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div
            ref={scrollContainerRef}
            className="mt-3 flex overflow-x-auto snap-x snap-mandatory gap-4 px-4 pb-6 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {layouts.map((layout, index) => (
              <div
                key={layout.id}
                ref={(el) => (slideRefs.current[index] = el)}
                className="snap-center shrink-0 w-[80%] max-w-sm flex flex-col items-center gap-3"
              >
                {/* Static Card Preview - Tap to Select */}
                <div
                  onClick={() => handleSelectLayout(layout.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectLayout(layout.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full rounded-3xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer"
                  style={{
                    borderColor: layout.id === selectedLayout ? 'rgb(168, 85, 247)' : 'rgb(226, 232, 240)',
                    boxShadow: layout.id === selectedLayout ? '0 0 0 4px rgba(168, 85, 247, 0.1)' : 'none',
                  }}
                >
                  {/* Non-interactive preview */}
                  <div className="pointer-events-none w-full rounded-3xl bg-white p-4 overflow-hidden">
                    <div className="scale-[0.85] origin-top">
                      <BusinessCardPreview 
                        data={{ 
                          ...currentData, 
                          layoutStyle: layout.id 
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Layout Info */}
                <div className="text-center space-y-1 px-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {layout.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {layout.desc}
                  </p>
                  {layout.id === selectedLayout && (
                    <p className="text-xs font-medium text-purple-600 mt-1">
                      Current Layout
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-1.5 py-2 shrink-0">
          {layouts.map((layout, index) => (
            <div
              key={layout.id}
              className={`transition-all rounded-full ${
                index === currentSlide
                  ? 'w-6 h-2 bg-slate-900'
                  : 'w-2 h-2 bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Layout Counter */}
        <div className="text-center text-xs text-slate-500 pb-4 shrink-0">
          Layout {currentSlide + 1} of {layouts.length}
        </div>
      </div>
    </div>
  );
}
