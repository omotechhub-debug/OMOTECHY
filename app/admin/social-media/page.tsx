"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Instagram,
  Facebook,
  Twitter,
  Music,
  Save,
  RefreshCw,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { useAuth } from '@/hooks/useAuth'
import { toast } from "@/components/ui/use-toast"

interface SocialMediaLink {
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok'
  url: string
  isActive: boolean
}

export default function SocialMediaPage() {
  const { token } = useAuth()
  const [links, setLinks] = useState<SocialMediaLink[]>([
    { platform: 'instagram', url: '', isActive: true },
    { platform: 'facebook', url: '', isActive: true },
    { platform: 'twitter', url: '', isActive: true },
    { platform: 'tiktok', url: '', isActive: true }
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSocialMediaLinks()
  }, [])

  const fetchSocialMediaLinks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/social-media')
      const data = await response.json()

      if (data.success && data.data) {
        // Update links with fetched data
        const fetchedLinks = data.data
        setLinks(prevLinks => 
          prevLinks.map(link => {
            const fetched = fetchedLinks.find((f: any) => f.platform === link.platform)
            return fetched 
              ? { platform: link.platform, url: fetched.url || '', isActive: fetched.isActive !== false }
              : link
          })
        )
      }
    } catch (error) {
      console.error('Error fetching social media links:', error)
      toast({
        title: "Error",
        description: "Failed to load social media links",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlChange = (platform: 'instagram' | 'facebook' | 'twitter', url: string) => {
    setLinks(prevLinks =>
      prevLinks.map(link =>
        link.platform === platform ? { ...link, url } : link
      )
    )
  }

  const handleToggleActive = (platform: 'instagram' | 'facebook' | 'twitter') => {
    setLinks(prevLinks =>
      prevLinks.map(link =>
        link.platform === platform ? { ...link, isActive: !link.isActive } : link
      )
    )
  }

  const validateUrl = (url: string): boolean => {
    if (!url) return true // Empty URL is valid (will hide the link)
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSave = async () => {
    // Validate all URLs
    const invalidLinks = links.filter(link => link.url && !validateUrl(link.url))
    if (invalidLinks.length > 0) {
      toast({
        title: "Invalid URLs",
        description: "Please enter valid URLs (e.g., https://instagram.com/yourprofile)",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ links })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Social media links updated successfully",
        })
      } else {
        throw new Error(data.error || 'Failed to update links')
      }
    } catch (error: any) {
      console.error('Error saving social media links:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save social media links",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-5 h-5" />
      case 'facebook':
        return <Facebook className="w-5 h-5" />
      case 'twitter':
        return <Twitter className="w-5 h-5" />
      case 'tiktok':
        return <Music className="w-5 h-5" />
      default:
        return <LinkIcon className="w-5 h-5" />
    }
  }

  const getPlatformName = (platform: string) => {
    if (platform === 'tiktok') {
      return 'TikTok'
    }
    return platform.charAt(0).toUpperCase() + platform.slice(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#263C7C]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Media Links</h1>
          <p className="text-gray-600 mt-2">
            Manage your social media links displayed in the website footer
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#263C7C] hover:bg-[#1e2f5f]"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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

      <div className="grid gap-6">
        {links.map((link) => {
          const isValid = !link.url || validateUrl(link.url)
          return (
            <Card key={link.platform} className="luxury-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#263C7C]/10 rounded-lg text-[#263C7C]">
                      {getPlatformIcon(link.platform)}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{getPlatformName(link.platform)}</CardTitle>
                      <CardDescription>
                        {link.isActive 
                          ? "Link will be displayed in footer" 
                          : "Link will be hidden from footer"
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${link.platform}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`active-${link.platform}`}
                        checked={link.isActive}
                        onCheckedChange={() => handleToggleActive(link.platform)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`url-${link.platform}`} className="mb-2 block">
                      {getPlatformName(link.platform)} URL
                    </Label>
                    <div className="relative">
                      <Input
                        id={`url-${link.platform}`}
                        type="url"
                        placeholder={`https://${link.platform}.com/yourprofile`}
                        value={link.url}
                        onChange={(e) => handleUrlChange(link.platform, e.target.value)}
                        className={`pr-10 ${!isValid ? 'border-red-500' : ''}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {link.url ? (
                          isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )
                        ) : null}
                      </div>
                    </div>
                    {!isValid && (
                      <p className="text-sm text-red-500 mt-1">
                        Please enter a valid URL (e.g., https://{link.platform}.com/yourprofile)
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Leave empty to hide this link from the footer
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Enter full URLs including https:// (e.g., https://instagram.com/yourprofile)</li>
                <li>Toggle "Active" off to hide a link without deleting the URL</li>
                <li>Leave URL empty to hide the link completely</li>
                <li>Changes will appear in the website footer immediately after saving</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

