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
  AlertCircle, ArrowUpRight
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
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-blue-100 p-1.5">
                         <Cloud className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">Bulk CSV Upload</CardTitle>
                        <CardDescription className="text-xs">Upload multiple data files at once (max 500)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300",
                        dragActive 
                          ? "border-blue-500 bg-blue-50/50" 
                          : "border-slate-200 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30",
                        error ? "border-rose-300 bg-rose-50/50" : ""
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
                        className="absolute inset-0 cursor-pointer opacity-0"
                        id="bulk-file-upload"
                        disabled={isUploading || isProcessing}
                      />

                      {!bulkStatus ? (
                        <div className="text-center space-y-4">
                          <div className={cn(
                            "mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-colors",
                            dragActive ? "bg-blue-100" : "bg-white shadow-sm border border-slate-100"
                          )}>
                            <Upload className={cn(
                              "h-8 w-8",
                              dragActive ? "text-blue-600" : "text-slate-400"
                            )} />
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">
                              <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-500">
                              CSV files only (max 500 files)
                            </p>
                          </div>

                          {bulkFiles.length > 0 && (
                            <div className="w-full max-w-md mx-auto mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50/50">
                                <span className="text-xs font-semibold text-slate-700">
                                  {bulkFiles.length} files selected
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault(); // Prevent triggering file input
                                    setBulkFiles([]);
                                  }}
                                  className="z-10 text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline"
                                >
                                  Clear all
                                </button>
                              </div>
                              <ul className="max-h-40 overflow-y-auto px-2 py-1">
                                {bulkFiles.slice(0, 10).map((file, i) => (
                                  <li key={i} className="flex items-center justify-between py-2 px-2 text-xs hover:bg-slate-50 rounded">
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="h-3 w-3 text-slate-400" />
                                      <span className="truncate max-w-[200px] text-slate-600 font-medium">{file.name}</span>
                                    </div>
                                    <span className="text-slate-400">{formatFileSize(file.size)}</span>
                                  </li>
                                ))}
                                {bulkFiles.length > 10 && (
                                  <li className="py-2 text-center text-xs text-slate-400 italic bg-slate-50 rounded mt-1">
                                    + {bulkFiles.length - 10} more files
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          <div className="flex justify-center gap-3 pt-4 z-20 relative">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation(); // Stop drag area click
                                handleBulkUpload();
                              }}
                              disabled={isUploading || bulkFiles.length === 0}
                              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                            >
                              {isUploading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload & Process
                                </>
                              )}
                            </Button>

                            {bulkFiles.length > 0 && !isUploading && (
                              <Button 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resetBulkUpload();
                                }}
                                className="border-slate-200 text-slate-600"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Processing Status Display */
                        <div className="w-full space-y-6 text-left z-20 relative bg-white rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">Processing Batch</h3>
                              <p className="text-xs text-slate-500">Batch ID: <span className="font-mono text-slate-400">{bulkStatus.batchId.substring(0,8)}...</span></p>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-semibold border",
                              getStatusBadge(bulkStatus.status)
                            )}>
                              {bulkStatus.status}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium text-slate-600">
                              <span>Overall Progress</span>
                              <span>{bulkStatus.progress.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500 ease-out",
                                  bulkStatus.status === 'FAILED' ? 'bg-rose-500' :
                                  bulkStatus.status === 'COMPLETED' ? 'bg-emerald-500' :
                                  'bg-blue-600'
                                )}
                                style={{ width: `${bulkStatus.progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-4">
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                              <div className="text-lg font-bold text-slate-700">{bulkStatus.totalFiles}</div>
                              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</div>
                            </div>
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                              <div className="text-lg font-bold text-emerald-600">{bulkStatus.processedFiles}</div>
                              <div className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">Success</div>
                            </div>
                            <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-center">
                              <div className="text-lg font-bold text-rose-600">{bulkStatus.failedFiles}</div>
                              <div className="text-[10px] uppercase font-bold text-rose-600/70 tracking-wider">Failed</div>
                            </div>
                            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-center">
                              <div className="text-lg font-bold text-blue-600">{bulkStatus.pendingFiles}</div>
                              <div className="text-[10px] uppercase font-bold text-blue-600/70 tracking-wider">Pending</div>
                            </div>
                          </div>

                          {/* File List */}
                          {bulkStatus.files && bulkStatus.files.length > 0 && (
                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                              <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                      <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">File Name</th>
                                      <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                      <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">Records</th>
                                      <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider">Info</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {bulkStatus.files.map((file, i) => (
                                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[150px]" title={file.fileName}>
                                          {file.fileName}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                            getStatusBadge(file.status)
                                          )}>
                                            {getStatusIcon(file.status)}
                                            {file.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600">{file.recordsProcessed || '-'}</td>
                                        <td className="px-4 py-2.5">
                                          {file.error ? (
                                            <div className="max-w-[250px]">
                                              <details className="group cursor-pointer open:mb-2">
                                                <summary className="text-rose-600 hover:text-rose-800 text-xs font-medium flex items-center gap-1.5 transition-colors focus:outline-none">
                                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                  <span>View Error</span>
                                                </summary>
                                                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-100 rounded-md text-xs text-rose-800 whitespace-pre-wrap font-mono leading-relaxed shadow-sm animate-in slide-in-from-top-1">
                                                  {file.error}
                                                </div>
                                              </details>
                                            </div>
                                          ) : file.status === 'COMPLETED' ? (
                                            <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                              <CheckCircle className="h-3.5 w-3.5" />
                                              Success
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 text-xs">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {['COMPLETED', 'FAILED', 'PARTIAL'].includes(bulkStatus.status) && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                               <p className="text-xs text-slate-400 italic">Processing finished.</p>
                               <div className="flex gap-3">
                                <Button size="sm" onClick={resetBulkUpload} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                                  <Upload className="h-3.5 w-3.5 mr-2" />
                                  New Upload
                                </Button>

                                {bulkStatus.status === 'PARTIAL' && (
                                  <Button size="sm" variant="outline" onClick={handleRetry} className="border-amber-200 text-amber-700 hover:bg-amber-50">
                                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                                    Retry Failed
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="mt-4 flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg animate-in slide-in-from-top-2">
                        <XCircle className="text-rose-600 h-5 w-5 flex-shrink-0" />
                        <span className="text-rose-700 text-sm font-medium">{error}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: Batches & Requirements */}
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm h-[calc(100%-1rem)] flex flex-col">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                    <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 space-y-6">
                     <div className="space-y-4">
                        <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                          <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            File Requirements
                          </div>
                          <ul className="space-y-2 text-xs text-blue-900/70 list-disc list-inside">
                            <li>Format: <strong>CSV (.csv)</strong> only</li>
                            <li>Max files: <strong>500</strong> per batch</li>
                            <li>Required: Date, Ticker, Close</li>
                            <li>Formats: YYYY-MM-DD or DD-MM-YYYY</li>
                          </ul>
                        </div>
                     </div>

                     <div>
                       <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                         Recent Batches
                         <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600" onClick={() => setActiveTab('batches')}>View all</Button>
                       </h4>
                       
                       {isLoading ? (
                          <div className="flex justify-center py-4"><Loading /></div>
                       ) : batches.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-4 italic">No recent uploads</p>
                       ) : (
                          <div className="space-y-2">
                            {batches.slice(0, 5).map((batch: any) => (
                              <div key={batch.id} className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-default">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-slate-700 truncate">{batch.name || 'Unnamed Batch'}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(batch.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className={cn("h-2 w-2 rounded-full", 
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
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// --- ICONS (Lucide Style SVGs) ---
const Icons = {
  LayoutDashboard: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
  ),
  Folder: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
  ),
  Users: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  Settings: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Upload: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
  ),
  Bell: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
  ),
  Search: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  MoreVertical: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
  ),
  X: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  ),
  Menu: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
  ),
  CheckCircle: (props: any) => (
     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  FileText: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
  ),
  Trash: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  ),
  AlertTriangle: (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  )
};

// --- STYLES ---
const STYLES = `
:root {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --secondary: #e2e8f0;
  --bg-dark: #0f172a;
  --bg-light: #f8fafc;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --border: #e2e8f0;
  --success-bg: #dcfce7;
  --success-text: #166534;
  --warning-bg: #fef9c3;
  --warning-text: #854d0e;
  --error-bg: #fee2e2;
  --error-text: #991b1b;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --radius: 8px;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-light);
  color: var(--text-main);
  -webkit-font-smoothing: antialiased;
}

.app-container {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background-color: var(--bg-dark);
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s ease;
  z-index: 50;
}

.sidebar-logo {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.sidebar-nav {
  padding: 24px 16px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
  color: #94a3b8;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.nav-item:hover, .nav-item.active {
  background-color: rgba(255,255,255,0.1);
  color: white;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevent overflow issues */
}

/* Header */
.header {
  height: 64px;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  position: sticky;
  top: 0;
  z-index: 40;
}

.header-search {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-light);
  padding: 8px 16px;
  border-radius: 20px;
  width: 300px;
  color: var(--text-sub);
}

.header-search input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  color: var(--text-main);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-sub);
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background-color: var(--bg-light);
  color: var(--text-main);
}

.avatar {
  width: 36px;
  height: 36px;
  background-color: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Dashboard Content */
.content-area {
  padding: 32px;
  overflow-y: auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text-main);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--surface);
  padding: 24px;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
}

.stat-label {
  color: var(--text-sub);
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-main);
}

.stat-trend {
  font-size: 0.875rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-up { color: var(--success-text); }
.trend-down { color: var(--error-text); }

/* File Upload */
.upload-section {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  padding: 32px;
  margin-bottom: 32px;
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 40px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
  background: var(--bg-light);
}

.drop-zone:hover, .drop-zone.active {
  border-color: var(--primary);
  background: #eef2ff;
}

.drop-icon {
  color: var(--primary);
  margin-bottom: 16px;
}

.drop-text-main {
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.drop-text-sub {
  color: var(--text-sub);
  font-size: 0.875rem;
}

/* Progress Bar */
.progress-container {
  margin-top: 24px;
}
.progress-bar-bg {
  height: 8px;
  background: var(--secondary);
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}
.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  margin-top: 8px;
  color: var(--text-sub);
}

/* Data Table */
.table-card {
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border);
  overflow: hidden;
}

.table-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-weight: 600;
  font-size: 1.1rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 16px 24px;
  background: var(--bg-light);
  color: var(--text-sub);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  color: var(--text-main);
  font-size: 0.9rem;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover {
  background-color: var(--bg-light);
}

/* Status Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.badge-success { background: var(--success-bg); color: var(--success-text); }
.badge-warning { background: var(--warning-bg); color: var(--warning-text); }
.badge-error { background: var(--error-bg); color: var(--error-text); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: var(--primary);
  color: white;
}
.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-icon-only {
  padding: 8px;
  color: var(--text-sub);
  background: transparent;
}
.btn-icon-only:hover {
  color: var(--error-text);
  background: var(--error-bg);
}

/* Toast */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toast {
  padding: 16px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  animation: slideIn 0.3s ease;
}

.toast-error { border-left-color: var(--error-text); }
.toast-success { border-left-color: var(--success-text); }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Responsive */
.mobile-menu-btn {
  display: none;
  margin-right: 16px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    height: 100%;
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .mobile-menu-btn {
    display: block;
  }
  .header {
    padding: 0 16px;
  }
  .header-search {
    display: none;
  }
  .content-area {
    padding: 16px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
`;

// --- COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
  let type = "warning";
  let label = status;
  
  switch(status.toLowerCase()) {
    case 'completed':
    case 'active':
      type = 'success';
      break;
    case 'failed':
    case 'error':
      type = 'error';
      break;
    default:
      type = 'warning';
  }

  return (
    <span className={`badge badge-${type}`}>
      {label}
    </span>
  );
};

const FileUploader = ({ onUpload }: { onUpload: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const processFile = (file: File) => {
    setUploading(true);
    // Simulate upload
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onUpload(file);
          setUploading(false);
          setProgress(0);
        }, 500);
      }
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="upload-section">
      <h3 className="table-title" style={{ marginBottom: '16px' }}>Upload New File</h3>
      {!uploading ? (
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleChange} 
            style={{ display: 'none' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Icons.Upload className="drop-icon" width={48} height={48} />
            <div className="drop-text-main">Click to upload or drag and drop</div>
            <div className="drop-text-sub">SVG, PNG, JPG or GIF (max. 800x400px)</div>
          </div>
        </div>
      ) : (
        <div className="progress-container">
          <div className="progress-text">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MOCK DATA ---
const INITIAL_FILES = [
  { id: 1, name: "annual_report_2024.pdf", size: "2.4 MB", uploaded: "Just now", status: "Processing" },
  { id: 2, name: "dashboard_mockup.fig", size: "15.8 MB", uploaded: "2 hours ago", status: "Completed" },
  { id: 3, name: "client_list_q3.csv", size: "450 KB", uploaded: "Yesterday", status: "Completed" },
  { id: 4, name: "server_logs_error.txt", size: "1.2 MB", uploaded: "2 days ago", status: "Failed" },
  { id: 5, name: "project_proposal.docx", size: "3.2 MB", uploaded: "3 days ago", status: "Completed" },
];

// --- MAIN APP COMPONENT ---
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [toasts, setToasts] = useState<{id: number, message: string, type: string}[]>([]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleFileUpload = (file: File) => {
    // Logic to add file to list
    const newFile = {
      id: Date.now(),
      name: file.name,
      size: `${(file.size / (1024*1024)).toFixed(2)} MB`,
      uploaded: "Just now",
      status: "Completed"
    };
    setFiles([newFile, ...files]);
    showToast(`File "${file.name}" uploaded successfully!`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this file?")) {
      setFiles(files.filter(f => f.id !== id));
      showToast("File deleted", "error");
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="app-container">
        
        {/* Sidebar */}
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            AdminPanel
          </div>
          <nav className="sidebar-nav">
            {['Dashboard', 'Files', 'Users', 'Settings'].map(item => {
              const Icon = Icons[item === 'Dashboard' ? 'LayoutDashboard' : item as keyof typeof Icons] || Icons.Folder;
              return (
                <div 
                  key={item} 
                  className={`nav-item ${activeTab === item ? 'active' : ''}`}
                  onClick={() => { setActiveTab(item); setMobileMenuOpen(false); }}
                >
                  <Icon width={18} height={18} />
                  <span>{item}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          
          {/* Header */}
          <header className="header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Icons.Menu />
              </button>
              <div className="header-search">
                <Icons.Search color="#94a3b8" />
                <input type="text" placeholder="Search..." />
              </div>
            </div>
            
            <div className="header-right">
              <button className="icon-btn">
                <Icons.Bell />
              </button>
              <div className="avatar">A</div>
            </div>
          </header>

          {/* Body */}
          <div className="content-area">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 className="page-title">{activeTab} Overview</h1>
              <button className="btn btn-primary">
                <Icons.Upload width={16} height={16} />
                <span>Export Report</span>
              </button>
            </div>

            {/* Stats Row */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Storage</div>
                <div className="stat-value">845 GB</div>
                <div className="stat-trend trend-up">
                  <Icons.LayoutDashboard width={14} height={14} /> 12% increase
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Users</div>
                <div className="stat-value">1,234</div>
                <div className="stat-trend trend-up">
                  <Icons.Users width={14} height={14} /> 5% increase
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">System Status</div>
                <div className="stat-value" style={{ color: 'var(--success-text)' }}>99.9%</div>
                <div className="stat-trend">
                  <Icons.CheckCircle width={14} height={14} /> Operational
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Pending Issues</div>
                <div className="stat-value">3</div>
                <div className="stat-trend trend-down">
                  <Icons.AlertTriangle width={14} height={14} /> Action needed
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <FileUploader onUpload={handleFileUpload} />

            {/* Data Table */}
            <div className="table-card">
              <div className="table-header">
                <div className="table-title">Recent Files</div>
                <button className="icon-btn"><Icons.MoreVertical /></button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(file => (
                      <tr key={file.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500 }}>
                          <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '6px', color: '#6366f1' }}>
                            <Icons.FileText width={16} height={16} />
                          </div>
                          {file.name}
                        </td>
                        <td>{file.size}</td>
                        <td>{file.uploaded}</td>
                        <td><StatusBadge status={file.status} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-icon-only" onClick={() => handleDelete(file.id)}>
                            <Icons.Trash width={16} height={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {files.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                          No files found. Upload one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>

        {/* Toast Container */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'error' ? <Icons.AlertTriangle color="var(--error-text)" /> : <Icons.CheckCircle color="var(--success-text)" />}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
                  {t.type === 'error' ? 'Error' : 'Success'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>{t.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overlay for mobile sidebar */}
        {mobileMenuOpen && (
          <div 
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

      </div>
    </>
  );
}

```
