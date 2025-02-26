import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { File as FileIcon, Folder, Search, Trash2, Edit2 } from 'lucide-react';
import { formatFileSize } from '@/lib/file-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FilePreview } from './file-preview';
import type { File } from '@shared/schema';

interface FileListProps {
  parentId: number | null;
  onFolderClick: (id: number) => void;
}

export function FileList({ parentId, onFolderClick }: FileListProps) {
  const [search, setSearch] = useState('');
  const [renameFile, setRenameFile] = useState<{ id: number, name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ['/api/files', parentId],
    queryFn: async () => {
      const res = await fetch(`/api/files?parentId=${parentId || ''}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({ title: 'File deleted' });
    }
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number, name: string }) => 
      apiRequest('PATCH', `/api/files/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setRenameFile(null);
      toast({ title: 'File renamed' });
    }
  });

  const handleFileClick = (file: File) => {
    if (file.isFolder) {
      onFolderClick(file.id);
    } else {
      setPreviewFile(file);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const filteredFiles = files?.filter((f: File) => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles?.map((file: File) => (
          <Card 
            key={file.id} 
            className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/5"
            onClick={() => handleFileClick(file)}
          >
            {file.isFolder ? (
              <Folder className="h-8 w-8 text-blue-500" />
            ) : (
              <FileIcon className="h-8 w-8 text-gray-500" />
            )}

            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">
                {file.name}
              </p>
              {!file.isFolder && (
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              )}
            </div>

            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRenameFile({ id: file.id, name: file.name })}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(file.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!renameFile} onOpenChange={() => setRenameFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <Input
            value={renameFile?.name || ''}
            onChange={e => setRenameFile(prev => prev ? { ...prev, name: e.target.value } : null)}
          />
          <DialogFooter>
            <Button
              onClick={() => renameFile && renameMutation.mutate(renameFile)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreview 
        file={previewFile} 
        onClose={() => setPreviewFile(null)} 
      />
    </div>
  );
}