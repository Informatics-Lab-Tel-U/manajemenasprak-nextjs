'use client';

import * as React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { FileText, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ONEDRIVE_CDN_ICON = 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/microsoft-onedrive/default.svg';

function sanitizeAttachmentUrl(rawUrl?: string | null): string {
  const trimmed = rawUrl?.trim();
  if (!trimmed || trimmed === '#') return '#';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
  }
  return '#';
}

export const AttachmentNode = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      title: {
        default: 'Lampiran Dokumen',
        parseHTML: (element) => element.getAttribute('data-title') || element.getAttribute('title') || 'Lampiran Dokumen',
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
      fileType: {
        default: 'Document',
        parseHTML: (element) => element.getAttribute('data-file-type') || element.getAttribute('filetype') || 'Document',
        renderHTML: (attributes) => ({
          'data-file-type': attributes.fileType,
        }),
      },
      downloadUrl: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-download-url') || element.getAttribute('downloadurl') || '',
        renderHTML: (attributes) => ({
          'data-download-url': attributes.downloadUrl,
        }),
      },
      driveType: {
        default: 'onedrive', // 'onedrive' | 'drive'
        parseHTML: (element) => element.getAttribute('data-drive-type') || element.getAttribute('drivetype') || 'onedrive',
        renderHTML: (attributes) => ({
          'data-drive-type': attributes.driveType,
        }),
      },
      buttonText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-button-text') || element.getAttribute('buttontext') || '',
        renderHTML: (attributes) => ({
          'data-button-text': attributes.buttonText,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="attachment-card"]',
        getAttrs: (element: any) => ({
          title: element.getAttribute('data-title') || element.getAttribute('title') || 'Lampiran Dokumen',
          fileType: element.getAttribute('data-file-type') || element.getAttribute('filetype') || 'Document',
          downloadUrl: element.getAttribute('data-download-url') || element.getAttribute('downloadurl') || '',
          driveType: element.getAttribute('data-drive-type') || element.getAttribute('drivetype') || 'drive',
          buttonText: element.getAttribute('data-button-text') || element.getAttribute('buttontext') || '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes.title || HTMLAttributes['data-title'] || 'Lampiran Dokumen';
    const fileType = HTMLAttributes.fileType || HTMLAttributes['data-file-type'] || 'Document';
    const downloadUrl = sanitizeAttachmentUrl(
      HTMLAttributes.downloadUrl || HTMLAttributes['data-download-url']
    );
    const driveTypeAttr = HTMLAttributes.driveType || HTMLAttributes['data-drive-type'] || 'drive';
    const isOneDrive = driveTypeAttr === 'onedrive' ||
      downloadUrl.includes('onedrive') || downloadUrl.includes('1drv.ms') || downloadUrl.includes('sharepoint');

    const buttonText = HTMLAttributes.buttonText || HTMLAttributes['data-button-text'] || 'Buka Link';

    const iconSpec = isOneDrive
      ? [
        'img',
        {
          src: ONEDRIVE_CDN_ICON,
          alt: 'OneDrive',
          style: 'margin: 0 !important; padding: 0 !important; display: block !important; width: 14px !important; height: 14px !important; object-fit: contain !important;',
        },
      ]
      : [
        'svg',
        { width: '15', height: '15', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
        ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }],
        ['polyline', { points: '15 3 21 3 21 9' }],
        ['line', { x1: '10', y1: '14', x2: '21', y2: '3' }],
      ];

    const linkAttrs: Record<string, string> = {
      href: downloadUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      class: 'attachment-download-btn',
    };

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'attachment-card',
        'data-title': title,
        'data-file-type': fileType,
        'data-download-url': downloadUrl,
        'data-drive-type': driveTypeAttr,
        'data-button-text': buttonText,
        class: 'attachment-card-wrapper',
      }),
      [
        'div',
        { class: 'attachment-card-left' },
        [
          'div',
          { class: 'attachment-icon-box' },
          [
            'svg',
            { width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
            ['path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }],
            ['polyline', { points: '14 2 14 8 20 8' }],
            ['line', { x1: '16', y1: '13', x2: '8', y2: '13' }],
            ['line', { x1: '16', y1: '17', x2: '8', y2: '17' }],
          ]
        ],
        [
          'div',
          { class: 'attachment-info' },
          ['span', { class: 'attachment-title' }, title],
          ['span', { class: 'attachment-meta' }, fileType],
        ],
      ],
      [
        'div',
        { class: 'attachment-card-right' },
        [
          'a',
          linkAttrs,
          iconSpec,
          ['span', {}, buttonText],
        ],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentNodeView);
  },
});

export function AttachmentNodeView(props: any) {
  const { node, updateAttributes, deleteNode, selected, editor } = props;
  const {
    title = 'Lampiran Dokumen',
    fileType = 'Document',
    downloadUrl = '',
    driveType = 'onedrive',
    buttonText = '',
  } = node.attrs;

  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const isEditable = editor.isEditable;
  const labelToShow = buttonText || 'Buka Link';

  const isOneDriveCard = driveType === 'onedrive' ||
    (downloadUrl && (downloadUrl.includes('onedrive') || downloadUrl.includes('1drv.ms') || downloadUrl.includes('sharepoint')));

  const handleFieldChange = (field: string, val: string) => {
    const nextAttrs: Record<string, any> = {
      title,
      fileType,
      downloadUrl,
      driveType,
      buttonText,
      [field]: val,
    };

    if (
      field === 'downloadUrl' &&
      (val.includes('onedrive') || val.includes('1drv.ms') || val.includes('sharepoint'))
    ) {
      nextAttrs.driveType = 'onedrive';
    }

    updateAttributes(nextAttrs);
  };

  return (
    <NodeViewWrapper className="w-full my-4">
      <div
        className={`w-full group relative flex items-center justify-between gap-4 p-3.5 px-4 rounded-xl border bg-card/60 backdrop-blur-xs transition-all ${selected && isEditable ? 'ring-2 ring-primary border-primary' : 'border-border/70 hover:border-border'
          }`}
      >
        {/* Left icon & text */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-12 rounded-lg bg-muted/80 border border-border/50 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
            <FileText className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-foreground tracking-tight truncate">
              {title || 'Untitled Document'}
            </span>
            <span className="text-xs text-muted-foreground/80 font-normal mt-0.5 truncate">
              {fileType || 'Document'}
            </span>
          </div>
        </div>

        {/* Right Single Customizable Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={sanitizeAttachmentUrl(downloadUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-xs flex items-center gap-1.5 border border-border/60 transition-colors shadow-2xs"
          >
            {isOneDriveCard ? (
              <img src={ONEDRIVE_CDN_ICON} alt="OneDrive" className="w-3.5 h-3.5 object-contain shrink-0 block m-0 p-0" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            <span>{labelToShow}</span>
          </a>

          {/* Quick Edit Controls for Editor */}
          {isEditable && (
            <div className="flex items-center gap-1 ml-1">
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" type="button">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-4"
                  align="end"
                  onInteractOutside={(e) => {
                    const target = e.target as HTMLElement;
                    if (target?.closest?.('[data-radix-select-viewport]') || target?.closest?.('[role="listbox"]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="att-title" className="text-xs font-medium">Judul Dokumen</Label>
                      <Input
                        id="att-title"
                        value={title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="Contoh: Proposal Penelitian 2026"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="att-type" className="text-xs font-medium">Tipe / Info File</Label>
                      <Input
                        id="att-type"
                        value={fileType}
                        onChange={(e) => handleFieldChange('fileType', e.target.value)}
                        placeholder="Contoh: Document · PDF"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="att-btn-text" className="text-xs font-medium">Teks Tombol (Opsional)</Label>
                      <Input
                        id="att-btn-text"
                        value={buttonText}
                        onChange={(e) => handleFieldChange('buttonText', e.target.value)}
                        placeholder="Default: Buka Link"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="att-url" className="text-xs font-medium">URL Tautan / Link File</Label>
                      <Input
                        id="att-url"
                        value={downloadUrl}
                        onChange={(e) => handleFieldChange('downloadUrl', e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="att-drive-type" className="text-xs font-medium">Tipe Provider / Link</Label>
                      <Select
                        value={driveType}
                        onValueChange={(val) => handleFieldChange('driveType', val)}
                      >
                        <SelectTrigger id="att-drive-type" className="h-8 text-xs w-full">
                          <SelectValue placeholder="Pilih Provider Link" />
                        </SelectTrigger>
                        <SelectContent
                          onPointerDownOutside={(e) => e.preventDefault()}
                        >
                          <SelectItem value="drive">URL Biasa / Tautan Kustom</SelectItem>
                          <SelectItem value="onedrive">Microsoft OneDrive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => setIsPopoverOpen(false)}
                      >
                        Selesai
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={deleteNode}
                className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
