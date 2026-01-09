new button
ui/button
```jsx
import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  className, 
  disabled, 
  ...props 
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-[0.98]',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-[0.98]',
    outline: 'border border-slate-200 bg-transparent hover:bg-slate-50 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 active:scale-[0.95]',
    destructive: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl',
    lg: 'px-6 py-3 text-base font-bold rounded-2xl',
    icon: 'p-2 rounded-lg',
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
```



new adminpage 
src/app/admin/page.tsx

```jsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { uploadApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { 
  Upload, FileText, RefreshCw, Play, CheckCircle, XCircle, 
  Clock, Cloud, Trash2, RotateCcw, Database, FileSpreadsheet, LogOut, Settings,
  AlertCircle, ArrowUpRight, ChevronDown, Activity, Layers, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { CalculatedDataSection } from '@/components/admin/GeneratedFilesSection';

interface BatchFile {
  id: string;
  fileName: string;
  status: string;
  recordsProcessed: number;
  error?: string;
  processedAt?: string;
}

interface BatchStatus {
  batchId: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  pendingFiles: number;
  progress: number;
  files: BatchFile[];
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  
  // Check if user is admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/');
      toast.error('Access denied. Admin only.');
    }
  }, [isAuthenticated, user, router]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('upload');
  
  // Standard upload state
  const [files, setFiles] = useState<FileList | null>(null);
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');
  
  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BatchStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch batches
  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['upload-batches'],
    queryFn: async () => {
      const response = await uploadApi.listBatches();
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['upload-stats'],
    queryFn: async () => {
      const response = await uploadApi.getStats();
      return response.data;
    },
  });

  // Poll for bulk batch status
  useEffect(() => {
    if (!bulkBatchId || !isProcessing) return;
    if (bulkStatus?.status === 'COMPLETED' || bulkStatus?.status === 'FAILED' || bulkStatus?.status === 'PARTIAL') {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
      queryClient.invalidateQueries({ queryKey: ['upload-stats'] });
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await uploadApi.getBulkStatus(bulkBatchId);
        if (response.data.success) {
          setBulkStatus(response.data.data);
          
          if (['COMPLETED', 'FAILED', 'PARTIAL'].includes(response.data.data.status)) {
            setIsProcessing(false);
            queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
            queryClient.invalidateQueries({ queryKey: ['upload-stats'] });
          }
        }
      } catch (err) {
        console.error('Error polling batch status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [bulkBatchId, bulkStatus?.status, isProcessing, queryClient]);

  // Standard upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!files || files.length === 0) throw new Error('No files selected');
      
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('name', batchName || 'Unnamed Batch');
      formData.append('description', description);
      
      return uploadApi.createBatch(formData);
    },
    onSuccess: () => {
      toast.success('Files uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
      setFiles(null);
      setBatchName('');
      setDescription('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed');
    },
  });

  // Process batch mutation
  const processMutation = useMutation({
    mutationFn: (batchId: string) => uploadApi.processBatch(batchId),
    onSuccess: () => {
      toast.success('Processing started!');
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Processing failed');
    },
  });

  // Delete batch mutation
  const deleteMutation = useMutation({
    mutationFn: (batchId: string) => uploadApi.deleteBatch(batchId),
    onSuccess: () => {
      toast.success('Batch deleted');
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Delete failed');
    },
  });

  // Bulk file selection
  const handleBulkFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }) => {
    const selected = Array.from(e.target.files || []).filter(f => f.name.endsWith('.csv'));

    if (selected.length === 0) {
      setError('Please select CSV files only');
      return;
    }

    if (selected.length > 500) {
      setError('Maximum 500 files per upload');
      return;
    }

    setBulkFiles(selected);
    setError(null);
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
      handleBulkFilesSelect({ target: { files: dropped } });
    }
  }, [handleBulkFilesSelect]);

  // Upload to MinIO using presigned URL
  const uploadToMinIO = async (file: File, presignedUrl: string) => {
    console.log('Uploading to MinIO:', { fileName: file.name, url: presignedUrl });
    
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        mode: 'cors',
      });

      console.log('MinIO upload response:', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText 
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('MinIO upload failed:', text);
        throw new Error(`Failed to upload ${file.name}: ${response.status} ${text}`);
      }
    } catch (err: any) {
      console.error('MinIO upload error:', err);
      throw err;
    }
  };

  // Bulk upload handler
  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) {
      setError('Please select files first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setBulkStatus(null);

    try {
      // Step 1: Get presigned URLs
      const presignResponse = await uploadApi.getPresignedUrls(
        bulkFiles.map(f => ({ name: f.name, size: f.size }))
      );

      if (!presignResponse.data.success) {
        throw new Error(presignResponse.data.error || 'Failed to get upload URLs');
      }

      const { batchId, files: presignedFiles } = presignResponse.data.data;

      // Step 2: Upload files to MinIO
      const totalFiles = presignedFiles.length;
      let uploadedCount = 0;

      for (const fileInfo of presignedFiles) {
        if (fileInfo.uploadUrl) {
          const file = bulkFiles.find(f => f.name === fileInfo.fileName);
          if (file) {
            await uploadToMinIO(file, fileInfo.uploadUrl);
          }
        }
        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 50);
      }

      // Step 3: Trigger async processing
      const processResponse = await uploadApi.processBulk(
        batchId,
        presignedFiles.map((f: any) => f.objectKey),
        presignedFiles.map((f: any) => f.fileName)
      );

      if (!processResponse.data.success) {
        throw new Error(processResponse.data.error || 'Failed to start processing');
      }

      setBulkBatchId(batchId);
      setIsUploading(false);
      setIsProcessing(true);
      setUploadProgress(50);
      toast.success('Upload complete, processing started!');

    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    }
  };

  // Reset bulk upload
  const resetBulkUpload = () => {
    setBulkFiles([]);
    setBulkBatchId(null);
    setBulkStatus(null);
    setIsUploading(false);
    setIsProcessing(false);
    setUploadProgress(0);
    setError(null);
  };

  // Retry failed files
  const handleRetry = async () => {
    if (!bulkBatchId) return;
    
    try {
      await uploadApi.retryBulk(bulkBatchId);
      setIsProcessing(true);
      toast.success('Retrying failed files...');
    } catch (err: any) {
      toast.error(err.message || 'Retry failed');
    }
  };

  const batches = batchesData?.batches || [];
  const stats = statsData?.data;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-rose-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
      PROCESSING: 'bg-blue-100 text-blue-800 border-blue-200',
      COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
      PARTIAL: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return badges[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-900">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-md">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900">Admin Panel</h1>
              <p className="text-xs font-medium text-slate-500">Seasonality Data Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-slate-200 bg-white hover:bg-slate-50 hover:text-rose-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-6 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-1">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                "group relative py-3 text-sm font-medium transition-colors hover:text-blue-600",
                activeTab === 'upload' ? "text-blue-600" : "text-slate-500"
              )}
            >
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Data
              </span>
              <span className={cn(
                "absolute -bottom-[5px] left-0 h-[3px] w-full rounded-full transition-all duration-300",
                activeTab === 'upload' ? "bg-blue-600 opacity-100" : "bg-transparent opacity-0 group-hover:bg-blue-200 group-hover:opacity-100"
              )} />
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={cn(
                "group relative py-3 text-sm font-medium transition-colors hover:text-blue-600",
                activeTab === 'data' ? "text-blue-600" : "text-slate-500"
              )}
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Calculated Data
              </span>
              <span className={cn(
                "absolute -bottom-[5px] left-0 h-[3px] w-full rounded-full transition-all duration-300",
                activeTab === 'data' ? "bg-blue-600 opacity-100" : "bg-transparent opacity-0 group-hover:bg-blue-200 group-hover:opacity-100"
              )} />
            </button>

            <button
              onClick={() => setActiveTab('batches')}
              className={cn(
                "group relative py-3 text-sm font-medium transition-colors hover:text-blue-600",
                activeTab === 'batches' ? "text-blue-600" : "text-slate-500"
              )}
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Upload History
              </span>
              <span className={cn(
                "absolute -bottom-[5px] left-0 h-[3px] w-full rounded-full transition-all duration-300",
                activeTab === 'batches' ? "bg-blue-600 opacity-100" : "bg-transparent opacity-0 group-hover:bg-blue-200 group-hover:opacity-100"
              )} />
            </button>
          </nav>
        </div>

        {/* Upload Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total Tickers</p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.totalTickers}</h3>
                      </div>
                      <div className="rounded-full bg-blue-50 p-3">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Total Entries</p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.totalDataEntries?.toLocaleString()}</h3>
                      </div>
                      <div className="rounded-full bg-emerald-50 p-3">
                        <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Avg per Ticker</p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-900">{stats.averageEntriesPerTicker}</h3>
                      </div>
                      <div className="rounded-full bg-purple-50 p-3">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Main Upload Area */}
              <div className="xl:col-span-2 space-y-6">
                <Card className="border-0 shadow-xl shadow-slate-200/40 ring-1 ring-slate-200 rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="border-b border-slate-50 bg-white px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Cloud className="h-5 w-5" />
                         </div>
                         <div>
                            <CardTitle className="text-lg font-bold text-slate-900">Batch Upload</CardTitle>
                            <CardDescription>Drag and drop your CSV files to process</CardDescription>
                         </div>
                      </div>
                      {bulkStatus && (
                         <div className="flex items-center gap-2">
                             <span className={cn(
                               "relative flex h-3 w-3",
                               bulkStatus.status === 'PROCESSING' ? "block" : "hidden"
                             )}>
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                             </span>
                             <span className={cn(
                               "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                               getStatusBadge(bulkStatus.status)
                             )}>
                               {bulkStatus.status}
                             </span>
                         </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <div
                      className={cn(
                        "relative flex flex-col transition-all duration-300 min-h-[420px]",
                        dragActive ? "bg-indigo-50/30" : "bg-white"
                      )}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".csv"
                        onChange={handleBulkFilesSelect as any}
                        className="absolute inset-0 cursor-pointer opacity-0 z-10"
                        id="bulk-file-upload"
                        disabled={isUploading || isProcessing}
                      />

                      {!bulkStatus ? (
                         <div className="flex flex-col items-center justify-center flex-1 p-8">
                           {bulkFiles.length === 0 ? (
                              <div className="text-center space-y-6 max-w-sm mx-auto py-12">
                                <div className={cn(
                                  "mx-auto h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300",
                                  dragActive ? "bg-indigo-100 scale-110" : "bg-slate-50 border-2 border-dashed border-slate-200"
                                )}>
                                   <Upload className={cn(
                                     "h-10 w-10 transition-colors",
                                     dragActive ? "text-indigo-600" : "text-slate-400"
                                   )} />
                                </div>
                                <div className="space-y-2">
                                   <h3 className="text-xl font-bold text-slate-900">
                                     Drop CSV files here
                                   </h3>
                                   <p className="text-slate-500">
                                      Or click to browse from your computer. <br/>
                                      <span className="text-xs text-slate-400">Max 500 files per batch.</span>
                                   </p>
                                </div>
                                <div className="pt-2">
                                   <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 h-12 shadow-lg shadow-indigo-200">
                                      Select Files
                                   </Button>
                                </div>
                              </div>
                           ) : (
                              <div className="w-full h-full flex flex-col items-center max-w-2xl mx-auto space-y-6 py-6 z-20 relative">
                                 <div className="w-full flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                      <Layers className="h-5 w-5 text-indigo-600" />
                                      Selected Files ({bulkFiles.length})
                                    </h3>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => { e.stopPropagation(); setBulkFiles([]); }}
                                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    >
                                      Clear All
                                    </Button>
                                 </div>
                                 
                                 <div className="w-full flex-1 bg-slate-50/80 rounded-xl border border-slate-200 overflow-hidden shadow-inner max-h-[250px] overflow-y-auto">
                                    <div className="divide-y divide-slate-100">
                                       {bulkFiles.map((file, i) => (
                                          <div key={i} className="flex items-center justify-between p-3 hover:bg-white transition-colors">
                                             <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                                   <FileSpreadsheet className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                   <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                   <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                                                </div>
                                             </div>
                                             <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>

                                 <div className="w-full flex justify-center gap-4 pt-4">
                                    <Button 
                                      onClick={(e) => { e.stopPropagation(); handleBulkUpload(); }}
                                      disabled={isUploading}
                                      className="w-full sm:w-auto min-w-[200px] h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50"
                                    >
                                       {isUploading ? (
                                          <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading & Processing...
                                          </>
                                       ) : (
                                          <>
                                            <Cloud className="h-4 w-4 mr-2" />
                                            Start Upload Process
                                          </>
                                       )}
                                    </Button>
                                 </div>
                              </div>
                           )}
                         </div>
                      ) : (
                        /* Processing View */
                        <div className="flex flex-col h-full z-20 relative bg-white">
                           {/* Progress Header */}
                           <div className="bg-slate-50/50 px-8 py-8 border-b border-slate-100">
                              <div className="flex items-end justify-between mb-4">
                                 <div>
                                    <h4 className="text-slate-500 font-medium text-sm mb-1">Processing Progress</h4>
                                    <div className="flex items-baseline gap-2">
                                       <span className="text-4xl font-black text-slate-900 tracking-tight">{bulkStatus.progress.toFixed(0)}%</span>
                                       <span className="text-sm font-medium text-slate-400">completed</span>
                                    </div>
                                 </div>
                                 <div className="flex gap-2">
                                    {['COMPLETED', 'FAILED', 'PARTIAL'].includes(bulkStatus.status) && (
                                       <Button size="sm" onClick={resetBulkUpload} variant="outline" className="h-9">
                                          Upload More
                                       </Button>
                                    )}
                                    {bulkStatus.status === 'PARTIAL' && (
                                       <Button size="sm" onClick={handleRetry} className="h-9 bg-amber-500 hover:bg-amber-600 text-white">
                                          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Retry Failed
                                       </Button>
                                    )}
                                 </div>
                              </div>
                              <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                 <div 
                                    className={cn(
                                       "h-full rounded-full transition-all duration-700 ease-out shadow-lg relative overflow-hidden",
                                       bulkStatus.status === 'FAILED' ? 'bg-rose-500' :
                                       bulkStatus.status === 'COMPLETED' ? 'bg-emerald-500' :
                                       'bg-indigo-600'
                                    )}
                                    style={{ width: `${bulkStatus.progress}%` }} 
                                 >
                                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                                 </div>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4 mt-8">
                                 <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-slate-800">{bulkStatus.totalFiles}</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Total Files</span>
                                 </div>
                                 <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-emerald-600">{bulkStatus.processedFiles}</span>
                                    <span className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider mt-1">Success</span>
                                 </div>
                                 <div className="bg-rose-50 rounded-xl border border-rose-100 p-3 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-rose-600">{bulkStatus.failedFiles}</span>
                                    <span className="text-[10px] uppercase font-bold text-rose-600/70 tracking-wider mt-1">Failed</span>
                                 </div>
                                 <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3 shadow-sm flex flex-col items-center">
                                    <span className="text-2xl font-bold text-indigo-600">{bulkStatus.pendingFiles}</span>
                                    <span className="text-[10px] uppercase font-bold text-indigo-600/70 tracking-wider mt-1">Pending</span>
                                 </div>
                              </div>
                           </div>

                           {/* File List Table */}
                           <div className="flex-1 overflow-hidden flex flex-col bg-white">
                              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-2">
                                 <Activity className="h-4 w-4 text-slate-400" />
                                 <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">File Processing Log</span>
                              </div>
                              <div className="overflow-y-auto flex-1 p-0">
                                 <table className="w-full text-left">
                                    <tbody className="divide-y divide-slate-50">
                                       {bulkStatus.files.map((file, i) => (
                                          <tr key={i} className={cn(
                                             "transition-colors group",
                                             file.status === 'FAILED' ? "bg-rose-50/20 hover:bg-rose-50/40" : "hover:bg-slate-50"
                                          )}>
                                             <td className="px-6 py-4 w-[40%]">
                                                <div className="flex items-center gap-3">
                                                   <div className={cn(
                                                      "p-2 rounded-lg shrink-0",
                                                      file.status === 'FAILED' ? "bg-rose-100 text-rose-600" :
                                                      file.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-600" :
                                                      "bg-slate-100 text-slate-400"
                                                   )}>
                                                      <FileText className="h-4 w-4" />
                                                   </div>
                                                   <div className="min-w-0">
                                                      <p className="text-sm font-medium text-slate-700 truncate" title={file.fileName}>{file.fileName}</p>
                                                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                         {file.recordsProcessed ? `${file.recordsProcessed} records` : 'Processing...'}
                                                      </p>
                                                   </div>
                                                </div>
                                             </td>
                                             <td className="px-6 py-4 w-[25%]">
                                                {file.status === 'COMPLETED' ? (
                                                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                                      <Check className="h-3 w-3" /> Processed
                                                   </span>
                                                ) : file.status === 'FAILED' ? (
                                                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
                                                      <XCircle className="h-3 w-3" /> Failed
                                                   </span>
                                                ) : (
                                                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                                                      <RefreshCw className="h-3 w-3 animate-spin" /> Working
                                                   </span>
                                                )}
                                             </td>
                                             <td className="px-6 py-4 w-[35%] text-right">
                                                {file.error ? (
                                                   <details className="group/details relative inline-block text-left">
                                                      <summary className="list-none cursor-pointer inline-flex items-center gap-2 text-xs font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                                                         <AlertCircle className="h-3.5 w-3.5" />
                                                         <span>View Error Log</span>
                                                         <ChevronDown className="h-3 w-3 transition-transform group-open/details:rotate-180" />
                                                      </summary>
                                                      <div className="absolute right-0 top-full mt-2 w-[500px] max-w-[85vw] z-50 origin-top-right rounded-xl bg-slate-900 p-4 shadow-2xl ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 slide-in-from-top-2">
                                                         <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 p-1 bg-rose-500/20 rounded shrink-0">
                                                               <AlertCircle className="h-4 w-4 text-rose-400" />
                                                            </div>
                                                            <div className="space-y-1 w-full min-w-0">
                                                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Error Details</p>
                                                               <div className="text-xs text-slate-300 font-mono bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 whitespace-pre-wrap break-words leading-relaxed select-text">
                                                                  {file.error}
                                                               </div>
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </details>
                                                ) : (
                                                   <span className="text-slate-300 text-xs font-medium">-</span>
                                                )}
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <div className="mt-6 flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                    <div className="bg-rose-100 p-2 rounded-full">
                      <XCircle className="text-rose-600 h-5 w-5" />
                    </div>
                    <span className="text-rose-700 text-sm font-medium">{error}</span>
                  </div>
                )}
              </div>

              {/* Sidebar: Batches & Requirements */}
              <div className="space-y-6">
                <Card className="border-0 shadow-lg shadow-slate-200/40 ring-1 ring-slate-200 h-[calc(100%-1rem)] flex flex-col bg-white">
                  <CardHeader className="bg-white border-b border-slate-50 py-5 px-6">
                    <CardTitle className="text-base font-bold text-slate-800">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 space-y-8">
                     <div className="space-y-4">
                        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-5 border border-indigo-100 shadow-sm">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold mb-3 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            File Requirements
                          </div>
                          <ul className="space-y-3 text-xs text-indigo-900/80">
                            <li className="flex items-center gap-2">
                               <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                               Format: <strong>CSV (.csv)</strong> only
                            </li>
                            <li className="flex items-center gap-2">
                               <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                               Max files: <strong>500</strong> per batch
                            </li>
                            <li className="flex items-center gap-2">
                               <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                               Required: Date, Ticker, Close
                            </li>
                            <li className="flex items-center gap-2">
                               <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                               Formats: YYYY-MM-DD or DD-MM-YYYY
                            </li>
                          </ul>
                        </div>
                     </div>

                     <div>
                       <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                         Recent Uploads
                         <Button variant="link" size="sm" className="h-auto p-0 text-xs text-indigo-600 font-medium" onClick={() => setActiveTab('batches')}>View all</Button>
                       </h4>
                       
                       {isLoading ? (
                          <div className="flex justify-center py-4"><Loading /></div>
                       ) : batches.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                             <p className="text-xs text-slate-400 italic">No recent uploads found</p>
                          </div>
                       ) : (
                          <div className="space-y-3">
                            {batches.slice(0, 5).map((batch: any) => (
                              <div key={batch.id} className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50 transition-all cursor-default">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-slate-700 truncate group-hover:text-indigo-700 transition-colors">{batch.name || 'Unnamed Batch'}</p>
                                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    {new Date(batch.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm ring-2 ring-white", 
                                  batch.status === 'COMPLETED' ? "bg-emerald-500" :
                                  batch.status === 'FAILED' ? "bg-rose-500" : "bg-amber-500"
                                )} title={batch.status} />
                              </div>
                            ))}
                          </div>
                       )}
                     </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Calculated Data Tab */}
        {activeTab === 'data' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <CalculatedDataSection />
          </div>
        )}

        {/* Upload History Tab */}
        {activeTab === 'batches' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Upload History</CardTitle>
                    <CardDescription>Manage your previous data uploads</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['upload-batches'] })}>
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loading />
                  </div>
                ) : batchesData?.batches?.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {batchesData.batches.map((batch: any) => (
                      <div key={batch.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-start gap-4 mb-4 sm:mb-0">
                          <div className={cn(
                            "rounded-full p-2.5 mt-1 shrink-0",
                            batch.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" :
                            batch.status === 'FAILED' ? "bg-rose-50 text-rose-600" :
                            "bg-blue-50 text-blue-600"
                          )}>
                             {batch.status === 'COMPLETED' ? <CheckCircle className="h-5 w-5" /> : 
                              batch.status === 'FAILED' ? <XCircle className="h-5 w-5" /> : 
                              <RefreshCw className="h-5 w-5" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{batch.name || 'Unnamed Batch'}</h3>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                getStatusBadge(batch.status)
                              )}>
                                {batch.status}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                {batch.totalFiles} files
                              </span>
                              <span className="hidden sm:inline text-slate-300">•</span>
                              <span className="flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5" />
                                {batch.totalRecordsProcessed?.toLocaleString() || 0} records
                              </span>
                              <span className="hidden sm:inline text-slate-300">•</span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(batch.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {batch.errorSummary && (
                              <div className="mt-2">
                                <details className="group/error inline-block">
                                  <summary className="cursor-pointer text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors">
                                    <AlertCircle className="h-3 w-3" />
                                    View Error Summary ({batch.failedFiles} failed)
                                  </summary>
                                  <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-md text-xs text-rose-800 font-mono whitespace-pre-wrap max-w-2xl animate-in slide-in-from-top-1">
                                    {typeof batch.errorSummary === 'string' 
                                      ? batch.errorSummary 
                                      : JSON.stringify(batch.errorSummary, null, 2)}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-center">
                          {batch.status === 'PENDING' && (
                            <Button
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700 h-8 text-xs"
                              onClick={() => processMutation.mutate(batch.id)}
                              disabled={processMutation.isPending}
                            >
                              <Play className="h-3 w-3 mr-1.5" />
                              Process
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                            onClick={() => deleteMutation.mutate(batch.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete Batch"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FileSpreadsheet className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No uploads yet</h3>
                    <p className="text-slate-500 max-w-sm mt-1 mb-6">Upload your first batch of CSV files to get started with seasonality data processing.</p>
                    <Button onClick={() => setActiveTab('upload')} variant="outline">
                      Go to Upload
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
```

```jsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { uploadApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Loading } from '../components/ui/loading';
import { 
  Upload, FileText, RefreshCw, Play, CheckCircle, XCircle, 
  Clock, Cloud, Trash2, RotateCcw, Database, FileSpreadsheet, 
  LogOut, Settings, Zap, Bell, Search, PlusCircle,
  ArrowUpRight, ShieldCheck, Activity, History, UploadCloud,
  ChevronRight, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatFileSize } from '../lib/utils';
import CalculatedDataSection from '../components/admin/CalculatedDataSection';

interface BatchFile {
  id: string;
  fileName: string;
  status: string;
  recordsProcessed: number;
  error?: string;
  processedAt?: string;
}

interface BatchStatus {
  batchId: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  pendingFiles: number;
  progress: number;
  files: BatchFile[];
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('upload');
  
  // Standard upload state
  const [files, setFiles] = useState<FileList | null>(null);
  const [batchName, setBatchName] = useState('');
  const [description, setDescription] = useState('');
  
  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BatchStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logic: Poll for status
  useEffect(() => {
    if (!bulkBatchId || !isProcessing) return;
    if (bulkStatus?.status === 'COMPLETED' || bulkStatus?.status === 'FAILED' || bulkStatus?.status === 'PARTIAL') {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
      queryClient.invalidateQueries({ queryKey: ['upload-stats'] });
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await uploadApi.getBulkStatus(bulkBatchId);
        if (response.data.success) {
          setBulkStatus(response.data.data);
          
          if (['COMPLETED', 'FAILED', 'PARTIAL'].includes(response.data.data.status)) {
            setIsProcessing(false);
            queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
            queryClient.invalidateQueries({ queryKey: ['upload-stats'] });
          }
        }
      } catch (err) {
        console.error('Error polling batch status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [bulkBatchId, bulkStatus?.status, isProcessing, queryClient]);

  // Logic: Fetching
  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['upload-batches'],
    queryFn: async () => {
      const response = await uploadApi.listBatches();
      return response.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['upload-stats'],
    queryFn: async () => {
      const response = await uploadApi.getStats();
      return response.data;
    },
  });

  // Logic: Mutations
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!files || files.length === 0) throw new Error('No files selected');
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      formData.append('name', batchName || 'Unnamed Batch');
      formData.append('description', description);
      return uploadApi.createBatch(formData);
    },
    onSuccess: () => {
      toast.success('Files uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
      setFiles(null);
      setBatchName('');
      setDescription('');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Upload failed'),
  });

  const processMutation = useMutation({
    mutationFn: (batchId: string) => uploadApi.processBatch(batchId),
    onSuccess: () => {
      toast.success('Processing started!');
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Processing failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (batchId: string) => uploadApi.deleteBatch(batchId),
    onSuccess: () => {
      toast.success('Batch deleted');
      queryClient.invalidateQueries({ queryKey: ['upload-batches'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Delete failed'),
  });

  // Logic: Bulk Handlers
  const handleBulkFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }) => {
    const selected = Array.from(e.target.files || []).filter(f => f.name.endsWith('.csv'));
    if (selected.length === 0) { setError('Please select CSV files only'); return; }
    if (selected.length > 500) { setError('Maximum 500 files per upload'); return; }
    setBulkFiles(selected);
    setError(null);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
      handleBulkFilesSelect({ target: { files: dropped } } as any);
    }
  }, [handleBulkFilesSelect]);

  const uploadToMinIO = async (file: File, presignedUrl: string) => {
    try {
      const response = await fetch(presignedUrl, { method: 'PUT', body: file, mode: 'cors' });
      if (!response.ok) throw new Error(`MinIO upload failed`);
    } catch (err: any) { throw err; }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) { setError('Please select files first'); return; }
    setIsUploading(true); setUploadProgress(0); setError(null); setBulkStatus(null);
    try {
      const presignResponse = await uploadApi.getPresignedUrls(bulkFiles.map(f => ({ name: f.name, size: f.size })));
      if (!presignResponse.data.success) throw new Error('Failed to get URLs');
      const { batchId, files: presignedFiles } = presignResponse.data.data;
      let uploadedCount = 0;
      for (const fileInfo of presignedFiles) {
        if (fileInfo.uploadUrl) {
          const file = bulkFiles.find(f => f.name === fileInfo.fileName);
          if (file) await uploadToMinIO(file, fileInfo.uploadUrl);
        }
        uploadedCount++;
        setUploadProgress((uploadedCount / presignedFiles.length) * 50);
      }
      await uploadApi.processBulk(batchId, presignedFiles.map((f: any) => f.objectKey), presignedFiles.map((f: any) => f.fileName));
      setBulkBatchId(batchId); setIsUploading(false); setIsProcessing(true); setUploadProgress(50);
      toast.success('Ingestion triggered');
    } catch (err: any) {
      setIsUploading(false); setError(err.message || 'Upload failed');
    }
  };

  const resetBulkUpload = () => {
    setBulkFiles([]); setBulkBatchId(null); setBulkStatus(null);
    setIsUploading(false); setIsProcessing(false); setUploadProgress(0); setError(null);
  };

  const handleRetry = async () => {
    if (!bulkBatchId) return;
    try { await uploadApi.retryBulk(bulkBatchId); setIsProcessing(true); toast.success('Retrying...'); }
    catch (err: any) { toast.error(err.message || 'Retry failed'); }
  };

  const handleLogout = () => { logout(); router.push('/login'); };

  // UI Helpers
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-rose-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-indigo-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
      PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      FAILED: 'bg-rose-50 text-rose-700 border-rose-100',
      PARTIAL: 'bg-orange-50 text-orange-700 border-orange-100',
    };
    return cn('px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest', badges[status] || 'bg-slate-50 text-slate-700 border-slate-100');
  };

  const navigation = [
    { id: 'upload', name: 'Ingest Hub', icon: UploadCloud },
    { id: 'data', name: 'Analysis Engine', icon: Database },
    { id: 'batches', name: 'Process Logs', icon: History },
  ];

  const batches = batchesData?.batches || [];
  const stats = statsData?.data;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Sleek Top Navbar */}
      <nav className="h-16 bg-white border-b border-slate-200/60 sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-100">
              <Zap className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="font-black text-slate-900 tracking-tighter text-lg uppercase">Seasonality Pro</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="hidden md:flex items-center gap-1">
            {navigation.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200",
                  activeTab === item.id 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
            {user?.name?.[0] || 'A'}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-rose-600">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Unique Content Layout: Centered & Sectioned */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10 space-y-12 animate-in fade-in duration-700">
        
        {/* TAB: UPLOAD DATA */}
        {activeTab === 'upload' && (
          <div className="space-y-12">
            {/* Minimal Stat Strip */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Total Tickers', val: stats.totalTickers, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Data Entries', val: stats.totalDataEntries?.toLocaleString(), icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Avg per Ticker', val: stats.averageEntriesPerTicker, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' }
                ].map((stat, i) => (
                  <div key={i} className="group p-6 bg-white border border-slate-200 rounded-[2.5rem] hover:border-slate-300 transition-all shadow-sm">
                    <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.val}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Unique Bulk Upload Ingestor */}
              <div className="lg:col-span-7">
                <div 
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "relative bg-white border-2 border-dashed rounded-[3rem] p-12 transition-all duration-500 group flex flex-col items-center text-center",
                    dragActive ? "border-indigo-500 bg-indigo-50/30 scale-[0.99]" : "border-slate-200 hover:border-slate-300",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                >
                  {!bulkStatus ? (
                    <>
                      <div className="h-20 w-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 shadow-sm">
                        <UploadCloud className={cn("h-8 w-8", dragActive ? "text-indigo-600" : "text-slate-300")} />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight">Data Payload Ingestion</h4>
                      <p className="text-slate-400 font-medium max-w-sm mt-2 text-sm">
                        Drop up to 500 .CSV files into the processing pipeline for instant calculation.
                      </p>

                      <label className="mt-10 inline-block cursor-pointer">
                        <span className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all block active:scale-95">Browse Filesystem</span>
                        <input type="file" multiple accept=".csv" className="hidden" onChange={handleBulkFilesSelect} />
                      </label>

                      {bulkFiles.length > 0 && (
                        <div className="mt-10 w-full animate-in slide-in-from-bottom-2">
                          <div className="flex items-center justify-between px-4 mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Payload ({bulkFiles.length} blocks)</span>
                            <button onClick={() => setBulkFiles([])} className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-widest">Clear</button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-2">
                            {bulkFiles.slice(0, 4).map((f, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <div className="flex items-center gap-3 truncate">
                                  <FileText className="h-4 w-4 text-indigo-500" />
                                  <span className="text-xs font-bold text-slate-700 truncate">{f.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-300 uppercase">{formatFileSize(f.size)}</span>
                              </div>
                            ))}
                            {bulkFiles.length > 4 && <div className="text-center text-[10px] text-slate-400 font-bold uppercase py-2">...and {bulkFiles.length - 4} more packages</div>}
                          </div>
                          <Button onClick={handleBulkUpload} className="w-full mt-6 py-5 rounded-[2rem] text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100">
                            {isUploading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Execute Sync Sequence'}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full text-left space-y-8 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xl font-black text-slate-900">Sync Engine Status</h5>
                        <span className={getStatusBadge(bulkStatus.status)}>{bulkStatus.status}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Transmission Health</span>
                          <span>{bulkStatus.progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={cn("h-full transition-all duration-500 shadow-lg", bulkStatus.status === 'FAILED' ? 'bg-rose-500' : 'bg-indigo-600')} 
                            style={{ width: `${bulkStatus.progress}%` }} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: 'Synced', val: bulkStatus.processedFiles, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                          { label: 'Failed', val: bulkStatus.failedFiles, color: 'text-rose-600', bg: 'bg-rose-50' },
                          { label: 'Queue', val: bulkStatus.pendingFiles, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                          { label: 'Total', val: bulkStatus.totalFiles, color: 'text-slate-900', bg: 'bg-slate-50' }
                        ].map((s, i) => (
                          <div key={i} className={cn("p-4 rounded-3xl border border-slate-100 text-center", s.bg)}>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{s.label}</p>
                            <p className={cn("text-xl font-black", s.color)}>{s.val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center gap-4 pt-4">
                        <Button variant="primary" className="rounded-2xl px-10" onClick={resetBulkUpload}>Ingest More</Button>
                        {bulkStatus.status === 'PARTIAL' && <Button variant="outline" className="rounded-2xl px-10" onClick={handleRetry}>Retry Failed</Button>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Side Panel: Requirements & Activity */}
              <div className="lg:col-span-5 space-y-8">
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                  <Zap className="h-12 w-12 text-slate-50 absolute -top-4 -right-4" />
                  <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Protocol Schemas
                  </h4>
                  <ul className="space-y-4">
                    {[
                      'Strict CSV Encapsulation',
                      'Mandatory: Date, Ticker, Close',
                      'Calculated In-Memory (S-Engine V2)',
                      'Atomic Write Commit enabled',
                      'Async Parallel Processing'
                    ].map((t, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Engine Uptime</p>
                    <div className="flex items-center justify-between">
                       <span className="text-2xl font-black">99.98%</span>
                       <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Minified History Hub */}
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                  <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" />
                    Live Activity
                  </h4>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {isLoading ? <Loading /> : batches.slice(0, 4).map((batch: any) => (
                      <div key={batch.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all">
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-slate-900 truncate leading-none mb-1">{batch.name || 'Auto Block'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{batch.totalFiles} packages</p>
                        </div>
                        <span className={getStatusBadge(batch.status)}>{batch.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ANALYSIS ENGINE */}
        {activeTab === 'data' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CalculatedDataSection />
          </div>
        )}

        {/* TAB: PROCESS LOGS (FULL HISTORY) */}
        {activeTab === 'batches' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">System Audit Trails</h3>
                  <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['upload-batches'] })}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Archives
                  </Button>
                </div>

                {isLoading ? <Loading /> : batches.length > 0 ? (
                  <div className="space-y-4">
                    {batches.map((batch: any) => (
                      <div key={batch.id} className="group p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-indigo-200 transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                              <Database className="h-7 w-7" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-900">{batch.name || 'System Payload Ingest'}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalFiles} Files</span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalRecordsProcessed?.toLocaleString() || 0} Records</span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(batch.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className={getStatusBadge(batch.status)}>{batch.status}</span>
                            <div className="flex items-center gap-2">
                              {batch.status === 'PENDING' && (
                                <button onClick={() => processMutation.mutate(batch.id)} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-colors">
                                  <Play className="h-5 w-5" />
                                </button>
                              )}
                              <button onClick={() => deleteMutation.mutate(batch.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors">
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-300">
                    <History className="h-16 w-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-lg">No audit trails available.</p>
                  </div>
                )}
             </div>
          </div>
        )}

      </main>

      {/* Floating Action Button (Optional Unique touch) */}
      <div className="fixed bottom-10 right-10 z-50">
        <button className="h-16 w-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <Settings className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

```


```jsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { 
  Database, Search, Calendar, 
  BarChart3, TrendingUp, Archive, ExternalLink, Eye, Trash2,
  Clock, ArrowRight, Activity, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { DataViewerModal } from './DataViewerModal';

interface LatestDataRecord {
  date: string;
  close: number;
  returnPercentage: number | null;
}

const TIMEFRAME_INFO = {
  daily: {
    name: 'Daily Data',
    description: 'OHLCV data with calculated fields',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100'
  },
  mondayWeekly: {
    name: 'Monday Weekly',
    description: 'Monday-based weekly aggregations',
    icon: BarChart3,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100'
  },
  expiryWeekly: {
    name: 'Expiry Weekly',
    description: 'Expiry-based weekly aggregations',
    icon: BarChart3,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-100'
  },
  monthly: {
    name: 'Monthly Data',
    description: 'Monthly aggregation with returns',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100'
  },
  yearly: {
    name: 'Yearly Data',
    description: 'Yearly aggregation with returns',
    icon: Archive,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100'
  }
};

export function CalculatedDataSection() {
  const [searchSymbol, setSearchSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTab, setViewerTab] = useState('daily');

  // Fetch analysis stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['analysis-stats'],
    queryFn: async () => {
      const response = await api.get('/analysis/stats');
      return response.data.data;
    },
  });

  // Fetch symbol data
  const { data: symbolData, isLoading: symbolLoading } = useQuery({
    queryKey: ['symbol-analysis', selectedSymbol],
    queryFn: async () => {
      if (!selectedSymbol) return null;
      const response = await api.get(`/analysis/symbols/${selectedSymbol}/summary`);
      return response.data.data;
    },
    enabled: !!selectedSymbol,
  });

  const handleSearchSymbol = async () => {
    if (!searchSymbol.trim()) {
      toast.error('Please enter a symbol');
      return;
    }
    setSelectedSymbol(searchSymbol.toUpperCase().trim());
  };

  const handleViewData = async (symbol: string, timeframe: string) => {
    setSelectedSymbol(symbol);
    setViewerTab(timeframe);
    setViewerOpen(true);
  };

  const handleDeleteTicker = async (symbol: string) => {
    if (!confirm(`Are you sure you want to delete ${symbol} and ALL its data from all tables? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/analysis/symbols/${symbol}`);
      if (response.data.success) {
        toast.success(`${symbol} deleted successfully. ${response.data.data.totalDeleted} records removed.`);
        setSelectedSymbol(null);
        // Use a more gentle refresh approach
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 2000);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.error?.message || 'Failed to delete ticker');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Symbols</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {statsLoading ? <Loading size="sm" /> : statsData?.totalSymbols || 0}
                </h3>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Daily Records</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {statsLoading ? <Loading size="sm" /> : statsData?.recordCounts?.daily?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="rounded-full bg-indigo-50 p-3">
                <Calendar className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Weekly Records</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {statsLoading ? <Loading size="sm" /> : statsData?.recordCounts?.weekly?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="rounded-full bg-emerald-50 p-3">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Records</p>
                <h3 className="mt-2 text-3xl font-bold text-slate-900">
                  {statsLoading ? <Loading size="sm" /> : statsData?.recordCounts?.total?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="rounded-full bg-orange-50 p-3">
                <ExternalLink className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Search Card */}
          <Card className="border-0 shadow-lg shadow-slate-200/40 ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-50 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Data Explorer</CardTitle>
                  <CardDescription>Search and analyze processed symbol data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="Enter symbol (e.g., RELIANCE, NIFTY)"
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSymbol()}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
                <Button 
                  onClick={handleSearchSymbol} 
                  disabled={!searchSymbol.trim()}
                  className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Symbol Data View */}
          {selectedSymbol && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                      {selectedSymbol.substring(0, 2)}
                   </div>
                   <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedSymbol}</h2>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                         <Activity className="h-3 w-3" />
                         Analysis Data
                      </p>
                   </div>
                </div>
                <Button
                  onClick={() => handleDeleteTicker(selectedSymbol)}
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Ticker
                </Button>
              </div>

              {symbolLoading ? (
                <div className="flex justify-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <Loading />
                </div>
              ) : symbolData ? (
                <div className="space-y-8">
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Records</div>
                      <div className="text-2xl font-bold text-slate-900">{symbolData.totalRecords?.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date Range</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {symbolData.firstDataDate ? new Date(symbolData.firstDataDate).toLocaleDateString() : 'N/A'} 
                        <span className="text-slate-400 mx-2">→</span> 
                        {symbolData.lastDataDate ? new Date(symbolData.lastDataDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Updated</div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-500" />
                        {symbolData.lastUpdated ? new Date(symbolData.lastUpdated).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Available Timeframes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(TIMEFRAME_INFO).map(([timeframe, info]) => {
                      const count = symbolData.dataAvailable?.[timeframe as keyof typeof symbolData.dataAvailable] || 0;
                      const Icon = info.icon;
                      
                      return (
                        <Card key={timeframe} className={cn(
                          "border transition-all hover:shadow-md",
                          info.borderColor,
                          count > 0 ? "bg-white" : "bg-slate-50 opacity-80"
                        )}>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div className={cn("p-2.5 rounded-lg", info.bgColor)}>
                                <Icon className={cn("h-5 w-5", info.color)} />
                              </div>
                              {count > 0 && (
                                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium bg-white border shadow-sm", info.color)}>
                                  Available
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-bold text-slate-900">{info.name}</h3>
                            <p className="text-xs text-slate-500 mb-4 h-5">{info.description}</p>
                            
                            <div className="flex items-center justify-between mt-auto">
                               <div className="text-xs font-semibold text-slate-600">
                                 {count.toLocaleString()} records
                               </div>
                               <Button
                                 onClick={() => handleViewData(selectedSymbol, timeframe)}
                                 variant="ghost"
                                 size="sm"
                                 disabled={count === 0}
                                 className="h-8 hover:bg-slate-100"
                               >
                                 View Data <ArrowRight className="h-3 w-3 ml-1" />
                               </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Latest Data Preview */}
                  {symbolData.latestData && (
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
                        <CardTitle className="text-base font-semibold">Latest Market Data</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                 <tr>
                                    <th className="px-6 py-3 text-left">Timeframe</th>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-right">Close Price</th>
                                    <th className="px-6 py-3 text-right">Return %</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {Object.entries(symbolData.latestData).map(([timeframe, data]) => {
                                    if (!data) return null;
                                    const info = TIMEFRAME_INFO[timeframe as keyof typeof TIMEFRAME_INFO];
                                    if (!info) return null;
                                    const record = data as LatestDataRecord;
                                    const Icon = info.icon;

                                    return (
                                       <tr key={timeframe} className="hover:bg-slate-50/50">
                                          <td className="px-6 py-4">
                                             <div className="flex items-center gap-2">
                                                <Icon className={cn("h-4 w-4", info.color)} />
                                                <span className="font-medium text-slate-700">{info.name}</span>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 text-slate-600">
                                             {new Date(record.date).toLocaleDateString()}
                                          </td>
                                          <td className="px-6 py-4 text-right font-mono text-slate-700">
                                             {record.close.toFixed(2)}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                             {record.returnPercentage !== null ? (
                                                <span className={cn(
                                                   "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                   record.returnPercentage >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                )}>
                                                   {record.returnPercentage > 0 ? '+' : ''}{record.returnPercentage}%
                                                </span>
                                             ) : <span className="text-slate-300">-</span>}
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Database className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No calculated data found for {selectedSymbol}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Recent Updates */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/40 ring-1 ring-slate-200 h-full flex flex-col bg-white">
            <CardHeader className="bg-white border-b border-slate-50 py-5 px-6">
              <div className="flex items-center gap-2">
                 <Activity className="h-5 w-5 text-emerald-600" />
                 <CardTitle className="text-base font-bold text-slate-800">Recently Updated</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
               {statsData?.recentlyUpdated?.length > 0 ? (
                 <div className="space-y-4">
                   {statsData.recentlyUpdated.map((symbol: any) => (
                     <div 
                        key={symbol.symbol} 
                        onClick={() => setSelectedSymbol(symbol.symbol)}
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/30 transition-all cursor-pointer"
                     >
                       <div className="flex items-center space-x-3">
                         <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                           {symbol.symbol.substring(0, 1)}
                         </div>
                         <div className="min-w-0">
                           <div className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{symbol.symbol}</div>
                           <div className="text-[10px] text-slate-400 flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             {new Date(symbol.lastUpdated).toLocaleDateString()}
                           </div>
                         </div>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-7 w-7 p-0 text-slate-300 group-hover:text-indigo-600"
                       >
                         <Eye className="h-4 w-4" />
                       </Button>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8 text-xs text-slate-400 italic">
                    No recent updates
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Viewer Modal */}
      {selectedSymbol && (
        <DataViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          symbol={selectedSymbol}
          timeframe={viewerTab}
        />
      )}
    </div>
  );
}
```
