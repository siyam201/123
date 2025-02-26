import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/file-utils';

interface SearchFilters {
  name?: string;
  type?: string;
  minSize?: number;
  maxSize?: number;
  startDate?: string;
  endDate?: string;
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
}

const FILE_TYPES = [
  { label: 'All Types', value: 'all' },
  { label: 'Images', value: 'image/' },
  { label: 'Documents', value: 'application/pdf' },
  { label: 'Text', value: 'text/' },
  { label: 'Audio', value: 'audio/' },
  { label: 'Video', value: 'video/' },
];

const SIZE_RANGES = [
  { label: 'Any Size', value: 'any' },
  { label: '< 1MB', value: 'small', maxSize: 1024 * 1024 },
  { label: '1MB - 10MB', value: 'medium', minSize: 1024 * 1024, maxSize: 10 * 1024 * 1024 },
  { label: '10MB - 100MB', value: 'large', minSize: 10 * 1024 * 1024, maxSize: 100 * 1024 * 1024 },
  { label: '> 100MB', value: 'xl', minSize: 100 * 1024 * 1024 },
];

export function SearchFilters({ onSearch }: SearchFiltersProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('all');
  const [sizeRange, setSizeRange] = useState('any');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = () => {
    const selectedSize = SIZE_RANGES.find(range => range.value === sizeRange);

    onSearch({
      name: name || undefined,
      type: type === 'all' ? undefined : type,
      minSize: selectedSize?.minSize,
      maxSize: selectedSize?.maxSize,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleReset = () => {
    setName('');
    setType('all');
    setSizeRange('any');
    setStartDate('');
    setEndDate('');
    onSearch({});
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="space-y-2">
        <Label>File Name</Label>
        <Input
          placeholder="Search by file name..."
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>File Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FILE_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>File Size</Label>
          <Select value={sizeRange} onValueChange={setSizeRange}>
            <SelectTrigger>
              <SelectValue placeholder="Select size range" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={handleSearch}>
          Search
        </Button>
      </div>
    </div>
  );
}