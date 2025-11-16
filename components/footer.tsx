"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShirtIcon, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Music } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SocialMediaLink {
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok'
  url: string
  isActive: boolean
}

export function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>([])

  useEffect(() => {
    fetchSocialMediaLinks()
  }, [])

  const fetchSocialMediaLinks = async () => {
    try {
      const response = await fetch('/api/social-media')
      const data = await response.json()
      
      if (data.success && data.data) {
        setSocialLinks(data.data.filter((link: SocialMediaLink) => link.isActive && link.url))
      }
    } catch (error) {
      console.error('Error fetching social media links:', error)
    }
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-5 h-5 text-[#263C7C]" />
      case 'facebook':
        return <Facebook className="w-5 h-5 text-[#263C7C]" />
      case 'twitter':
        return <Twitter className="w-5 h-5 text-[#263C7C]" />
      case 'tiktok':
        return <Music className="w-5 h-5 text-[#263C7C]" />
      default:
        return null
    }
  }

  return (
    <footer className="bg-secondary pt-16 pb-8">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center mb-6">
              <div className="h-20">
                <Image 
                  src="/logo.svg" 
                  alt="OMOTECH HUB Logo" 
                  width={240} 
                  height={80} 
                  className="object-contain h-full w-auto"
                />
              </div>
            </Link>
            <p className="text-text-light mb-4">
              Your trusted partner for electronics retail, gas refilling, and T-shirt printing services. Quality products, expert repairs, and reliable service for all your needs.
            </p>
            <p className="text-[#263C7C] font-semibold text-sm mb-6">
              "Technology, Service, and Quality - All in One Place"
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map((link) => (
                  <Link
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-white hover:bg-white/80 transition-colors luxury-shadow"
                  >
                    {getSocialIcon(link.platform)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/services" className="text-text-light hover:text-primary transition-colors">
                  Services & Pricing
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-text-light hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-text-light hover:text-primary transition-colors">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-text-light hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#263C7C] mt-0.5" />
                <span className="text-text-light">
                  Kutus, Kenya
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#263C7C]" />
                <div className="text-text-light">
                  <Link href="tel:+254740802704" className="hover:text-primary transition-colors block">
                    +254 740 802 704
                  </Link>
                  <Link href="tel:+254745755707" className="hover:text-primary transition-colors block">
                    +254 745 755 707
                  </Link>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#263C7C]" />
                <Link
                  href="mailto:omotechhub@gmail.com"
                  className="text-text-light hover:text-primary transition-colors"
                >
                  omotechhub@gmail.com
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">Newsletter</h3>
            <p className="text-text-light mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
            <div className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-white border-0 luxury-shadow rounded-xl"
              />
              <Button className="btn-primary rounded-xl w-full">Subscribe</Button>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-light">
            © {new Date().getFullYear()} OMOTECH HUB Computers & Services. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-text-light hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-text-light hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
