'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import ZipFileUpload from './ZipFileUpload';
import DataViewer from './DataViewer';
import DirectoryTree from './DirectoryTree';

export interface ZipFileStructure {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: ZipFileStructure[];
  size?: number;
  lastModified?: Date;
}


interface ZipExplorerProps {
  className?: string;
}

export default function ZipExplorer({ className = '' }: ZipExplorerProps) {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipStructure, setZipStructure] = useState<ZipFileStructure | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [selectedTreePath, setSelectedTreePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseZipStructure = async (file: File): Promise<ZipFileStructure> => {
    const zip = await JSZip.loadAsync(file);
    const root: ZipFileStructure = {
      name: 'root',
      type: 'folder',
      path: '',
      children: []
    };

    // Debug: Log all files in the ZIP
    console.log('ZIP Files:', Object.keys(zip.files));

    const buildTree = (files: { [key: string]: JSZip.JSZipObject }, parent: ZipFileStructure) => {
      const folders = new Map<string, ZipFileStructure>();
      
      Object.entries(files).forEach(([path, file]) => {
        if (file.dir) return; // Skip directories, we'll create them from files
        
        const pathParts = path.split('/').filter(part => part.length > 0);
        let currentParent = parent;
        
        // Build folder structure
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderName = pathParts[i];
          const folderPath = pathParts.slice(0, i + 1).join('/');
          
          if (!folders.has(folderPath)) {
            const folder: ZipFileStructure = {
              name: folderName,
              type: 'folder',
              path: folderPath,
              children: []
            };
            folders.set(folderPath, folder);
            currentParent.children!.push(folder);
          }
          currentParent = folders.get(folderPath)!;
        }
        
        // Add file
        const fileName = pathParts[pathParts.length - 1];
        const fileNode: ZipFileStructure = {
          name: fileName,
          type: 'file',
          path: path,
          size: (file as any)._data?.uncompressedSize,
          lastModified: file.date
        };
        currentParent.children!.push(fileNode);
      });
    };

    buildTree(zip.files, root);
    
    // Debug: Log the parsed structure
    console.log('Parsed Structure:', root);
    
    return root;
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      setZipFile(file);
      const structure = await parseZipStructure(file);
      setZipStructure(structure);
      setSelectedTreePath('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse ZIP file');
    } finally {
      setIsLoading(false);
    }
  };

  const resetExplorer = () => {
    setZipFile(null);
    setZipStructure(null);
    setSelectedDataset(null);
    setSelectedTreePath('');
    setError(null);
  };

  const handleTreeNodeClick = (path: string) => {
    setSelectedTreePath(path);
    
    // Find the node in the structure
    const findNode = (node: ZipFileStructure, targetPath: string): ZipFileStructure | null => {
      if (node.path === targetPath) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    if (zipStructure) {
      const node = findNode(zipStructure, path);
      if (node) {
        // Check if this is an OpenGIN dataset
        const hasOpenGinData = node.children?.some(child => 
          child.type === 'file' && child.name === 'data.json'
        ) && node.children?.some(child => 
          child.type === 'file' && child.name === 'metadata.json'
        );

        console.log(`Clicked node: ${node.name}`, {
          path,
          hasOpenGinData,
          children: node.children?.map(c => ({ name: c.name, type: c.type })),
          willOpenDataset: hasOpenGinData
        });

        if (hasOpenGinData) {
          setSelectedDataset(path);
        }
        // For folders without OpenGIN data, we just highlight them in the tree
      }
    }
  };

  if (selectedDataset) {
    return (
      <div className={`w-full ${className}`}>
        <div className="mb-6">
          <button
            onClick={() => setSelectedDataset(null)}
            className="flex items-center text-blue-500 hover:text-blue-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Explorer
          </button>
        </div>
        <DataViewer 
          zipFile={zipFile!} 
          datasetPath={selectedDataset}
          onBack={() => setSelectedDataset(null)}
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {!zipFile ? (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">XploreData</h2>
            <p className="text-gray-300 text-lg mb-8">
              Upload a ZIP file generated by the batch system to explore hierarchical data categories and OpenGIN datasets
            </p>
          </div>
          <ZipFileUpload 
            onFileSelect={handleFileSelect}
            onError={setError}
            maxSize={100}
          />
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={resetExplorer}
                className="flex items-center text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
            
            <div className="text-sm text-gray-400">
              {zipFile.name}
            </div>
          </div>

          {/* Single-pane layout with directory tree */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left pane - Directory Tree */}
            <div className="lg:col-span-1">
              {zipStructure && (
                <DirectoryTree
                  structure={zipStructure}
                  onNodeClick={handleTreeNodeClick}
                  selectedPath={selectedTreePath}
                  className="h-[calc(100vh-200px)]"
                />
              )}
            </div>

            {/* Right pane - Content area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Processing ZIP file...</span>
                </div>
              )}

              {/* Content will be shown when a dataset is selected */}
              {!isLoading && !selectedDataset && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Select a Dataset</h3>
                  <p className="text-gray-400">Click on a dataset in the directory tree to view its contents.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
