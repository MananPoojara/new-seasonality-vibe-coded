'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { uploadApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Button  from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { 
  Upload, FileText, RefreshCw, Play, CheckCircle, XCircle, 
  Clock, Cloud, Trash2, RotateCcw, Database, FileSpreadsheet, LogOut, Calendar, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { MetricCard } from '@/components/admin/MetricCard';
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
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
      PROCESSING: 'bg-blue-50 text-blue-700 border border-blue-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      FAILED: 'bg-red-50 text-red-700 border border-red-200',
      PARTIAL: 'bg-orange-50 text-orange-700 border border-orange-200',
    };
    return badges[status] || 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Don't render if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enhanced Admin Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4">
            {/* Brand & Context */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl shadow-sm">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900">Seasonality</h1>
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">Admin</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Data Management Console</p>
                </div>
              </div>
            </div>

            {/* User Area */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* User Avatar */}
                <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full text-white font-semibold text-sm shadow-sm">
                  {user.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                {/* Logout Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout} 
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 pb-0">
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2",
                  activeTab === 'upload'
                    ? "text-slate-900 border-slate-900 bg-slate-50/50"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/30"
                )}
              >
                <Upload className="h-4 w-4" />
                Upload Data
                {activeTab === 'upload' && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2",
                  activeTab === 'data'
                    ? "text-slate-900 border-slate-900 bg-slate-50/50"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/30"
                )}
              >
                <Database className="h-4 w-4" />
                Calculated Data
                {activeTab === 'data' && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('batches')}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2",
                  activeTab === 'batches'
                    ? "text-slate-900 border-slate-900 bg-slate-50/50"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/30"
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Upload History
                {activeTab === 'batches' && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-slate-900 to-slate-700 rounded-full"></div>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Content based on active tab */}

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* Enhanced Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <MetricCard
                  title="Total Tickers"
                  value={stats.totalTickers}
                  icon={Database}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-50"
                  tooltip="Total number of unique ticker symbols in the system"
                />
                <MetricCard
                  title="Data Entries"
                  value={stats.totalDataEntries}
                  icon={FileSpreadsheet}
                  iconColor="text-emerald-600"
                  iconBgColor="bg-emerald-50"
                  tooltip="Total number of data records across all tickers"
                />
                <MetricCard
                  title="Average per Ticker"
                  value={stats.averageEntriesPerTicker}
                  icon={FileText}
                  iconColor="text-violet-600"
                  iconBgColor="bg-violet-50"
                  tooltip="Average number of data entries per ticker symbol"
                />
              </div>
            )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bulk Upload Card - Enhanced design */}
          <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg">
                  <Cloud className="h-4 w-4 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Bulk CSV Upload</h3>
              </div>
              <p className="text-sm text-slate-600">
                Upload multiple CSV files at once (up to 500 files)
              </p>
            </div>
            <div className="p-6">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
                  dragActive ? "border-blue-300 bg-blue-50/50" : "border-slate-200 hover:border-slate-300",
                  error ? "border-red-300 bg-red-50/50" : ""
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
                  className="hidden"
                  id="bulk-file-upload"
                  disabled={isUploading || isProcessing}
                />

                {!bulkStatus ? (
                  <div className="space-y-6">
                    <Cloud className={cn(
                      "mx-auto h-12 w-12",
                      dragActive ? "text-blue-500" : "text-slate-400"
                    )} />

                    <div>
                      <label
                        htmlFor="bulk-file-upload"
                        className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Click to browse or drag and drop
                      </label>
                      <p className="text-sm text-slate-500 mt-2">
                        Select multiple CSV files (max 500)
                      </p>
                    </div>

                    {bulkFiles.length > 0 && (
                      <div className="text-left max-h-48 overflow-y-auto bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-slate-700">
                            {bulkFiles.length} files selected
                          </span>
                          <button
                            onClick={() => setBulkFiles([])}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Clear all
                          </button>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600">
                          {bulkFiles.slice(0, 10).map((file, i) => (
                            <li key={i} className="flex items-center justify-between py-1">
                              <span className="truncate flex-1 font-medium">{file.name}</span>
                              <span className="text-slate-400 ml-3 text-xs">{formatFileSize(file.size)}</span>
                            </li>
                          ))}
                          {bulkFiles.length > 10 && (
                            <li className="text-slate-400 italic text-xs pt-2 border-t border-slate-200">
                              ... and {bulkFiles.length - 10} more files
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={handleBulkUpload}
                        disabled={isUploading || bulkFiles.length === 0}
                        className="bg-slate-900 hover:bg-slate-800 text-white"
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
                        <Button variant="outline" onClick={resetBulkUpload}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Processing Status Display */
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Batch Processing</h3>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        getStatusBadge(bulkStatus.status)
                      )}>
                        {bulkStatus.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{bulkStatus.progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className={cn(
                            "h-4 rounded-full transition-all duration-500",
                            bulkStatus.status === 'FAILED' ? 'bg-red-500' :
                            bulkStatus.status === 'COMPLETED' ? 'bg-green-500' :
                            'bg-blue-500'
                          )}
                          style={{ width: `${bulkStatus.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-xl font-bold">{bulkStatus.totalFiles}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-green-600">{bulkStatus.processedFiles}</div>
                        <div className="text-xs text-gray-500">Done</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-red-600">{bulkStatus.failedFiles}</div>
                        <div className="text-xs text-gray-500">Failed</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-xl font-bold text-blue-600">{bulkStatus.pendingFiles}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                      </div>
                    </div>

                    {/* File List */}
                    {bulkStatus.files && bulkStatus.files.length > 0 && (
                      <div className="max-h-48 overflow-y-auto border rounded">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="text-left p-2">File</th>
                              <th className="text-left p-2">Status</th>
                              <th className="text-left p-2">Records</th>
                              <th className="text-left p-2">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkStatus.files.map((file, i) => (
                              <tr key={i} className="border-b border-gray-100">
                                <td className="p-2 truncate max-w-[150px]" title={file.fileName}>
                                  {file.fileName}
                                </td>
                                <td className="p-2">
                                  <span className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                                    getStatusBadge(file.status)
                                  )}>
                                    {getStatusIcon(file.status)}
                                    {file.status}
                                  </span>
                                </td>
                                <td className="p-2">{file.recordsProcessed || '-'}</td>
                                <td className="p-2">
                                  {file.error ? (
                                    <div className="max-w-[200px]">
                                      <details className="cursor-pointer">
                                        <summary className="text-red-600 hover:text-red-800 text-xs">
                                          View Error
                                        </summary>
                                        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 whitespace-pre-wrap">
                                          {file.error}
                                        </div>
                                      </details>
                                    </div>
                                  ) : file.status === 'COMPLETED' ? (
                                    <span className="text-green-600 text-xs">✓ Success</span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Actions */}
                    {['COMPLETED', 'FAILED', 'PARTIAL'].includes(bulkStatus.status) && (
                      <div className="flex justify-center gap-3 pt-4 border-t">
                        <Button onClick={resetBulkUpload}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload More
                        </Button>

                        {bulkStatus.status === 'PARTIAL' && (
                          <Button variant="outline" onClick={handleRetry}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Retry Failed
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="text-red-500 h-5 w-5 flex-shrink-0" />
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Upload History Card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload Activity</h3>
                  <p className="text-sm text-slate-600">Recent batch processing history</p>
                </div>
                {batches.length > 0 && (
                  <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                    {batches.length} batches
                  </div>
                )}
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <Loading />
                    <p className="text-slate-500 text-sm mt-3">Loading upload history...</p>
                  </div>
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <h4 className="text-slate-900 font-medium mb-2">No upload history</h4>
                  <p className="text-sm text-slate-500 mb-4">Your batch uploads will appear here</p>
                  <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                    Upload your first CSV files to get started
                  </div>
                </div>
              ) : (
                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {batches.map((batch: any, index: number) => (
                    <div
                      key={batch.id}
                      className="group relative p-4 rounded-xl hover:bg-slate-50/50 transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-200/60"
                    >
                      {/* Timeline connector */}
                      {index < batches.length - 1 && (
                        <div className="absolute left-8 top-12 w-px h-8 bg-slate-200"></div>
                      )}
                      
                      <div className="flex items-start gap-4">
                        {/* Status Indicator */}
                        <div className="flex-shrink-0 mt-1">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-colors",
                            batch.status === 'COMPLETED' ? "border-emerald-200 bg-emerald-50" :
                            batch.status === 'FAILED' ? "border-red-200 bg-red-50" :
                            batch.status === 'PROCESSING' ? "border-blue-200 bg-blue-50" :
                            "border-amber-200 bg-amber-50"
                          )}>
                            {batch.status === 'COMPLETED' ? (
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                            ) : batch.status === 'FAILED' ? (
                              <XCircle className="h-3 w-3 text-red-600" />
                            ) : batch.status === 'PROCESSING' ? (
                              <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-600" />
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Batch Name & Status */}
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-slate-900 truncate">
                                  {batch.name || 'Unnamed Batch'}
                                </h4>
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                                  batch.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  batch.status === 'FAILED' ? "bg-red-50 text-red-700 border border-red-200" :
                                  batch.status === 'PROCESSING' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                  "bg-amber-50 text-amber-700 border border-amber-200"
                                )}>
                                  {batch.status.toLowerCase()}
                                </span>
                              </div>

                              {/* Metadata */}
                              <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <FileSpreadsheet className="h-3.5 w-3.5" />
                                  <span>{batch.totalFiles} files</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Database className="h-3.5 w-3.5" />
                                  <span>{batch.totalRecordsProcessed?.toLocaleString() || 0} records</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {/* Error Summary */}
                              {batch.errorSummary && (
                                <details className="mt-3 group/details">
                                  <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    View errors ({batch.failedFiles} failed files)
                                    <ChevronRight className="h-3 w-3 transition-transform group-open/details:rotate-90" />
                                  </summary>
                                  <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                                      {typeof batch.errorSummary === 'string' 
                                        ? batch.errorSummary 
                                        : JSON.stringify(batch.errorSummary, null, 2)}
                                    </pre>
                                  </div>
                                </details>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {batch.status === 'PENDING' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    processMutation.mutate(batch.id);
                                  }}
                                  disabled={processMutation.isPending}
                                  className="h-8 w-8 p-0 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Play className="h-3 w-3 text-blue-600" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(batch.id);
                                }}
                                disabled={deleteMutation.isPending}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Requirements - Enhanced info card */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">File Requirements</h3>
            <p className="text-sm text-slate-600">Ensure your CSV files meet these requirements</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Required Format</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                    File format: CSV (.csv)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                    Maximum 500 files per upload batch
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                    Processing happens asynchronously
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Column Requirements</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Required: Date, Ticker, Close
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Optional: Open, High, Low, Volume, OpenInterest
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div>
                    Date formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
          </div>
        )}

        {/* Calculated Data Tab */}
        {activeTab === 'data' && (
          <CalculatedDataSection />
        )}

        {/* Enhanced Upload History Tab */}
        {activeTab === 'batches' && (
          <div className="space-y-8">
            {/* Upload History Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Upload History</h3>
                    <p className="text-sm text-slate-600">Complete history of all batch uploads and processing</p>
                  </div>
                  {batchesData?.batches?.length > 0 && (
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{batchesData.batches.length}</div>
                        <div className="text-xs text-slate-500">Total Batches</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="text-center">
                      <Loading size="lg" />
                      <p className="text-slate-500 text-sm mt-4">Loading upload history...</p>
                    </div>
                  </div>
                ) : batchesData?.batches?.length > 0 ? (
                  <div className="space-y-1">
                    {batchesData.batches.map((batch: any, index: number) => (
                      <div
                        key={batch.id}
                        className="group relative p-5 rounded-xl hover:bg-slate-50/50 transition-all duration-200 border border-transparent hover:border-slate-200/60"
                      >
                        {/* Timeline connector */}
                        {index < batchesData.batches.length - 1 && (
                          <div className="absolute left-9 top-16 w-px h-12 bg-slate-200"></div>
                        )}
                        
                        <div className="flex items-start gap-5">
                          {/* Enhanced Status Indicator */}
                          <div className="flex-shrink-0 mt-1">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center border-2 bg-white shadow-sm transition-all duration-200 group-hover:scale-105",
                              batch.status === 'COMPLETED' ? "border-emerald-200 bg-emerald-50" :
                              batch.status === 'FAILED' ? "border-red-200 bg-red-50" :
                              batch.status === 'PROCESSING' ? "border-blue-200 bg-blue-50" :
                              "border-amber-200 bg-amber-50"
                            )}>
                              {batch.status === 'COMPLETED' ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              ) : batch.status === 'FAILED' ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : batch.status === 'PROCESSING' ? (
                                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                            </div>
                          </div>

                          {/* Enhanced Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Batch Header */}
                                <div className="flex items-center gap-3 mb-3">
                                  <h4 className="text-lg font-semibold text-slate-900 truncate">
                                    {batch.name || 'Unnamed Batch'}
                                  </h4>
                                  <span className={cn(
                                    "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold",
                                    batch.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                    batch.status === 'FAILED' ? "bg-red-50 text-red-700 border border-red-200" :
                                    batch.status === 'PROCESSING' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                    "bg-amber-50 text-amber-700 border border-amber-200"
                                  )}>
                                    {batch.status.toLowerCase()}
                                  </span>
                                </div>

                                {/* Enhanced Metadata Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                      <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900">{batch.totalFiles}</div>
                                      <div className="text-xs text-slate-500">Files</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                      <Database className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900">{batch.totalRecordsProcessed?.toLocaleString() || 0}</div>
                                      <div className="text-xs text-slate-500">Records</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                      <Calendar className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900">{new Date(batch.createdAt).toLocaleDateString()}</div>
                                      <div className="text-xs text-slate-500">Created</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                      <Clock className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900">{new Date(batch.createdAt).toLocaleTimeString()}</div>
                                      <div className="text-xs text-slate-500">Time</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Enhanced Error Summary */}
                                {batch.errorSummary && (
                                  <details className="mt-4 group/details">
                                    <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                                      <XCircle className="h-4 w-4" />
                                      Processing errors detected ({batch.failedFiles} failed files)
                                      <ChevronRight className="h-3 w-3 transition-transform group-open/details:rotate-90 ml-auto" />
                                    </summary>
                                    <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                      <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono leading-relaxed">
                                        {typeof batch.errorSummary === 'string' 
                                          ? batch.errorSummary 
                                          : JSON.stringify(batch.errorSummary, null, 2)}
                                      </pre>
                                    </div>
                                  </details>
                                )}
                              </div>

                              {/* Enhanced Actions */}
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {batch.status === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => processMutation.mutate(batch.id)}
                                    disabled={processMutation.isPending}
                                    className="h-9 w-9 p-0 border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                                  >
                                    <Play className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(batch.id)}
                                  disabled={deleteMutation.isPending}
                                  className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <FileSpreadsheet className="h-10 w-10 text-slate-400" />
                    </div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-2">No upload history</h4>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                      Your batch upload history will appear here once you start processing CSV files.
                    </p>
                    <div className="inline-flex items-center gap-2 text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-lg">
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                      Switch to the Upload Data tab to get started
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

