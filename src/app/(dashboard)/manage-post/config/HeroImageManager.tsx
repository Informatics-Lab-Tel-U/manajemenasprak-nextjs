'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Save,
  Plus,
  Trash2,
  Upload,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateHeroImagesData, type HeroImageItem } from '@/services/webConfigService';

interface HeroImageManagerProps {
  initialData: HeroImageItem[];
}

const BUCKET_NAME = 'manajemenasprak';

export default function HeroImageManager({ initialData }: HeroImageManagerProps) {
  const [images, setImages] = useState<HeroImageItem[]>(() => {
    if (initialData && initialData.length > 0) return initialData;
    return [
      {
        id: crypto.randomUUID(),
        image: '/backgrounds/bg-1.jpeg',
        alt: 'Hero Showcase',
        title: 'Informatics Laboratory'
      }
    ];
  });

  const [isPending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [dragActiveIdx, setDragActiveIdx] = useState<number | null>(null);
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleAddSlide = () => {
    const newSlide: HeroImageItem = {
      id: crypto.randomUUID(),
      image: '/backgrounds/bg-1.jpeg',
      alt: `Hero Showcase Slide ${images.length + 1}`,
      title: 'Informatics Laboratory'
    };
    setImages((prev) => [...prev, newSlide]);
  };

  const handleRemoveSlide = async (index: number) => {
    const item = images[index];
    const { data: baseData } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
    const supabaseUrlPrefix = baseData.publicUrl;

    if (item.image && item.image.startsWith(supabaseUrlPrefix)) {
      const oldFilePath = item.image.replace(supabaseUrlPrefix, '');
      await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
    }

    setImages((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    toast.success('Slide berhasil dihapus dari daftar.');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleFieldChange = (index: number, field: keyof HeroImageItem, value: string) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const triggerUpload = (index: number) => {
    setActiveUploadIndex(index);
    fileInputRef.current?.click();
  };

  const compressImageForWeb = async (
    file: File,
    maxWidth = 1920,
    quality = 0.85
  ): Promise<{ blob: Blob; ext: string }> => {
    return new Promise((resolve) => {
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        const ext = file.name.split('.').pop() || 'png';
        return resolve({ blob: file, ext });
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const ext = file.name.split('.').pop() || 'jpg';
            return resolve({ blob: file, ext });
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, ext: 'webp' });
              } else {
                canvas.toBlob(
                  (fallbackBlob) => {
                    if (fallbackBlob) {
                      resolve({ blob: fallbackBlob, ext: 'jpg' });
                    } else {
                      const ext = file.name.split('.').pop() || 'jpg';
                      resolve({ blob: file, ext });
                    }
                  },
                  'image/jpeg',
                  quality
                );
              }
            },
            'image/webp',
            quality
          );
        };
        img.onerror = () => {
          const ext = file.name.split('.').pop() || 'jpg';
          resolve({ blob: file, ext });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        const ext = file.name.split('.').pop() || 'jpg';
        resolve({ blob: file, ext });
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (index: number, rawFile: File) => {
    const item = images[index];
    if (!item) return;

    setUploadingId(item.id);

    try {
      // Optimasi gambar di browser: resize max 1920px & convert ke WebP
      const { blob: optimizedBlob, ext: fileExt } = await compressImageForWeb(rawFile, 1920, 0.85);
      const fileName = `hero-${item.id}-${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      const { data: baseData } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
      const supabaseUrlPrefix = baseData.publicUrl;

      // Bersihkan file lama jika berasal dari Supabase Storage
      if (item.image && item.image.startsWith(supabaseUrlPrefix)) {
        const oldFilePath = item.image.replace(supabaseUrlPrefix, '');
        await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, optimizedBlob, {
          contentType: fileExt === 'webp' ? 'image/webp' : rawFile.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      handleFieldChange(index, 'image', publicUrlData.publicUrl);
      toast.success('Foto hero berhasil dioptimasi dan disimpan.');
    } catch (error: any) {
      console.error('Error uploading hero image:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Gagal mengunggah foto: ${message}`);
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || activeUploadIndex === null) return;
    const file = e.target.files[0];
    await uploadFile(activeUploadIndex, file);
    setActiveUploadIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveIdx(idx);
    } else if (e.type === 'dragleave') {
      setDragActiveIdx(null);
    }
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveIdx(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(idx, e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    if (images.length === 0) {
      toast.error('Minimal harus ada 1 gambar hero.');
      return;
    }

    startTransition(async () => {
      const payload = images.map((img, idx) => ({
        ...img,
        order: idx + 1
      }));

      const result = await updateHeroImagesData(payload);
      if (result.success) {
        toast.success('Konfigurasi gambar Hero berhasil disimpan.');
      } else {
        toast.error(`Gagal menyimpan: ${result.error || 'Terjadi kesalahan sistem'}`);
      }
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Foto Hero</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola foto banner utama yang tampil di beranda blog.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddSlide}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Banner
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {images.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/10">
            <p className="text-sm text-muted-foreground">Belum ada slide gambar yang ditambahkan.</p>
            <Button variant="secondary" size="sm" onClick={handleAddSlide} className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Tambah Slide Pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {images.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 md:p-5 rounded-xl border transition-all ${
                  dragActiveIdx === index ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-border bg-card'
                }`}
                onDragEnter={(e) => handleDrag(e, index)}
                onDragLeave={(e) => handleDrag(e, index)}
                onDragOver={(e) => handleDrag(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Preview Banner */}
                  <div className="relative w-full lg:w-[380px] aspect-[21/9] rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0 group">
                    <img
                      src={item.image}
                      alt={item.alt || 'Preview Hero'}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={uploadingId === item.id}
                        onClick={() => triggerUpload(index)}
                        className="h-8 text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Ganti Foto
                      </Button>
                    </div>

                    {uploadingId === item.id && (
                      <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-xs font-medium">Mengunggah...</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded-md font-mono">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Metadata & Controls */}
                  <div className="flex-1 w-full space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor={`title-${item.id}`} className="text-xs">
                          Judul (Opsional)
                        </Label>
                        <Input
                          id={`title-${item.id}`}
                          value={item.title || ''}
                          placeholder="Judul banner"
                          onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`alt-${item.id}`} className="text-xs">
                          Alt Text (Opsional)
                        </Label>
                        <Input
                          id={`alt-${item.id}`}
                          value={item.alt || ''}
                          placeholder="Deskripsi gambar"
                          onChange={(e) => handleFieldChange(index, 'alt', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          title="Geser ke atas"
                          className="h-8 px-2"
                        >
                          <ArrowUp className="w-4 h-4 mr-1" />
                          <span className="text-xs">Naik</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === images.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          title="Geser ke bawah"
                          className="h-8 px-2"
                        >
                          <ArrowDown className="w-4 h-4 mr-1" />
                          <span className="text-xs">Turun</span>
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSlide(index)}
                        disabled={images.length <= 1}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="text-xs">Hapus</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 flex justify-end border-t border-border">
          <Button onClick={handleSave} disabled={isPending || uploadingId !== null}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
