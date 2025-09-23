"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 10,
  className = ""
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const remainingSlots = maxImages - images.length;
    
    if (filesArray.length > remainingSlots) {
      setError(`You can only upload ${remainingSlots} more image(s). Maximum ${maxImages} images allowed.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = filesArray.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not a valid image file`);
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large. Maximum size is 5MB`);
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onImagesChange([...images, ...uploadedUrls]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    // Basic URL validation
    try {
      new URL(urlInput.trim());
      if (images.includes(urlInput.trim())) {
        setError('This image URL is already added');
        return;
      }
      if (images.length >= maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }
      
      onImagesChange([...images, urlInput.trim()]);
      setUrlInput('');
      setError(null);
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Product Images</Label>
      
      {/* Upload Area */}
      <Card 
        className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-primary" />
              )}
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {uploading ? 'Uploading Images...' : 'Upload Images'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop images here, or click to select files
            </p>
            
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || images.length >= maxImages}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              
              <div className="text-xs text-gray-500">
                {images.length}/{maxImages} images • Max 5MB each
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="image-url">Or add image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image-url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={images.length >= maxImages}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlAdd())}
          />
          <Button
            type="button"
            onClick={handleUrlAdd}
            disabled={!urlInput.trim() || images.length >= maxImages}
            size="sm"
          >
            <LinkIcon className="w-4 h-4 mr-1" />
            Add URL
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preview ({images.length} images)</Label>
            <Badge variant="secondary">
              {images.length}/{maxImages}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={image}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      console.error('Image load error:', image);
                      // You could set a placeholder image here
                    }}
                  />
                </div>
                
                {/* Remove Button */}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
                
                {/* Upload Status Indicator */}
                <div className="absolute bottom-1 right-1">
                  {image.startsWith('http') && !image.includes('cloudinary') ? (
                    <Badge variant="outline" className="text-xs">
                      <LinkIcon className="w-3 h-3 mr-1" />
                      URL
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Supported formats: JPG, PNG, GIF, WebP</p>
        <p>• Maximum file size: 5MB per image</p>
        <p>• Maximum images: {maxImages}</p>
        <p>• Images are automatically optimized and stored securely</p>
      </div>
    </div>
  );
}
