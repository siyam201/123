import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { formatFileSize } from "@/lib/file-utils";

export function StorageIndicator() {
  const { data: storage } = useQuery({
    queryKey: ['/api/storage']
  });

  if (!storage) return null;

  const usedPercent = (storage.used / storage.total) * 100;

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="font-semibold mb-2">Storage Usage</h3>
      <Progress value={usedPercent} className="h-2 mb-2" />
      <div className="text-sm text-muted-foreground">
        {formatFileSize(storage.used)} used of {formatFileSize(storage.total)}
      </div>
    </div>
  );
}
