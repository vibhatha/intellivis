'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';

interface DataViewerProps {
  zipFile: File;
  datasetPath: string;
  onBack: () => void;
}

interface DataFile {
  name: string;
  content: string;
  type: 'json' | 'csv' | 'xlsx' | 'other';
  size: number;
}

export default function DataViewer({ zipFile, datasetPath, onBack }: DataViewerProps) {
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);

  useEffect(() => {
    loadDataFiles();
  }, [zipFile, datasetPath]);

  const loadDataFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const files: DataFile[] = [];
      
      // Find all files in the dataset path
      Object.entries(zip.files).forEach(([path, file]) => {
        if (!file.dir && path.startsWith(datasetPath) && path !== datasetPath) {
          const fileName = path.split('/').pop() || '';
          const extension = fileName.split('.').pop()?.toLowerCase() || '';
          
          if (['json', 'csv', 'xlsx'].includes(extension)) {
            files.push({
              name: fileName,
              content: '', // Will be loaded on demand
              type: extension as 'json' | 'csv' | 'xlsx',
              size: (file as any)._data?.uncompressedSize || 0
            });
          }
        }
      });
      
      setDataFiles(files);
      
      // Auto-select first file if available
      if (files.length > 0) {
        await loadFileContent(files[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data files');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileContent = async (file: DataFile) => {
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const fullPath = `${datasetPath}/${file.name}`;
      const zipFileObj = zip.file(fullPath);
      
      if (!zipFileObj) {
        throw new Error(`File not found: ${fullPath}`);
      }
      
      const content = await zipFileObj.async('text');
      const updatedFile = { ...file, content };
      
      setDataFiles(prev => prev.map(f => f.name === file.name ? updatedFile : f));
      setSelectedFile(updatedFile);
      
      // Parse content based on file type
      parseFileContent(updatedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file content');
    }
  };

  const parseFileContent = (file: DataFile) => {
    try {
      let parsed: any = null;
      
      switch (file.type) {
        case 'json':
          parsed = JSON.parse(file.content);
          break;
        case 'csv':
          parsed = parseCSV(file.content);
          break;
        case 'xlsx':
          // For XLSX, we'd need a library like xlsx, but for now just show raw content
          parsed = { raw: file.content, type: 'xlsx' };
          break;
        default:
          parsed = { raw: file.content, type: 'other' };
      }
      
      setParsedData(parsed);
    } catch (err) {
      setError(`Failed to parse ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const parseCSV = (csvContent: string) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { rows: [], columns: [] };
    
    const rows = lines.map(line => {
      // Simple CSV parsing - in production, use a proper CSV parser
      return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
    
    return {
      columns: rows[0] || [],
      rows: rows.slice(1)
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'json':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'csv':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'xlsx':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-300">Loading data files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
        <button
          onClick={onBack}
          className="flex items-center text-blue-500 hover:text-blue-600 transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Explorer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center text-blue-500 hover:text-blue-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explorer
          </button>
          
          <h2 className="text-2xl font-bold text-white">Dataset Viewer</h2>
        </div>
        
        <div className="text-sm text-gray-400">
          {dataFiles.length} data file{dataFiles.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Data Files</h3>
          <div className="space-y-2">
            {dataFiles.map((file) => (
              <div
                key={file.name}
                onClick={() => loadFileContent(file)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedFile?.name === file.name
                    ? 'bg-blue-900/30 border-blue-500/50 text-blue-300'
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800/70 hover:border-gray-600/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-blue-400">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {file.type.toUpperCase()} • {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Content */}
        <div className="lg:col-span-2">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{selectedFile.name}</h3>
                <div className="text-sm text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
                <div className="bg-gray-800/50 px-4 py-2 border-b border-gray-700/50">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(selectedFile.type)}
                    <span className="text-sm font-medium text-gray-300">
                      {selectedFile.type.toUpperCase()} Content
                    </span>
                  </div>
                </div>
                
                <div className="p-4 max-h-96 overflow-auto">
                  {parsedData ? (
                    <DataTable data={parsedData} type={selectedFile.type} />
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Click on a file to view its content
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No File Selected</h3>
              <p className="text-gray-400">Select a data file from the list to view its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DataTableProps {
  data: any;
  type: string;
}

function DataTable({ data, type }: DataTableProps) {
  if (type === 'json') {
    return (
      <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  if (type === 'csv' && data.columns && data.rows) {
    return (
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              {data.columns.map((column: string, index: number) => (
                <th key={index} className="px-3 py-2 text-left text-gray-300 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 100).map((row: string[], rowIndex: number) => (
              <tr key={rowIndex} className="border-b border-gray-800 hover:bg-gray-800/30">
                {row.map((cell: string, cellIndex: number) => (
                  <td key={cellIndex} className="px-3 py-2 text-gray-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length > 100 && (
          <div className="text-center py-2 text-gray-500 text-sm">
            Showing first 100 rows of {data.rows.length} total rows
          </div>
        )}
      </div>
    );
  }

  if (type === 'xlsx' || type === 'other') {
    return (
      <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto">
        {data.raw || 'Content not available'}
      </pre>
    );
  }

  return (
    <div className="text-gray-400 text-sm">
      Unable to display this file type
    </div>
  );
}
