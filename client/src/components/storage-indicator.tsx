import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { formatFileSize } from "@/lib/file-utils";

export function StorageIndicator() {
  const { data: storage } = useQuery({
    queryKey: ['/api/storage']
  });

  if (!storage) return null;

  const usedPercent = (storage.used / storage.total) * 100;
  const availableFormatted = formatFileSize(storage.available);
  const totalFormatted = formatFileSize(storage.total);

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="font-semibold mb-2">Storage Usage</h3>
      <Progress value={usedPercent} className="h-2 mb-2" />
      <div className="text-sm space-y-1">
        <div className="text-muted-foreground">
          {formatFileSize(storage.used)} used of {totalFormatted}
        </div>
        <div className="text-muted-foreground">
          {availableFormatted} available
        </div>
      </div>
    </div>
  );
}