"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ImageIcon, VideoIcon, Play } from "lucide-react";

// OMOTECH HUB color scheme
const primaryColor = "#263C7C"; // Strong dark blue
const secondaryColor = "#8B99B9"; // Soft medium blue-gray
const backgroundColor = "#F0F2FE"; // Very light bluish-white

interface GalleryItem {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  category: string;
  status: string;
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function PublicGalleryPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState<GalleryItem | null>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  useEffect(() => {
    fetchGalleryItems();
  }, []);

  const fetchGalleryItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/gallery?status=active");
      const data = await response.json();
      if (data.success) {
        // Sort by order, then by createdAt desc
        const sorted = data.gallery
          .sort((a: GalleryItem, b: GalleryItem) => a.order - b.order || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGalleryItems(sorted);
      }
    } catch (error) {
      console.error("Error fetching gallery items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F2FE] to-white flex flex-col">
      <Navbar />
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 bg-white border-b border-gray-100 pt-24 md:pt-28">
        <div className="flex justify-center w-full px-2">
          <div
            className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12 rounded-2xl md:rounded-3xl shadow-sm"
            style={{
              background: backgroundColor, // very light bluish-white
              boxShadow: `0 2px 16px 0 ${primaryColor}11`,
            }}
          >
            <h1
              className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-poppins font-bold mb-4 text-center"
              style={{ color: primaryColor, letterSpacing: '-0.03em' }}
            >
              Our Gallery
            </h1>
            <p className="text-sm xs:text-base sm:text-lg md:text-xl max-w-2xl mx-auto mt-2 mb-0 text-center font-poppins" style={{ color: primaryColor }}>
              Discover our technology solutions, service excellence, and quality work. Explore our electronics repairs, gas installations, and custom printing projects.
            </p>
          </div>
        </div>
      </section>
      {/* Gallery Grid */}
      <main className="flex-1">
        <section className="container mx-auto px-4 md:px-8 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 animate-pulse shadow-lg" />
              ))}
            </div>
          ) : galleryItems.length > 0 ? (
            <div
              className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              style={{
                gridAutoRows: "1fr",
              }}
            >
              {galleryItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.07 }}
                  className="group aspect-[4/5] rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative flex flex-col"
                  style={{ boxShadow: `0 4px 32px 0 ${secondaryColor}22` }}
                  onClick={() => {
                    setSelectedGalleryItem(item);
                    setIsGalleryModalOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') { setSelectedGalleryItem(item); setIsGalleryModalOpen(true); } }}
                >
                  <div className="relative flex-1">
                    {item.mediaType === 'video' ? (
                      <div className="w-full h-full relative">
                        <video
                          src={item.mediaUrl}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          muted
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const video = e.target as HTMLVideoElement;
                            video.pause();
                            video.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(139,153,185,0.25)] via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-8 h-8 text-gray-800 ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                    <Image
                        src={item.mediaUrl}
                      alt={item.title}
                      width={400}
                      height={500}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(139,153,185,0.25)] via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-5 pb-6 flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-playfair text-lg font-semibold truncate" style={{ color: primaryColor }}>{item.title}</h4>
                      {item.mediaType === 'video' && (
                        <VideoIcon className="w-4 h-4" style={{ color: secondaryColor }} />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm" style={{ color: secondaryColor }}>{item.description}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-lg">
                  <ImageIcon className="w-10 h-10" style={{ color: primaryColor }} />
                </div>
              ))}
            </div>
          )}
        </section>
        {/* Modal for viewing media */}
        <AnimatePresence>
          {isGalleryModalOpen && selectedGalleryItem && (
            <Dialog open={isGalleryModalOpen} onOpenChange={setIsGalleryModalOpen}>
              <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent shadow-none">
                <DialogTitle className="sr-only">{selectedGalleryItem.title || "Gallery Media"}</DialogTitle>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="relative bg-white rounded-3xl shadow-2xl border-4"
                  style={{ borderColor: primaryColor }}
                >
                  <button
                    className="absolute top-3 right-3 z-10 bg-white/80 rounded-full p-2 hover:bg-white border border-gray-200"
                    onClick={() => setIsGalleryModalOpen(false)}
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" style={{ color: primaryColor }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {selectedGalleryItem.mediaType === 'video' ? (
                    <video
                      src={selectedGalleryItem.mediaUrl}
                      className="w-full h-[350px] xs:h-[400px] sm:h-[450px] md:h-[500px] object-cover rounded-t-3xl"
                      controls
                      autoPlay
                    />
                  ) : (
                  <Image
                      src={selectedGalleryItem.mediaUrl}
                    alt={selectedGalleryItem.title}
                    width={800}
                    height={600}
                    className="w-full h-[350px] xs:h-[400px] sm:h-[450px] md:h-[500px] object-cover rounded-t-3xl"
                  />
                  )}
                  <div className="p-8">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold font-playfair" style={{ color: primaryColor }}>{selectedGalleryItem.title}</h3>
                      {selectedGalleryItem.mediaType === 'video' && (
                        <VideoIcon className="w-6 h-6" style={{ color: secondaryColor }} />
                      )}
                    </div>
                    {selectedGalleryItem.description && (
                      <p className="text-lg" style={{ color: secondaryColor }}>{selectedGalleryItem.description}</p>
                    )}
                  </div>
                </motion.div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </main>
      <Footer />
      <style jsx global>{`
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
    </div>
  );
} 