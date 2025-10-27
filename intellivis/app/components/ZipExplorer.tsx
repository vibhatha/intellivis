'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import ZipFileUpload from './ZipFileUpload';
import DataViewer from './DataViewer';

export interface ZipFileStructure {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: ZipFileStructure[];
  size?: number;
  lastModified?: Date;
}

export interface CategoryTile {
  id: string;
  name: string;
  type: 'category' | 'subcategory' | 'dataset';
  path: string;
  description?: string;
  fileCount?: number;
  children?: CategoryTile[];
  dataFiles?: string[];
}

interface ZipExplorerProps {
  className?: string;
}

export default function ZipExplorer({ className = '' }: ZipExplorerProps) {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipStructure, setZipStructure] = useState<ZipFileStructure | null>(null);
  const [categoryTiles, setCategoryTiles] = useState<CategoryTile[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
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
    return root;
  };

  const generateCategoryTiles = (structure: ZipFileStructure): CategoryTile[] => {
    if (!structure.children) return [];

    return structure.children
      .filter(child => child.type === 'folder')
      .map(folder => {
        const dataFiles = folder.children
          ?.filter(child => child.type === 'file' && 
            (child.name.endsWith('.json') || child.name.endsWith('.csv') || child.name.endsWith('.xlsx')))
          .map(file => file.name) || [];

        const subcategories = folder.children
          ?.filter(child => child.type === 'folder')
          .map(subfolder => ({
            id: `${folder.name}-${subfolder.name}`,
            name: subfolder.name,
            type: 'subcategory' as const,
            path: subfolder.path,
            description: `Contains ${subfolder.children?.length || 0} items`,
            fileCount: subfolder.children?.filter(c => c.type === 'file').length || 0,
            dataFiles: subfolder.children
              ?.filter(child => child.type === 'file' && 
                (child.name.endsWith('.json') || child.name.endsWith('.csv') || child.name.endsWith('.xlsx')))
              .map(file => file.name) || []
          })) || [];

        return {
          id: folder.name,
          name: folder.name,
          type: 'category',
          path: folder.path,
          description: `Contains ${folder.children?.length || 0} items`,
          fileCount: folder.children?.filter(c => c.type === 'file').length || 0,
          children: subcategories,
          dataFiles: dataFiles
        };
      });
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      setZipFile(file);
      const structure = await parseZipStructure(file);
      setZipStructure(structure);
      
      const tiles = generateCategoryTiles(structure);
      setCategoryTiles(tiles);
      setCurrentPath([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse ZIP file');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPath = (path: string[], tiles: CategoryTile[]) => {
    setCurrentPath(path);
    
    if (path.length === 0) {
      setCategoryTiles(generateCategoryTiles(zipStructure!));
    } else {
      // Navigate to subcategory
      const currentTiles = path.reduce((current, pathSegment) => {
        const tile = current.find(t => t.name === pathSegment);
        return tile?.children || [];
      }, tiles);
      
      setCategoryTiles(currentTiles);
    }
  };

  const handleTileClick = (tile: CategoryTile) => {
    if (tile.type === 'dataset' || tile.dataFiles?.length) {
      // This is a dataset with data files
      setSelectedDataset(tile.path);
    } else if (tile.children && tile.children.length > 0) {
      // Navigate to subcategory
      const newPath = [...currentPath, tile.name];
      navigateToPath(newPath, generateCategoryTiles(zipStructure!));
    }
  };

  const goBack = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      navigateToPath(newPath, generateCategoryTiles(zipStructure!));
    }
  };

  const resetExplorer = () => {
    setZipFile(null);
    setZipStructure(null);
    setCategoryTiles([]);
    setCurrentPath([]);
    setSelectedDataset(null);
    setError(null);
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
              Upload a ZIP file to explore hierarchical data categories and datasets
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
              
              {currentPath.length > 0 && (
                <button
                  onClick={goBack}
                  className="flex items-center text-blue-500 hover:text-blue-600 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-400">
              {zipFile.name} • {currentPath.length > 0 ? currentPath.join(' / ') : 'Root'}
            </div>
          </div>

          {/* Breadcrumb */}
          {currentPath.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Root</span>
              {currentPath.map((segment, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{segment}</span>
                </div>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-300">Processing ZIP file...</span>
            </div>
          )}

          {/* Tiles Grid */}
          {!isLoading && categoryTiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryTiles.map((tile) => (
                <CategoryTile
                  key={tile.id}
                  tile={tile}
                  onClick={() => handleTileClick(tile)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && categoryTiles.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Categories Found</h3>
              <p className="text-gray-400">This ZIP file doesn't contain any organized categories.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CategoryTileProps {
  tile: CategoryTile;
  onClick: () => void;
}

function CategoryTile({ tile, onClick }: CategoryTileProps) {
  const getTileIcon = () => {
    if (tile.type === 'dataset' || tile.dataFiles?.length) {
      return (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
      </svg>
    );
  };

  const getTileColor = () => {
    if (tile.type === 'dataset' || tile.dataFiles?.length) {
      return 'from-green-500 to-emerald-500';
    }
    return 'from-blue-500 to-cyan-500';
  };

  return (
    <div
      onClick={onClick}
      className="group bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/70 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer"
    >
      <div className={`w-16 h-16 bg-gradient-to-r ${getTileColor()} rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}>
        {getTileIcon()}
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300 text-center">
        {tile.name}
      </h3>
      
      {tile.description && (
        <p className="text-gray-400 text-sm text-center group-hover:text-gray-300 transition-colors duration-300 mb-3">
          {tile.description}
        </p>
      )}
      
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
        {tile.fileCount !== undefined && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{tile.fileCount} files</span>
          </div>
        )}
        
        {tile.children && tile.children.length > 0 && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span>{tile.children.length} subcategories</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors duration-300">
        <span className="text-sm font-medium">
          {tile.type === 'dataset' || tile.dataFiles?.length ? 'View Data' : 'Explore'}
        </span>
        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
