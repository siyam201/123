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
import { SearchFilters } from './search-filters';
import type { File } from '@shared/schema';

interface FileListProps {
  parentId: number | null;
  onFolderClick: (id: number) => void;
}

export function FileList({ parentId, onFolderClick }: FileListProps) {
  const [search, setSearch] = useState('');
  const [renameFile, setRenameFile] = useState<{ id: number; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useState<{
    type?: string;
    minSize?: number;
    maxSize?: number;
    startDate?: string;
    endDate?: string;
  } | null>(null);

  // Use regular file listing when no search params
  const isSearching = search || searchParams;
  const { data: files, isLoading } = useQuery({
    queryKey: isSearching ? ['/api/files/search', search, searchParams] : ['/api/files', parentId],
    queryFn: async () => {
      if (isSearching) {
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (searchParams?.type) params.append('type', searchParams.type);
        if (searchParams?.minSize) params.append('minSize', String(searchParams.minSize));
        if (searchParams?.maxSize) params.append('maxSize', String(searchParams.maxSize));
        if (searchParams?.startDate) params.append('startDate', searchParams.startDate);
        if (searchParams?.endDate) params.append('endDate', searchParams.endDate);

        const res = await fetch(`/api/files/search?${params}`);
        if (!res.ok) throw new Error('Failed to fetch files');
        return res.json();
      } else {
        const res = await fetch(`/api/files?parentId=${parentId || ''}`);
        if (!res.ok) throw new Error('Failed to fetch files');
        return res.json();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({ title: 'File deleted' });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest('PATCH', `/api/files/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setRenameFile(null);
      toast({ title: 'File renamed' });
    },
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

  return (
    <div className="space-y-4">
      <SearchFilters onSearch={filters => setSearchParams(filters)} />
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Show a message when searching but no results found */}
      {isSearching && (!files || files.length === 0) && (
        <div className="text-center text-muted-foreground py-8">
          No files found matching your search criteria
        </div>
      )}

      {/* Show a message when no files exist in current folder */}
      {!isSearching && (!files || files.length === 0) && (
        <div className="text-center text-muted-foreground py-8">
          No files in this folder. Upload some files or create a new folder.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files?.map((file: File) => (
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

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
            onChange={(e) =>
              setRenameFile((prev) => (prev ? { ...prev, name: e.target.value } : null))
            }
          />
          <DialogFooter>
            <Button onClick={() => renameFile && renameMutation.mutate(renameFile)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}