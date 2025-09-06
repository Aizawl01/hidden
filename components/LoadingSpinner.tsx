
import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
    messages: string[];
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ messages }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
        }, 3000); // Change message every 3 seconds

        return () => clearInterval(interval);
    }, [messages.length, messages]);

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-amber-400 border-solid border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-lg mt-6 text-center px-4 transition-opacity duration-500 ease-in-out">
                {messages[currentMessageIndex]}
            </p>
        </div>
    );
};

export default LoadingSpinner;
