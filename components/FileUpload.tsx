import React, { useCallback, useState } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  file: File | null;
}

const acceptedTypes = ".png, .jpg, .jpeg, .webp, .ttf, .otf, .woff, .woff2";

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, file }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        tabIndex={0}
        className={`relative flex flex-col items-center justify-center w-full min-h-40 p-4 rounded-lg cursor-pointer transition-all duration-300 paper-upload-box ${isDragging ? 'border-accent' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col items-center justify-center p-6 text-center">
            <UploadIcon className="w-10 h-10 mb-4 text-text-secondary opacity-60" />
            <p className="mb-2 text-sm text-text-dark">
            <span className="font-semibold text-accent">Click to upload</span>, drag and drop, or paste an image
            </p>
            <p className="text-xs text-text-secondary">Font files or images (PNG, JPG)</p>
        </div>
        <input ref={fileInputRef} id="file-upload" type="file" className="hidden" accept={acceptedTypes} onChange={handleFileChange} />
        {file && (
             <div className="absolute bottom-2 left-2 right-2 bg-teal-dark/90 backdrop-blur-sm p-2 rounded-md text-center text-xs text-accent truncate border border-teal-medium">
                {file.name}
            </div>
        )}
      </label>
    </div>
  );
};

export default FileUpload;
