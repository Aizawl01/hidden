
import React from 'react';

interface GeneratedImagesProps {
  images: string[];
  originalImage: string;
  onReset: () => void;
}

const GeneratedImages: React.FC<GeneratedImagesProps> = ({ images, onReset, originalImage }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-6 font-sans w-full">
      <header className="text-center mb-8 w-full">
        <h1 className="text-5xl font-bold font-serif">
          Picture<span className="text-amber-400">Me</span>
        </h1>
        <p className="text-slate-400 mt-2">Your AI-generated photos are ready!</p>
      </header>
      
      <main className="w-full max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative group border-2 border-dashed border-slate-600 rounded-lg p-2">
            <img src={originalImage} alt="Original" className="w-full h-full object-cover rounded-md"/>
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-lg font-bold">Original</span>
            </div>
          </div>
          {images.map((image, index) => (
            <div key={index} className="relative group">
                <img src={image} alt={`Generated ${index + 1}`} className="w-full h-full object-cover rounded-lg shadow-lg"/>
                 <a 
                    href={image} 
                    download={`pictureme-generated-${index + 1}.png`} 
                    className="absolute bottom-2 right-2 bg-slate-900/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500"
                    title="Download Image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.293V3a1 1 0 112 0v8.293l1.293-1.586a1 1 0 111.414 1.414l-3 3.667a1 1 0 01-1.414 0l-3-3.667a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </a>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <button
            onClick={onReset}
            className="px-8 py-3 bg-amber-400 text-slate-900 font-bold rounded-lg shadow-lg transition-colors hover:bg-amber-300"
          >
            Create Another
          </button>
        </div>
      </main>
    </div>
  );
};

export default GeneratedImages;
