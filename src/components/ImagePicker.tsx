import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Search, Image as ImageIcon, ExternalLink, X, Loader2, Download } from 'lucide-react';
import type { UnsplashImage } from 'types';
import { apiClient } from "app";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export function ImagePicker({ value, onChange, label = "Featured Image", placeholder = "Enter image URL or upload/search" }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('url');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const response = await apiClient.upload_image({ description: "Image upload" }, { file: selectedFile });
      
      if (response.ok) {
        const data = await response.json();
        onChange(data.url);
        setShowDialog(false);
        setSelectedFile(null);
        toast.success('Image uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setSearching(true);
    try {
      const response = await apiClient.search_images({ query: searchQuery, per_page: 12 });
      const data = await response.json();
      setSearchResults(data.images || []);
      
      if (data.images.length === 0) {
        toast.info('No images found. Try a different search term.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      if (error.message?.includes('503') || error.message?.includes('configured')) {
        toast.error('Image search is not configured yet. Please use URL or upload.');
      } else {
        toast.error('Failed to search images');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUnsplashImage = async (image: UnsplashImage) => {
    // Track download for Unsplash attribution
    try {
      await apiClient.track_unsplash_download({ download_url: image.links.download_location });
    } catch (err) {
      console.error('Failed to track download:', err);
    }

    onChange(image.url);
    setShowDialog(false);
    setSearchResults([]);
    setSearchQuery('');
    toast.success('Image selected');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowDialog(true)}
          className="shrink-0"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Browse
        </Button>
      </div>

      {/* Image Preview */}
      {value && (
        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-50">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EInvalid Image%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      )}

      {/* Image Browser Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
            <DialogDescription>
              Enter a URL, upload an image, or search for free stock photos
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
            </TabsList>

            {/* URL Tab */}
            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              {value && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <img
                    src={value}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3EInvalid Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div>
                <Label htmlFor="image-file">Select Image File</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted formats: JPEG, PNG, WebP (max 5MB)
                </p>
              </div>

              {selectedFile && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium mb-2">Selected File:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded mt-2"
                  />
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </TabsContent>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for images (e.g., 'banking', 'business')"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching}>
                  <Search className="w-4 h-4 mr-2" />
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Search Results Grid */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {searchResults.map((image) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => handleSelectUnsplashImage(image)}
                    >
                      <img
                        src={image.thumb_url}
                        alt={image.description || 'Unsplash image'}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs text-center px-2">Click to select</p>
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-xs text-muted-foreground truncate" title={image.photographer}>
                          Photo by {image.photographer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Photos from{' '}
                  <a
                    href="https://unsplash.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Unsplash
                  </a>
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
