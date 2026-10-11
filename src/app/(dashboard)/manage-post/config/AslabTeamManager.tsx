'use client';

import React, { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateAslabTeamData } from '@/services/webConfigService';
import { Save, Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

export interface AslabMember {
  id: string;
  image: string;
}

export interface AslabTeamData {
  koordinator: AslabMember[];
  wakil_koordinator: AslabMember[];
  asisten: AslabMember[];
}

interface AslabTeamManagerProps {
  initialData: AslabTeamData;
}

const BUCKET_NAME = 'manajemenasprak';

interface MemberListSectionProps {
  title: string;
  type: keyof AslabTeamData;
  members: AslabMember[];
  uploadingId: string | null;
  onAdd: (type: keyof AslabTeamData) => void;
  onRemove: (type: keyof AslabTeamData, index: number) => void;
  onUploadClick: (type: keyof AslabTeamData, index: number) => void;
  onDropFile: (type: keyof AslabTeamData, index: number, file: File) => void;
}

const MemberListSection: React.FC<MemberListSectionProps> = ({
  title,
  type,
  members,
  uploadingId,
  onAdd,
  onRemove,
  onUploadClick,
  onDropFile
}) => {
  const [dragActiveIdx, setDragActiveIdx] = React.useState<number | null>(null);

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
      onDropFile(type, idx, e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button variant="outline" size="sm" onClick={() => onAdd(type)}>
          <Plus className="w-4 h-4 mr-2" /> Tambah
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Belum ada foto.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {members.map((member, idx) => (
            <div
              key={member.id}
              className={`relative group w-32 h-32 rounded-lg overflow-hidden border ${dragActiveIdx === idx ? 'border-primary ring-2 ring-primary/50' : 'border-border'} bg-muted flex-shrink-0 transition-all`}
              onDragEnter={(e) => handleDrag(e, idx)}
              onDragLeave={(e) => handleDrag(e, idx)}
              onDragOver={(e) => handleDrag(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
            >
              <img
                src={member.image}
                alt="Foto"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 hover:text-white h-8 w-8"
                  disabled={uploadingId === member.id}
                  onClick={() => onUploadClick(type, idx)}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:bg-red-500/20 hover:text-red-400 h-8 w-8"
                  onClick={() => onRemove(type, idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {uploadingId === member.id && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <span className="text-xs font-medium animate-pulse">Uploading...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AslabTeamManager({ initialData }: AslabTeamManagerProps) {
  // Ensure backward compatibility with data that might not have wakil_koordinator
  const [data, setData] = useState<AslabTeamData>({
    koordinator: initialData.koordinator || [],
    wakil_koordinator: initialData.wakil_koordinator || [],
    asisten: initialData.asisten || []
  });
  const [isPending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadContext, setActiveUploadContext] = useState<{ type: keyof AslabTeamData, index: number } | null>(null);

  const supabase = createClient();

  const handleAddMember = (type: keyof AslabTeamData) => {
    const newMember: AslabMember = {
      id: crypto.randomUUID(),
      image: '/BGWID.jpg' // default image
    };

    setData(prev => ({
      ...prev,
      [type]: [...prev[type], newMember]
    }));
  };

  const handleRemoveMember = async (type: keyof AslabTeamData, index: number) => {
    // Delete from Supabase first if it's a valid Supabase URL
    const member = data[type][index];
    const { data: baseData } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
    const supabaseUrlPrefix = baseData.publicUrl;

    if (member.image && member.image.startsWith(supabaseUrlPrefix)) {
      const oldFilePath = member.image.replace(supabaseUrlPrefix, '');
      await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
    }

    setData(prev => {
      const newList = [...prev[type]];
      newList.splice(index, 1);
      return { ...prev, [type]: newList };
    });
  };

  const handleUpdateMember = (type: keyof AslabTeamData, index: number, field: keyof AslabMember, value: string) => {
    setData(prev => {
      const newList = [...prev[type]];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [type]: newList };
    });
  };

  const triggerFileUpload = (type: keyof AslabTeamData, index: number) => {
    setActiveUploadContext({ type, index });
    fileInputRef.current?.click();
  };

  const uploadFile = async (type: keyof AslabTeamData, index: number, file: File) => {
    const member = data[type][index];
    const memberId = member.id;

    setUploadingId(memberId);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `${memberId}-${Date.now()}.${fileExt}`;
      const filePath = `aslab/${fileName}`;

      const { data: baseData } = supabase.storage.from(BUCKET_NAME).getPublicUrl('');
      const supabaseUrlPrefix = baseData.publicUrl;

      if (member.image && member.image.startsWith(supabaseUrlPrefix)) {
        const oldFilePath = member.image.replace(supabaseUrlPrefix, '');
        await supabase.storage.from(BUCKET_NAME).remove([oldFilePath]);
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, compressedFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      handleUpdateMember(type, index, 'image', publicUrlData.publicUrl);
      toast.success('Foto berhasil diunggah!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const errMessage = error instanceof Error ? error.message : String(error);
      toast.error(`Gagal mengunggah foto: ${errMessage}`);
    } finally {
      setUploadingId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeUploadContext) return;

    const file = e.target.files[0];
    const { type, index } = activeUploadContext;

    await uploadFile(type, index, file);

    setActiveUploadContext(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateAslabTeamData(data);
      if (result.success) {
        toast.success('Data Tim Aslab berhasil disimpan!');
      } else {
        toast.error(`Gagal menyimpan: ${result.error}`);
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

      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Foto Tim Asisten Laboratorium</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola foto ASLAB yang akan ditampilkan di publik.
        </p>
      </div>

      <div className="p-6 space-y-8">
        <MemberListSection
          title="Koordinator"
          type="koordinator"
          members={data.koordinator}
          uploadingId={uploadingId}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          onUploadClick={triggerFileUpload}
          onDropFile={uploadFile}
        />
        <MemberListSection
          title="Wakil Koordinator"
          type="wakil_koordinator"
          members={data.wakil_koordinator}
          uploadingId={uploadingId}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          onUploadClick={triggerFileUpload}
          onDropFile={uploadFile}
        />
        <MemberListSection
          title="Asisten Reguler"
          type="asisten"
          members={data.asisten}
          uploadingId={uploadingId}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          onUploadClick={triggerFileUpload}
          onDropFile={uploadFile}
        />

        <div className="pt-4 flex justify-end border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isPending}
          >
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
