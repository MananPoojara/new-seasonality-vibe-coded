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
// Fix: Button is a default export in components/ui/Button.tsx
import Button from '@/components/ui/Button';
// Fix: Card, CardContent, CardHeader are named exports in components/ui/Card.tsx. CardTitle and CardDescription are not used/defined.
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { 
  Upload, FileText, RefreshCw, Play, CheckCircle, XCircle, 
  Clock, Cloud, Trash2, RotateCcw, Database, FileSpreadsheet, 
  LogOut, Settings, LayoutDashboard, Zap, Bell, Search, Menu, X, PlusCircle,
  ArrowUpRight, ShieldCheck, Activity, History, UploadCloud
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
// Fix: CalculatedDataSection is a default export in components/admin/CalculatedDataSection.tsx
import CalculatedDataSection from '@/components/admin/CalculatedDataSection';

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
  
  // Sidebar/UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
    const selected = Array.from((e.target as HTMLInputElement).files || []).filter(f => f.name.endsWith('.csv'));

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
      // Creating a dummy target for the handler
      handleBulkFilesSelect({ target: { files: dropped } } as any);
    }
  }, [handleBulkFilesSelect]);

  // Upload to MinIO using presigned URL
  const uploadToMinIO = async (file: File, presignedUrl: string) => {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        mode: 'cors',
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
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
      const presignResponse = await uploadApi.getPresignedUrls(
        bulkFiles.map(f => ({ name: f.name, size: f.size }))
      );

      if (!presignResponse.data.success) {
        throw new Error(presignResponse.data.error || 'Failed to get upload URLs');
      }

      const { batchId, files: presignedFiles } = presignResponse.data.data;
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

  const resetBulkUpload = () => {
    setBulkFiles([]);
    setBulkBatchId(null);
    setBulkStatus(null);
    setIsUploading(false);
    setIsProcessing(false);
    setUploadProgress(0);
    setError(null);
  };

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
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-rose-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-indigo-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
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
    return cn('px-2 py-0.5 rounded text-xs font-bold border', badges[status] || 'bg-slate-50 text-slate-700 border-slate-100');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loading />
      </div>
    );
  }

  const navigation = [
    { id: 'upload', name: 'Ingest Hub', icon: UploadCloud },
    { id: 'data', name: 'Analysis Engine', icon: Database },
    { id: 'batches', name: 'Process Logs', icon: History },
  ];

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Zap className="h-6 w-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">S-ADMIN</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Seasonality Pro</p>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group",
                    activeTab === item.id 
                      ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    activeTab === item.id ? "scale-110" : "group-hover:scale-110"
                  )} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="p-6 mt-auto">
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold">
                  {user.name[0]}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold truncate">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout Session
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200/50 w-80 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search className="h-4 w-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-transparent border-none text-sm font-medium focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="hidden sm:flex rounded-xl">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Go to Portal
            </Button>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                  {navigation.find(n => n.id === activeTab)?.name}
                </h2>
                <p className="text-slate-500 font-medium">Manage and monitor seasonality data processing pipelines.</p>
              </div>
            </div>

            {/* TAB: UPLOAD */}
            {activeTab === 'upload' && (
              <div className="space-y-8">
                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                        <Database className="h-6 w-6" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tickers</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalTickers}</p>
                      <div className="absolute -bottom-2 -right-2 opacity-[0.03]">
                        <Database className="h-24 w-24" />
                      </div>
                    </div>
                    <div className="p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Entries</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalDataEntries?.toLocaleString()}</p>
                      <div className="absolute -bottom-2 -right-2 opacity-[0.03]">
                        <FileSpreadsheet className="h-24 w-24" />
                      </div>
                    </div>
                    <div className="p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                      <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg per Ticker</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.averageEntriesPerTicker}</p>
                      <div className="absolute -bottom-2 -right-2 opacity-[0.03]">
                        <FileText className="h-24 w-24" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Upload Zone */}
                  <div className="lg:col-span-7 space-y-6">
                    <div 
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-4 border-dashed rounded-[3rem] p-16 transition-all duration-500 group flex flex-col items-center text-center",
                        dragActive ? "border-indigo-500 bg-indigo-50/50 scale-[0.99] shadow-inner" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/30",
                        isUploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      {!bulkStatus ? (
                        <>
                          <div className={cn(
                            "h-24 w-24 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center mb-8 transition-all duration-700",
                            dragActive ? "rotate-12 scale-110" : "group-hover:-translate-y-2 group-hover:-rotate-3"
                          )}>
                            <Cloud className={cn("h-10 w-10", dragActive ? "text-indigo-600" : "text-slate-300")} />
                          </div>
                          
                          <h4 className="text-2xl font-black text-slate-900 tracking-tight">Bulk CSV Ingestion</h4>
                          <p className="text-slate-400 font-medium max-w-sm mt-2">
                            System accepts up to 500 .CSV files per batch for synchronized seasonality calculation.
                          </p>

                          <label className="mt-10 inline-block cursor-pointer">
                            <span className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all block active:scale-95">Browse Filesystem</span>
                            <input type="file" multiple accept=".csv" className="hidden" id="bulk-file-upload" onChange={handleBulkFilesSelect} disabled={isUploading || isProcessing} />
                          </label>
                        </>
                      ) : (
                        <div className="w-full text-left space-y-6">
                           <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900">Pipeline Synchronization</h3>
                            <span className={getStatusBadge(bulkStatus.status)}>
                              {bulkStatus.status}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                              <span>Transmission Progress</span>
                              <span>{bulkStatus.progress.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500 shadow-lg",
                                  bulkStatus.status === 'FAILED' ? 'bg-rose-500 shadow-rose-200' :
                                  bulkStatus.status === 'COMPLETED' ? 'bg-emerald-500 shadow-emerald-200' :
                                  'bg-indigo-600 shadow-indigo-200'
                                )}
                                style={{ width: `${bulkStatus.progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            {[
                              { label: 'Total', val: bulkStatus.totalFiles, bg: 'bg-slate-50' },
                              { label: 'Done', val: bulkStatus.processedFiles, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                              { label: 'Failed', val: bulkStatus.failedFiles, bg: 'bg-rose-50', text: 'text-rose-600' },
                              { label: 'Queue', val: bulkStatus.pendingFiles, bg: 'bg-indigo-50', text: 'text-indigo-600' }
                            ].map((stat, i) => (
                              <div key={i} className={cn("p-4 rounded-3xl border border-slate-100 text-center shadow-sm", stat.bg)}>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className={cn("text-xl font-black", stat.text || "text-slate-900")}>{stat.val}</p>
                              </div>
                            ))}
                          </div>

                          {bulkStatus.files && bulkStatus.files.length > 0 && (
                            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-3xl bg-slate-50/50 custom-scrollbar">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-100 sticky top-0 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                  <tr>
                                    <th className="text-left px-4 py-3">File Block</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3">Records</th>
                                    <th className="text-left px-4 py-3">Audit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bulkStatus.files.map((file, i) => (
                                    <tr key={i} className="border-b border-slate-100 bg-white group hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-700 truncate max-w-[150px]" title={file.fileName}>
                                        {file.fileName}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                          {getStatusIcon(file.status)}
                                          <span className="text-[10px] font-black uppercase text-slate-400">{file.status}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-medium text-slate-500">{file.recordsProcessed || '-'}</td>
                                      <td className="px-4 py-3">
                                        {file.error ? (
                                          <details className="cursor-pointer">
                                            <summary className="text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase tracking-widest">
                                              Log
                                            </summary>
                                            <div className="fixed z-50 mt-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-[10px] text-rose-700 whitespace-pre-wrap max-w-xs shadow-xl">
                                              {file.error}
                                            </div>
                                          </details>
                                        ) : file.status === 'COMPLETED' ? (
                                          <span className="text-emerald-500 text-[10px] font-black uppercase">Verified</span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {['COMPLETED', 'FAILED', 'PARTIAL'].includes(bulkStatus.status) && (
                            <div className="flex justify-center gap-4 pt-4 border-t border-slate-100">
                              <Button variant="primary" className="rounded-2xl px-8" onClick={resetBulkUpload}>
                                <Upload className="h-4 w-4 mr-2" />
                                Sync More
                              </Button>
                              {bulkStatus.status === 'PARTIAL' && (
                                <Button variant="outline" className="rounded-2xl px-8" onClick={handleRetry}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Retry Blocks
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {isUploading && (
                       <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm animate-in slide-in-from-top-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Upload Pipeline</p>
                            <h5 className="text-xl font-black text-slate-900 flex items-center gap-2">
                              Transmitting Blocks...
                              <Zap className="h-4 w-4 text-indigo-500 fill-indigo-500 animate-pulse" />
                            </h5>
                          </div>
                          <p className="text-3xl font-black text-indigo-600 tracking-tighter">{uploadProgress.toFixed(0)}%</p>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all duration-300"
                            style={{ width: `${uploadProgress * 2}%` }} 
                          />
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="flex items-center gap-4 p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-800 animate-in slide-in-from-top-4">
                        <XCircle className="h-6 w-6 flex-shrink-0" />
                        <p className="text-sm font-bold leading-relaxed">{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Queue and batches */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                          <Database className="h-5 w-5 text-indigo-600" />
                          Ingestion Queue
                        </h4>
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                          {bulkFiles.length} Blocks
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[300px] pr-2">
                        {bulkFiles.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                              <FileText className="h-8 w-8" />
                            </div>
                            <p className="text-sm font-medium text-slate-400">Queue is empty</p>
                          </div>
                        ) : (
                          bulkFiles.map((file, i) => (
                            <div key={i} className="group p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all duration-300 flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatFileSize(file.size)}</p>
                              </div>
                              <button 
                                onClick={() => setBulkFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {bulkFiles.length > 0 && !bulkStatus && !isUploading && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                          <Button 
                            className="w-full py-5 rounded-[2rem] text-lg bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleBulkUpload}
                            disabled={isUploading}
                          >
                            Execute Payload Sync
                            <ArrowUpRight className="h-5 w-5 ml-2" />
                          </Button>
                          <button 
                            onClick={() => setBulkFiles([])}
                            className="w-full mt-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                          >
                            Flush Transmission Queue
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Batch History in Upload Tab */}
                    <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
                      <h4 className="text-lg font-black tracking-tight text-slate-900 mb-6">Recent Batches</h4>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {isLoading ? <Loading /> : batches.length === 0 ? (
                          <p className="text-center text-slate-400 text-sm py-4">No batches recorded</p>
                        ) : (
                          batches.slice(0, 5).map((batch: any) => (
                            <div key={batch.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-bold text-slate-900 truncate">{batch.name || 'Unnamed'}</p>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalFiles} Files</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={getStatusBadge(batch.status)}>{batch.status}</span>
                                {batch.status === 'PENDING' && (
                                  <button 
                                    onClick={() => processMutation.mutate(batch.id)}
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteMutation.mutate(batch.id)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Requirements */}
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Protocol Requirements</h3>
                    <p className="text-slate-500 font-medium mb-6">Strict adherence to data schemas ensures zero-error ingestion.</p>
                    <ul className="space-y-3">
                      {[
                        'Standard CSV (.csv) Encoding',
                        'Headers: Date, Ticker, Close (Strict)',
                        'Max Volume: 500 Files / Batch',
                        'Supported Formats: DD-MM-YYYY, YYYY-MM-DD',
                        'Async Background Processing enabled'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-10 bg-indigo-600 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                    <Zap className="h-12 w-12 text-white/20 absolute -top-4 -right-4" />
                    <h4 className="text-xl font-black mb-2">Data Engine V2</h4>
                    <p className="text-indigo-100 text-sm font-medium mb-6">Our new calculation engine processes 1M+ records in under 3 seconds.</p>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-200">
                      <Activity className="h-4 w-4" />
                      Operational Hub 1: Tokyo
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DATA */}
            {activeTab === 'data' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CalculatedDataSection />
              </div>
            )}

            {/* TAB: BATCHES/HISTORY */}
            {activeTab === 'batches' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900">Archival Logs</h3>
                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['upload-batches'] })}>
                         <RefreshCw className="h-4 w-4 mr-2" />
                         Sync logs
                       </Button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-20">
                      <Loading />
                    </div>
                  ) : batches.length > 0 ? (
                    <div className="space-y-4">
                      {batches.map((batch: any) => (
                        <div key={batch.id} className="group p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-indigo-200 transition-all duration-300">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <History className="h-7 w-7" />
                              </div>
                              <div>
                                <h4 className="text-lg font-black text-slate-900">{batch.name || 'Auto-generated batch'}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalFiles} files</span>
                                   <span className="h-1 w-1 rounded-full bg-slate-300" />
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalRecordsProcessed?.toLocaleString() || 0} records</span>
                                   <span className="h-1 w-1 rounded-full bg-slate-300" />
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(batch.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                              <span className={getStatusBadge(batch.status)}>{batch.status}</span>
                              <div className="flex items-center gap-2">
                                {batch.status === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => processMutation.mutate(batch.id)}
                                    disabled={processMutation.isPending}
                                    className="rounded-xl"
                                  >
                                    <Play className="h-4 w-4" />
                                  </button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(batch.id)}
                                  disabled={deleteMutation.isPending}
                                  className="rounded-xl text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {batch.errorSummary && (
                            <details className="mt-6 border-t border-slate-200 pt-4">
                              <summary className="cursor-pointer text-rose-600 hover:text-rose-800 text-[10px] font-black uppercase tracking-widest">
                                Failure Logs ({batch.failedFiles} blocks failed)
                              </summary>
                              <div className="mt-4 p-6 bg-rose-50 border border-rose-100 rounded-3xl">
                                <pre className="whitespace-pre-wrap font-mono text-xs text-rose-700 custom-scrollbar max-h-40 overflow-auto">
                                  {typeof batch.errorSummary === 'string' 
                                    ? batch.errorSummary 
                                    : JSON.stringify(batch.errorSummary, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 space-y-4">
                      <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto">
                        <History className="h-10 w-10" />
                      </div>
                      <p className="text-slate-400 font-bold">No ingestion history found in archives.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
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
  ChevronRight, ArrowRight, Command, LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatPercentage, formatDate } from '../lib/utils';
import CalculatedDataSection from '../components/admin/CalculatedDataSection';

// Helper for file size since it's used in the logic
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
    const targetFiles = (e.target as HTMLInputElement).files;
    const selected = Array.from(targetFiles || []).filter(f => f.name.endsWith('.csv'));
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

  // Logic: Check admin
  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') {
      router.push('/');
      toast.error('Access denied. Admin only.');
    }
  }, [isAuthenticated, user, router]);

  // Logic: Queries
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
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

  // UI Helpers
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-emerald-500" />;
      case 'failed': return <XCircle className="h-3 w-3 text-rose-500" />;
      case 'processing': return <RefreshCw className="h-3 w-3 text-indigo-500 animate-spin" />;
      default: return <Clock className="h-3 w-3 text-amber-500" />;
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
    return cn('px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-widest', badges[status] || 'bg-slate-50 text-slate-700 border-slate-100');
  };

  const navigation = [
    { id: 'upload', name: 'Ingest', icon: UploadCloud },
    { id: 'data', name: 'Engine', icon: Database },
    { id: 'batches', name: 'Logs', icon: History },
  ];

  // Fix: Define 'batches' and 'stats' from query data to be used in the JSX below
  const batches = batchesData?.data || [];
  const stats = statsData?.data;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans selection:bg-indigo-100">
      {/* Top Professional Banner */}
      <header className="h-20 bg-white border-b border-slate-200/60 px-10 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl bg-white/80">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
            <Zap className="h-5 w-5 text-indigo-400 fill-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Seasonality Hub</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Administrative Node</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
            <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Operational</span>
          </div>
          <div className="h-10 w-10 rounded-full border-2 border-indigo-100 bg-indigo-50 flex items-center justify-center text-indigo-700 font-black text-xs">
            {user?.name?.[0] || 'A'}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-rose-500">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Statistics Row - Sleek Micro Cards */}
        {activeTab === 'upload' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
            {[
              { label: 'Network Tickers', val: stats.totalTickers, icon: Database, color: 'text-indigo-600' },
              { label: 'Data Datasets', val: stats.totalDataEntries?.toLocaleString(), icon: FileSpreadsheet, color: 'text-emerald-600' },
              { label: 'Ticker Density', val: stats.averageEntriesPerTicker, icon: Zap, color: 'text-amber-600' }
            ].map((s, i) => (
              <div key={i} className="bg-white border border-slate-200/60 p-6 rounded-[2rem] flex items-center justify-between group hover:border-indigo-100 transition-all shadow-sm">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{s.val}</p>
                </div>
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity bg-slate-50", s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content Rendering */}
        <section className="min-h-[60vh]">
          {activeTab === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Ingestion Module */}
              <div className="lg:col-span-7">
                <div 
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "relative h-[500px] border-2 border-dashed rounded-[3rem] p-12 transition-all duration-700 flex flex-col items-center justify-center text-center",
                    dragActive ? "border-indigo-500 bg-indigo-50/20 scale-[0.99] shadow-inner" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm",
                    isUploading && "opacity-60 pointer-events-none"
                  )}
                >
                  {!bulkStatus ? (
                    <div className="space-y-6 max-w-md">
                      <div className="h-24 w-24 mx-auto rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform duration-500">
                        <UploadCloud className={cn("h-10 w-10", dragActive ? "text-indigo-600" : "text-slate-300")} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Data Ingestion Engine</h4>
                        <p className="text-slate-400 font-medium text-sm leading-relaxed px-10">
                          Transfer up to 500 CSV records directly to the seasonality mainframe for analysis.
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-6">
                        <label className="cursor-pointer group">
                          <span className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all block active:scale-95">
                            Select Payload
                          </span>
                          <input type="file" multiple accept=".csv" className="hidden" onChange={handleBulkFilesSelect} />
                        </label>
                        
                        {bulkFiles.length > 0 && (
                          <div className="animate-in fade-in zoom-in-95 duration-500 w-full space-y-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{bulkFiles.length} Blocks Prepared</span>
                            </div>
                            <Button 
                              onClick={handleBulkUpload} 
                              className="w-full py-6 rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-700 text-lg shadow-xl shadow-indigo-100"
                              isLoading={isUploading}
                            >
                              Commence Sync
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* High-End Processing Visualizer */
                    <div className="w-full h-full text-left flex flex-col justify-center space-y-10 animate-in fade-in duration-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline State</p>
                          <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{bulkStatus.status}</h3>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transmission</p>
                           <p className="text-4xl font-black text-indigo-600 tracking-tighter">{bulkStatus.progress.toFixed(0)}%</p>
                        </div>
                      </div>

                      <div className="h-4 w-full bg-slate-50 rounded-full border border-slate-100 overflow-hidden shadow-inner">
                        <div 
                          className={cn(
                            "h-full transition-all duration-700 shadow-[0_0_20px_rgba(79,70,229,0.3)]",
                            bulkStatus.status === 'FAILED' ? 'bg-rose-500' : 'bg-indigo-600'
                          )}
                          style={{ width: `${bulkStatus.progress}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { l: 'Total', v: bulkStatus.totalFiles, c: 'text-slate-900' },
                          { l: 'Verified', v: bulkStatus.processedFiles, c: 'text-emerald-600' },
                          { l: 'Halt', v: bulkStatus.failedFiles, c: 'text-rose-600' },
                          { l: 'Buffer', v: bulkStatus.pendingFiles, c: 'text-indigo-600' }
                        ].map((s, i) => (
                          <div key={i} className="p-4 bg-slate-50/50 rounded-3xl border border-slate-100 text-center">
                            <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">{s.l}</p>
                            <p className={cn("text-xl font-black font-mono", s.c)}>{s.v}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-center gap-4">
                        <Button variant="outline" className="rounded-2xl px-10" onClick={resetBulkUpload}>New Transmission</Button>
                        {bulkStatus.status === 'PARTIAL' && <Button variant="secondary" className="rounded-2xl px-10" onClick={handleRetry}>Recover Failed</Button>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Side: Schema Info & Recent Activity */}
              <div className="lg:col-span-5 space-y-10">
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                  <Activity className="h-12 w-12 text-white/5 absolute -top-4 -right-4" />
                  <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-indigo-400">Security Protocol</h4>
                  <ul className="space-y-4">
                    {[
                      'Mandatory CSV encapsulation',
                      'TLS 1.3 Data Tunneling',
                      'Asynchronous In-Memory Logic',
                      'High Resolution OHLCV Support'
                    ].map((t, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-10 pt-8 border-t border-white/10">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Engine Uptime</p>
                    <div className="flex items-center justify-between">
                       <span className="text-2xl font-black italic tracking-tighter">99.9%</span>
                       <div className="h-1 w-20 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                  </div>
                </div>

                {/* Micro Activity Feed */}
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Archive Feed</h4>
                   <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                     {batchesLoading ? <Loading /> : batches.slice(0, 3).map((b: any) => (
                       <div key={b.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:border-indigo-100">
                         <div className="overflow-hidden">
                           <p className="text-xs font-black text-slate-900 truncate leading-none mb-1 uppercase tracking-tight">{b.name || 'Auto block'}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{b.totalFiles} packages</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className={getStatusBadge(b.status)}>{b.status}</span>
                            <ArrowRight className="h-3 w-3 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all" />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="animate-in fade-in duration-500">
              <CalculatedDataSection />
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm">
                <div className="flex items-center justify-between mb-12">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">System Logs</h2>
                   <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['upload-batches'] })} className="rounded-xl">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                   </div>
                </div>

                {batchesLoading ? <Loading /> : batches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {batches.map((batch: any) => (
                      <div key={batch.id} className="group p-8 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-indigo-100 transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                          <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-600 group-hover:rotate-6 transition-all duration-500">
                              <History className="h-7 w-7" />
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{batch.name || 'System Auto Batch'}</h4>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalFiles} Blocks</span>
                                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{batch.totalRecordsProcessed?.toLocaleString()} Entries</span>
                                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(batch.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <span className={getStatusBadge(batch.status)}>{batch.status}</span>
                            <div className="flex gap-3">
                                {batch.status === 'PENDING' && (
                                  <button onClick={() => processMutation.mutate(batch.id)} className="p-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100">
                                    <Play className="h-5 w-5" />
                                  </button>
                                )}
                                <button onClick={() => deleteMutation.mutate(batch.id)} className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-100">
                                  <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center">
                    <History className="h-12 w-12 text-slate-200 mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-sm">No activity logs recorded.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Unique Command Dock - Replaces standard sidebar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-1000 delay-300">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[2.5rem] shadow-2xl flex items-center gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 group relative",
                  isActive 
                    ? "bg-white text-slate-900 shadow-xl" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform duration-500",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest overflow-hidden transition-all duration-300",
                  isActive ? "w-auto opacity-100 max-w-[100px]" : "w-0 opacity-0 max-w-0"
                )}>
                  {item.name}
                </span>
                {isActive && (
                  <span className="absolute -top-1 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                )}
              </button>
            );
          })}
          <div className="w-[1px] h-6 bg-white/10 mx-2" />
          <button 
            onClick={() => router.push('/')}
            className="p-3 text-slate-400 hover:text-white transition-colors"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```
