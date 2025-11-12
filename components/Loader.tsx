
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-10">
      <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-accent"></div>
      <p className="mt-4 text-lg text-secondary">AI is analyzing your font...</p>
    </div>
  );
};

export default Loader;