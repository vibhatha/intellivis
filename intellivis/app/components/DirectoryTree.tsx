'use client';

import { useState } from 'react';
import { ZipFileStructure } from './ZipExplorer';

interface DirectoryTreeProps {
  structure: ZipFileStructure;
  onNodeClick: (path: string) => void;
  selectedPath?: string;
  className?: string;
}

interface TreeNodeProps {
  node: ZipFileStructure;
  onNodeClick: (path: string) => void;
  selectedPath?: string;
  level: number;
}

function TreeNode({ node, onNodeClick, selectedPath, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;
  const isOpenGinDataset = node.children?.some(child => 
    child.type === 'file' && child.name === 'data.json'
  ) && node.children?.some(child => 
    child.type === 'file' && child.name === 'metadata.json'
  );

  // Debug: Log OpenGIN detection
  if (node.type === 'folder') {
    console.log(`Checking folder: ${node.name}`, {
      hasChildren,
      children: node.children?.map(c => ({ name: c.name, type: c.type })),
      isOpenGinDataset,
      path: node.path
    });
  }

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onNodeClick(node.path);
  };

  const getNodeIcon = () => {
    if (node.type === 'file') {
      if (node.name === 'data.json' || node.name === 'metadata.json') {
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      }
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    // Folder icons
    if (isOpenGinDataset) {
      return (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
      </svg>
    );
  };

  const getExpandIcon = () => {
    if (!hasChildren) return null;
    
    return (
      <svg 
        className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    );
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-700/50 transition-colors duration-200 ${
          isSelected ? 'bg-blue-900/30 text-blue-300' : 'text-gray-300 hover:text-white'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center space-x-1">
          {getExpandIcon()}
          {getNodeIcon()}
          <span className="text-sm font-medium truncate">{node.name}</span>
          {isOpenGinDataset && (
            <span className="text-xs text-green-400 ml-1">OpenGIN</span>
          )}
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child, index) => (
            <TreeNode
              key={`${child.path}-${index}`}
              node={child}
              onNodeClick={onNodeClick}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectoryTree({ structure, onNodeClick, selectedPath, className = '' }: DirectoryTreeProps) {
  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Directory Structure</h3>
        <div className="text-xs text-gray-400">
          {structure.children?.length || 0} items
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {structure.children?.map((child, index) => (
          <TreeNode
            key={`${child.path}-${index}`}
            node={child}
            onNodeClick={onNodeClick}
            selectedPath={selectedPath}
            level={0}
          />
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span>Category folder</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span>OpenGIN dataset</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Data files</span>
          </div>
        </div>
      </div>
    </div>
  );
}
