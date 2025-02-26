import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { type File } from '@shared/schema';

interface FilePreviewProps {
  file: File | null;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isText = file.type.startsWith('text/');
  const isVideo = file.type.startsWith('video/');

  const downloadFile = () => {
    // Create blob from base64 content
    const binary = atob(file.content.split(',')[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: file.type });

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{file.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={downloadFile}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isImage && (
            <img 
              src={file.content} 
              alt={file.name}
              className="max-h-[70vh] mx-auto"
            />
          )}
          {isVideo && (
            <video 
              controls
              className="max-h-[70vh] w-full"
              src={file.content}
            >
              Your browser does not support the video tag.
            </video>
          )}
          {isText && (
            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg overflow-auto max-h-[70vh]">
              {atob(file.content.split(',')[1])}
            </pre>
          )}
          {!isImage && !isText && !isVideo && (
            <div className="text-center py-8">
              <p>Preview not available for this file type.</p>
              <Button onClick={downloadFile} className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}