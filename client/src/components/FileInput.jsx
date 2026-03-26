import { useState } from 'react';

const FileInput = ({ onFilesSelected }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      try {
        onFilesSelected(files);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        onFilesSelected(files);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          id="file-input"
          data-testid="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <p className="text-gray-700 font-medium">Drop files here or click to select</p>
          <p className="text-sm text-gray-500 mt-1">Multiple files supported</p>
        </label>
      </div>
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileInput;
