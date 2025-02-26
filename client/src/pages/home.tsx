import { useState } from 'react';
import { FileUpload } from '@/components/file-upload';
import { FileList } from '@/components/file-list';
import { StorageIndicator } from '@/components/storage-indicator';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FolderPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const name = prompt('Enter folder name:');
      if (!name) return;
      
      return apiRequest('POST', '/api/files', {
        name,
        path: `/${name}`,
        size: 0,
        type: 'folder',
        content: '',
        parentId: currentFolder,
        isFolder: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({ title: 'Folder created' });
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {currentFolder && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentFolder(null)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-3xl font-bold">My Files</h1>
        </div>
        <Button onClick={() => createFolderMutation.mutate()}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      </div>

      <div className="grid gap-8">
        <StorageIndicator />
        <FileUpload parentId={currentFolder} />
        <FileList
          parentId={currentFolder}
          onFolderClick={setCurrentFolder}
        />
      </div>
    </div>
  );
}
