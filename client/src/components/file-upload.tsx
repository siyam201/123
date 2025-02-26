import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { fileToBase64 } from '@/lib/file-utils';
import { MAX_FILE_SIZE } from '@shared/schema';

interface FileUploadProps {
  parentId: number | null;
}

export function FileUpload({ parentId }: FileUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        const content = await fileToBase64(file);
        await apiRequest('POST', '/api/files', {
          name: file.name,
          path: `/${file.name}`,
          size: file.size,
          type: file.type,
          content,
          parentId,
          isFolder: false
        });

        // Invalidate queries after successful upload
        await queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/storage'] });

        toast({
          title: 'Success',
          description: `${file.name} uploaded successfully`,
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload failed',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
          variant: 'destructive'
        });
        return;
      }
      uploadMutation.mutate(file);
    });
  }, [uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <Card
      {...getRootProps()}
      className={`p-8 border-2 border-dashed cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
        ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2 text-center">
        <Upload className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploadMutation.isPending ? 'Uploading...' :
            isDragActive ? "Drop files here" :
            "Drag & drop files here, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground">
          Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB
        </p>
      </div>
    </Card>
  );
}