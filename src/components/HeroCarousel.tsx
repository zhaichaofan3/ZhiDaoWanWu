import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bannerImages } from "@/data/mock";

const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bannerImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden group">
      <div className="relative aspect-[3/1] md:aspect-[3.5/1] bg-muted">
        {bannerImages.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
              <h2 className="text-lg md:text-2xl font-bold text-primary-foreground drop-shadow-md">
                {banner.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/50 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setCurrent((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/50 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setCurrent((prev) => (prev + 1) % bannerImages.length)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Dots */}
      <div className="absolute bottom-2 right-4 flex gap-1.5">
        {bannerImages.map((_, i) => (
          <button
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
