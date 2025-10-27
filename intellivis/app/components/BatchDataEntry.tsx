'use client';

import React, { useState } from 'react';
import JSZip from 'jszip';
import FileUpload from './FileUpload';
import MetadataForm from './MetadataForm';
import { OpenGinProcessor, ProcessedFileData, OpenGinTabularFormat, OpenGinMetadata, Category } from '../utils/openGinProcessor';
import { ZipGenerator } from '../utils/zipGenerator';

export interface DatasetEntry {
  id: string;
  fileName: string;
  datasetName: string;
  processedData: ProcessedFileData;
  metadata: OpenGinMetadata;
  openGinFormat?: OpenGinTabularFormat;
}

interface BatchDataEntryProps {
  className?: string;
}

export default function BatchDataEntry({ className = '' }: BatchDataEntryProps) {
  const [datasets, setDatasets] = useState<DatasetEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentProcessedData, setCurrentProcessedData] = useState<ProcessedFileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const processedData = await OpenGinProcessor.processFile(file);
      setCurrentFile(file);
      setCurrentProcessedData(processedData);
      setShowMetadataForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMetadataSubmit = (metadata: OpenGinMetadata) => {
    if (!currentProcessedData || !currentFile) return;

    const datasetName = currentFile.name.replace(/\.[^/.]+$/, '');
    const openGinFormat = OpenGinProcessor.convertToOpenGinFormat(
      currentProcessedData,
      datasetName,
      metadata
    );

    const newEntry: DatasetEntry = {
      id: `dataset-${Date.now()}`,
      fileName: currentFile.name,
      datasetName: openGinFormat.datasetName,
      processedData: currentProcessedData,
      metadata,
      openGinFormat
    };

    // Debug: Log the metadata being added
    console.log('Adding dataset with metadata:', {
      fileName: currentFile.name,
      categories: metadata.categories,
      metadata: metadata
    });

    setDatasets([...datasets, newEntry]);
    setShowMetadataForm(false);
    setCurrentFile(null);
    setCurrentProcessedData(null);
    setError(null);
  };

  const handleMetadataCancel = () => {
    setShowMetadataForm(false);
    setCurrentFile(null);
    setCurrentProcessedData(null);
  };

  const removeDataset = (id: string) => {
    setDatasets(datasets.filter(d => d.id !== id));
  };

  const downloadAllAsZip = async () => {
    if (datasets.length === 0) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Create a zip with all datasets organized by their individual categories
      const zip = new JSZip();
      
      for (const dataset of datasets) {
        // Debug: Log each dataset's categories
        console.log(`Processing dataset: ${dataset.fileName}`, {
          categories: dataset.metadata.categories,
          categoryPath: getCategoryPathFromMetadata(dataset.metadata.categories)
        });

        // Determine folder path based on dataset's own categories
        let folderPath = '';
        
        if (dataset.metadata.categories && dataset.metadata.categories.length > 0) {
          const categoryPath = getCategoryPathFromMetadata(dataset.metadata.categories);
          if (categoryPath) {
            folderPath = categoryPath + '/';
          }
        }
        
        // If no categories defined, put in "uncategorized" folder
        if (!folderPath) {
          folderPath = 'uncategorized/';
        }
        
        // Sanitize folder path
        const sanitizedPath = folderPath.split('/').map(part => 
          ZipGenerator.sanitizeFolderName(part)
        ).join('/');
        
        console.log(`Final folder path for ${dataset.fileName}: ${sanitizedPath}`);
        
        // Create the folder structure
        const folder = zip.folder(sanitizedPath);
        
        if (folder) {
          // Add data.json
          folder.file('data.json', JSON.stringify({
            columns: dataset.openGinFormat!.columns,
            rows: dataset.openGinFormat!.rows
          }, null, 2));
          
          // Add metadata.json
          folder.file('metadata.json', JSON.stringify({
            datasetName: dataset.openGinFormat!.datasetName,
            metadata: dataset.metadata
          }, null, 2));
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      
      const downloadFilename = `datasets-${new Date().toISOString().split('T')[0]}.zip`;
      ZipGenerator.downloadZip(blob, downloadFilename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ZIP file');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryPathFromMetadata = (categories: Category[]): string => {
    const pathParts: string[] = [];
    
    const buildPath = (cats: Category[]) => {
      for (const category of cats) {
        if (category.name) {
          pathParts.push(category.name);
          if (category.subcategories && category.subcategories.length > 0) {
            buildPath(category.subcategories);
            break; // Only take the first path
          }
        }
      }
    };
    
    buildPath(categories);
    return pathParts.join('/');
  };

  const getTotalRows = () => {
    return datasets.reduce((sum, d) => sum + d.processedData.rowCount, 0);
  };

  const getTotalColumns = () => {
    return datasets.length > 0 ? datasets[0].processedData.columns.length : 0;
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Batch Data Entry</h2>
            <p className="text-gray-400">Add multiple datasets and download them as a single ZIP file</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Total Datasets</div>
            <div className="text-3xl font-bold text-blue-400">{datasets.length}</div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          Add New Dataset
        </h3>
        <FileUpload onFileSelect={handleFileSelect} />
        
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-300">Processing file...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Datasets List */}
      {datasets.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">
              Datasets ({datasets.length})
            </h3>
            <button
              onClick={downloadAllAsZip}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download All as ZIP</span>
            </button>
          </div>

          <div className="grid gap-4">
            {datasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onRemove={() => removeDataset(dataset.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {datasets.length === 0 && (
        <div className="text-center py-12 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl">
          <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Datasets Added Yet</h3>
          <p className="text-gray-400">Upload files above to start adding datasets to your batch</p>
        </div>
      )}

      {/* Metadata Form Modal */}
      <MetadataForm
        onSubmit={handleMetadataSubmit}
        onCancel={handleMetadataCancel}
        isVisible={showMetadataForm}
      />
    </div>
  );
}

interface DatasetCardProps {
  dataset: DatasetEntry;
  onRemove: () => void;
}

function DatasetCard({ dataset, onRemove }: DatasetCardProps) {
  const getCategoryPathString = (categories: Category[]): string => {
    if (!categories || categories.length === 0) return 'No categories';
    
    const pathParts: string[] = [];
    
    const buildPath = (cats: Category[]) => {
      for (const category of cats) {
        if (category.name) {
          pathParts.push(category.name);
          if (category.subcategories && category.subcategories.length > 0) {
            buildPath(category.subcategories);
            break; // Only take the first path
          }
        }
      }
    };
    
    buildPath(categories);
    return pathParts.join(' / ');
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-5 hover:bg-gray-900/70 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white">{dataset.datasetName}</h4>
              <p className="text-sm text-gray-400">{dataset.fileName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <div className="text-gray-500">Columns</div>
              <div className="text-white font-semibold">{dataset.processedData.columns.length}</div>
            </div>
            <div>
              <div className="text-gray-500">Rows</div>
              <div className="text-white font-semibold">{dataset.processedData.rowCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Data Source</div>
              <div className="text-white font-semibold truncate">{dataset.metadata.dataSource}</div>
            </div>
            <div>
              <div className="text-gray-500">Entry Person</div>
              <div className="text-white font-semibold">{dataset.metadata.dataEntryPerson}</div>
            </div>
          </div>

          {dataset.metadata.description && (
            <div className="mt-3 text-sm text-gray-400 line-clamp-2">
              {dataset.metadata.description}
            </div>
          )}

          {/* Category Display */}
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-300 mb-2">
              Categories
            </div>
            <div className="text-sm text-blue-400">
              {getCategoryPathString(dataset.metadata.categories)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Will be placed in: {getCategoryPathString(dataset.metadata.categories) || 'uncategorized'}
            </div>
          </div>
        </div>

        <button
          onClick={onRemove}
          className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
