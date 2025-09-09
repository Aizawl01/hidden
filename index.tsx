import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

// IMPORTANT: Your API key is now included in this file.
// Be aware of the security risks of exposing an API key in client-side code.
// For production, it's highly recommended to move API calls to a secure backend.
const GEMINI_API_KEY = "AIzaSyC4hkmqihimopHTQBZ8sZa-zbq6ZtRnnms";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });


declare const JSZip: any;

// --- Helper Functions (don't require AI instance) ---

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const cropImage = (imageUrl: string, aspectRatio: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context not available"));

        let sourceX, sourceY, sourceWidth, sourceHeight;
        const { width: originalWidth, height: originalHeight } = img;
        const originalAspectRatio = originalWidth / originalHeight;

        const [targetW, targetH] = aspectRatio.split(':').map(Number);
        const targetAspectRatio = targetW / targetH;

        if (originalAspectRatio > targetAspectRatio) {
            sourceHeight = originalHeight;
            sourceWidth = originalHeight * targetAspectRatio;
            sourceX = (originalWidth - sourceWidth) / 2;
            sourceY = 0;
        } else {
            sourceWidth = originalWidth;
            sourceHeight = originalWidth / targetAspectRatio;
            sourceY = (originalHeight - sourceHeight) / 2;
            sourceX = 0;
        }
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
});

const addWatermark = (imageUrl: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context not available for watermarking"));

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Watermark style
        const padding = img.width * 0.025;
        const fontSize = Math.max(12, Math.floor(img.width * 0.035));
        ctx.font = `600 ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Add a subtle shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText('[IG : @KHIANGTE.VILLAIN]', canvas.width - padding, canvas.height - padding);
        
        resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
});


const createSingleFramedImage = (imageUrl: string, cropRatio: string, labelText: string | null = null): Promise<string> => new Promise(async (resolve, reject) => {
    try {
        const croppedImgUrl = await cropImage(imageUrl, cropRatio);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = croppedImgUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Canvas context not available"));

            const hasLabel = !!labelText;
            const sidePadding = img.width * 0.04;
            const topPadding = img.width * 0.04;
            let bottomPadding = hasLabel ? img.width * 0.24 : img.width * 0.18;
            
            canvas.width = img.width + sidePadding * 2;
            canvas.height = img.height + topPadding + bottomPadding;

            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, sidePadding, topPadding);

            if (hasLabel) {
                 const labelFontSize = Math.max(24, Math.floor(img.width * 0.08));
                 ctx.font = `700 ${labelFontSize}px Orbitron, sans-serif`;
                 ctx.fillStyle = "#67e8f9"; // cyan-400
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(labelText.toUpperCase(), canvas.width / 2, img.height + topPadding + (bottomPadding - img.width * 0.1) / 2);
            }

            const fontSize = Math.max(12, Math.floor(img.width * 0.05));
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("Made with Gemini", canvas.width / 2, canvas.height - (img.width * 0.11));

            const nanoFontSize = Math.max(8, Math.floor(img.width * 0.035));
            ctx.font = `600 ${nanoFontSize}px Inter, sans-serif`;
            ctx.fillText("Khiangtevillain Nano-banana", canvas.width / 2, canvas.height - (img.width * 0.05));

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
    } catch(err) {
        reject(err);
    }
});


const getModelInstruction = (template: string, prompt: { id: string; base: string; }, options: any) => {
    const { headshotExpression, headshotPose, currentAlbumStyle, hairColors, lookbookStyle, customLookbookStyle, celebrityName, keychainText } = options;
    const baseInstruction = "The highest priority is to maintain the exact facial features, likeness, perceived gender, and composition of the person in the provided reference photo. Do not alter the person's core facial structure.";

    switch (template) {
        case 'decades':
            return `${baseInstruction} Change the person's hair, clothing, accessories, and the photo's background to match the style of the ${prompt.id}.`;
        case 'impossibleSelfies':
            return `${baseInstruction} Place the person into the following scene, changing their clothing, hair, and the background to match: ${prompt.base}.`;
        case 'hairStyler': {
            let instruction = `${baseInstruction} Style the person's hair to be a perfect example of ${prompt.base}. If the person's hair already has this style, enhance and perfect it. Do not alter the person's clothing or the background.`;
            if (['Short', 'Medium', 'Long'].includes(prompt.id)) instruction += " Maintain the person's original hair texture (e.g., straight, wavy, curly).";
            if (hairColors && hairColors.length > 0) {
                if (hairColors.length === 1) instruction += ` The hair color should be ${hairColors[0]}.`;
                else if (hairColors.length === 2) instruction += ` The hair should be a mix of two colors: ${hairColors[0]} and ${hairColors[1]}.`;
            }
            return instruction;
        }
        case 'headshots': {
            const poseInstruction = headshotPose === 'Forward' ? 'facing forward towards the camera' : 'posed at a slight angle to the camera';
            return `${baseInstruction} Transform the image into a professional headshot. The person should be ${poseInstruction} with a "${headshotExpression}" expression. They should be ${prompt.base}. Please maintain the original hairstyle from the photo. The background should be a clean, neutral, out-of-focus studio background (like light gray, beige, or white).`;
        }
        case 'eightiesMall':
            return `${baseInstruction} Transform the image into a photo from a single 1980s mall photoshoot. The overall style for the entire photoshoot is: "${currentAlbumStyle}". For this specific photo, the person should be in ${prompt.base}. The person's hair and clothing should be 80s style and be consistent across all photos in this set. The background and lighting must also match the overall style for every photo.`;
        case 'styleLookbook': {
            const finalStyle = lookbookStyle === 'Other' ? customLookbookStyle : lookbookStyle;
            return `${baseInstruction} Transform the image into a high-fashion lookbook photo. The overall fashion style is "${finalStyle}". For this photo, create a unique, stylish outfit that fits the style, and place the person in ${prompt.base} in a suitable, fashionable setting. Hair and makeup should complement the style. Each photo in the lookbook should feature a different outfit.`;
        }
        case 'figurines':
            return `${baseInstruction} Transform the person into a miniature figurine based on the following description, placing it in a realistic environment: ${prompt.base}. The final image should look like a real photograph of a physical object.`;
        case 'mizoAttire':
             return `${baseInstruction} Clothe the person in a traditional Mizo garment, specifically ${prompt.base}. The background should be a natural, scenic view of the Mizo hills. The final image should be a respectful and authentic portrait.`;
        case 'photoRestoration':
            return `You are a professional photo restoration expert. ${baseInstruction} Based on the user's request, perform the following task on the provided photo: "${prompt.base}". Do not add new elements or drastically alter the original composition. The goal is to restore and enhance, not to create something new.`;
        case 'pixarStyle':
            return `${baseInstruction} Transform the person into an expressive 3D character in the iconic style of Pixar animation. The character should have exaggerated but appealing features, soft lighting, and detailed textures. Place this character in the following scene: ${prompt.base}`;
        case 'celebrity': {
            if (!celebrityName) return `${baseInstruction}`;
            const finalPrompt = prompt.base.replace('{celebrity}', celebrityName);
            if (['Photobomb', 'Side-by-Side'].includes(prompt.id)) {
                return `${baseInstruction} Modify the original photo by following this instruction: "${finalPrompt}". The celebrity should look realistic and be integrated seamlessly. It is crucial to not change the person from the original photo, their pose, or their clothing.`;
            }
            return `${baseInstruction} Place the person from the photo into the following scene: ${finalPrompt}. The celebrity should look realistic and be interacting naturally with the person from the photo. Match the lighting and style of a real photograph.`;
        }
        case 'keychainCreator': {
            const textLabel = keychainText && keychainText.trim() !== '' ? keychainText.trim() : "KhiangteVillain";
            return `${baseInstruction} Create a 9:16 ultra-realistic product photograph with soft studio lighting and glossy highlights. The photo should feature a realistic action figure keychain of the person from the uploaded image, designed with lifelike details and natural proportions. The figure must have a soft, cheerful expression, a realistic face sculpt, and a premium collectible look. The keychain strap should be a bright color that complements the character's clothing and feature extra bold white text that reads "${textLabel}". A realistic human hand should be holding the keychain ring, with fingers gently pinching it, captured sharply in focus. The background must be softly blurred with inside shop of the key chain interior lighting, cinematic bokeh, and a professional product showcase aesthetic.`;
        }
        default:
            return `Create an image based on the reference photo and this prompt: ${prompt.base}`;
    }
};

// --- Icons ---

const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>;
const IconOptions = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const IconCamera = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;
const IconInstagram = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664 4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.802C9.042 3.965 8.72 3.978 7.474 4.034c-2.43.111-3.64 1.317-3.75 3.75-.056 1.246-.068 1.568-.068 4.216s.012 2.97.068 4.216c.11 2.43 1.317 3.64 3.75 3.75 1.246.056 1.568.068 4.216.068s2.97-.012 4.216-.068c2.43-.11 3.64-1.317 3.75-3.75.056-1.246.068-1.568-.068-4.216s-.012-2.97-.068-4.216c-.11-2.43-1.317-3.64-3.75-3.75-1.246-.056-1.568-.068-4.216-.068zm0 5.438c-2.273 0-4.106 1.833-4.106 4.106s1.833 4.106 4.106 4.106 4.106-1.833 4.106-4.106-1.833-4.106-4.106-4.106zm0 6.55c-1.348 0-2.444-1.096-2.444-2.444s1.096-2.444 2.444-2.444 2.444 1.096 2.444 2.444-1.096 2.444-2.444 2.444zM16.949 6.05a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"></path></svg>;
const IconYouTube = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>;

// --- React Components ---

const Button: React.FC<{ children: React.ReactNode, onClick?: React.MouseEventHandler<HTMLButtonElement>, disabled?: boolean, primary?: boolean, className?: string }> = ({ children, onClick, disabled, primary = false, className = '' }) => {
    const baseClass = "px-6 py-2 rounded-md font-semibold tracking-wider uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
    const themeClass = primary 
        ? "bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-600/30 border border-pink-500" 
        : "bg-transparent border border-cyan-400/50 text-cyan-300 hover:bg-cyan-900/50 hover:text-white";
    
    return <button onClick={onClick} disabled={disabled} className={`${baseClass} ${themeClass} ${className}`}>{children}</button>;
};

const PhotoDisplay: React.FC<{ era: string, imageUrl: string, onDownload: (url: string, era: string, ratio: string) => void, onRegenerate: () => void, isPolaroid?: boolean, index?: number, showLabel?: boolean }> = ({ era, imageUrl, onDownload, onRegenerate, isPolaroid = true, index=0, showLabel = true }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const rotation = useMemo(() => isPolaroid ? ['rotate-1', '-rotate-1', 'rotate-0.5', '-rotate-1.5'][index % 4] : 'rotate-0', [index, isPolaroid]);

    const containerClass = isPolaroid
            ? `relative group bg-slate-900 p-3 pb-12 shadow-xl border border-slate-700 transform transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/30 hover:scale-105 hover:border-pink-500 ${rotation}`
            : 'relative group pb-4 bg-gray-900 rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-105';
    
    const textClass = isPolaroid
        ? 'text-center mt-4 font-orbitron text-2xl text-cyan-400 uppercase absolute bottom-3 left-0 right-0'
        : 'text-center mt-3 text-lg font-semibold text-gray-300 px-3';

    return (
        <div className={`${containerClass} animate-fade-in-up`}>
            <div className={isPolaroid ? 'aspect-square bg-slate-800' : 'rounded-t-xl overflow-hidden'}>
                <img src={imageUrl} alt={`You in ${era}`} className={`w-full ${isPolaroid ? 'h-full object-cover' : 'h-auto'}`} />
            </div>
            {showLabel && <p className={textClass}>{era}</p>}

            <div className="absolute top-3 right-3 z-10" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm shadow-lg" aria-label="Options"><IconOptions /></button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-12 mt-2 w-48 origin-top-right bg-black/80 backdrop-blur-md rounded-lg shadow-2xl ring-1 ring-white/10 text-white text-sm flex flex-col p-1 animate-fade-in">
                        <span className="w-full text-left px-3 pt-2 pb-1 text-xs text-gray-500 uppercase tracking-wider">Actions</span>
                        <button onClick={() => { onRegenerate(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-pink-500/20 rounded-md transition-colors">Regenerate</button>
                        <div className="my-1 h-px bg-white/10"></div>
                        <span className="w-full text-left px-3 pt-1 pb-1 text-xs text-gray-500 uppercase tracking-wider">Download</span>
                        <button onClick={() => { onDownload(imageUrl, era, '1:1'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-pink-500/20 rounded-md transition-colors">Square (1:1)</button>
                        <button onClick={() => { onDownload(imageUrl, era, '9:16'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-pink-500/20 rounded-md transition-colors">Portrait (9:16)</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => <div className={`animate-pulse bg-slate-800 ${className}`}></div>;

const LoadingCard: React.FC<{ era: string, isPolaroid?: boolean, showLabel?: boolean }> = ({ era, isPolaroid = true, showLabel = true }) => {
    return (
        <div className={isPolaroid ? 'relative bg-slate-900 p-3 pb-12 shadow-md border border-slate-700' : 'pb-4 bg-gray-900 rounded-xl shadow-md'}>
            <SkeletonLoader className={isPolaroid ? 'aspect-square' : 'aspect-[3/4] rounded-t-xl'} />
            {showLabel && (isPolaroid ? <div className="absolute bottom-3 left-0 right-0 flex justify-center"><SkeletonLoader className="h-6 w-3/4 rounded-md bg-slate-700" /></div> : <div className="mt-3 flex justify-center"><SkeletonLoader className="h-5 w-1/2 rounded-md" /></div>)}
            <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500"></div></div>
        </div>
    );
};

const ErrorCard: React.FC<{ era: string, isPolaroid?: boolean, onRegenerate: () => void, showLabel?: boolean }> = ({ era, isPolaroid = true, onRegenerate, showLabel = true }) => {
    return (
        <div className={`relative transition-all duration-500 ease-in-out group ${isPolaroid ? 'relative group bg-slate-900 p-3 pb-12 shadow-md border border-red-500/30' : 'pb-4 bg-gray-900 rounded-xl shadow-md'}`}>
            <div className={`flex flex-col items-center justify-center text-center p-4 ${isPolaroid ? 'aspect-square bg-slate-800/50 border-2 border-dashed border-red-500/50' : 'rounded-t-xl bg-gray-800 border-2 border-dashed border-red-500/50 aspect-[3/4]'}`}>
                <p className="text-red-400 font-medium mb-4">Generation failed</p>
                {onRegenerate && <Button onClick={onRegenerate} primary>Retry</Button>}
            </div>
            {showLabel && <p className={isPolaroid ? 'text-center mt-4 font-orbitron text-2xl uppercase text-red-400/70 absolute bottom-3 left-0 right-0' : 'text-center mt-3 text-lg font-semibold text-gray-300 px-3'}>{era}</p>}
        </div>
    );
};

const ErrorNotification: React.FC<{ message: string | null, onDismiss: () => void }> = ({ message, onDismiss }) => {
    if (!message) return null;
    return (
        <div className="fixed top-5 left-1/2 z-50 w-full max-w-md p-4 bg-slate-900 border border-pink-500/50 text-gray-300 rounded-lg shadow-2xl flex items-center justify-between animate-fade-in-down" style={{ transform: 'translateX(-50%)' }}>
            <span>{message}</span>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-slate-800 transition-colors ml-4"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
    );
};

const CameraModal: React.FC<{ isOpen: boolean, onClose: () => void, onCapture: (data: string) => void }> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    const startCamera = useCallback(async () => {
        if (videoRef.current) {
            setCameraError(null);
            try {
                stopCamera();
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1024 }, height: { ideal: 1024 }, facingMode: 'user' } });
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            } catch (err) {
                setCameraError("Camera access denied. Please allow camera access in your browser settings.");
            }
        }
    }, [stopCamera]);

    useEffect(() => {
        if (isOpen && !capturedImage) startCamera(); else stopCamera();
        return () => stopCamera();
    }, [isOpen, capturedImage, startCamera, stopCamera]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const { videoWidth, videoHeight } = videoRef.current;
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
            const context = canvasRef.current.getContext('2d');
            if (context) {
              context.scale(-1, 1);
              context.drawImage(videoRef.current, -videoWidth, 0, videoWidth, videoHeight);
              setCapturedImage(canvasRef.current.toDataURL('image/png'));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
             <div className="bg-slate-900 rounded-2xl p-6 border border-cyan-500/50 shadow-2xl w-full max-w-2xl text-center relative animate-fade-in">
                <h3 className="text-2xl font-semibold mb-4 text-white font-orbitron">CAMERA</h3>
                <div className="aspect-square bg-black rounded-lg overflow-hidden relative mb-4 flex items-center justify-center">
                    {cameraError ? <div className="p-4 text-red-400">{cameraError}</div> : (
                        <>
                            {capturedImage ? <img src={capturedImage} alt="Captured preview" className="w-full h-full object-cover" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100"></video>}
                        </>
                    )}
                </div>

                <div className="flex justify-center gap-4">
                    {capturedImage ? (
                        <>
                            <Button onClick={() => setCapturedImage(null)}>Retake</Button>
                            <Button onClick={() => { if(capturedImage) { onCapture(capturedImage); onClose(); } }} primary>Use Photo</Button>
                        </>
                    ) : <button onClick={handleCapture} disabled={!!cameraError} className="w-20 h-20 rounded-full bg-white border-4 border-slate-600 focus:outline-none focus:ring-4 focus:ring-pink-500 transition-all hover:border-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"></button>}
                </div>
                
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/70 text-white hover:bg-slate-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </div>
    );
};

const RadioPill: React.FC<{name: string, value: string, label: string, checked: boolean, onChange: React.ChangeEventHandler<HTMLInputElement>}> = ({ name, value, label, checked, onChange }) => (
    <label className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors font-semibold ${checked ? 'bg-pink-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
        <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="hidden" />
        {label}
    </label>
);

const TemplateCard: React.FC<{id: string, name: string, icon: string, description: string, isSelected: boolean, onSelect: (id: string) => void}> = ({ id, name, icon, description, isSelected, onSelect }) => (
    <div onClick={() => onSelect(id)} className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 shadow-lg ${isSelected ? 'border-pink-500 bg-pink-900/40 ring-2 ring-pink-500 shadow-lg shadow-pink-500/40' : 'border-slate-700 bg-slate-900 hover:border-cyan-400'}`}>
        <div className="text-3xl mb-3">{icon}</div>
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
    </div>
);


// Fix: Defined types for the templates object to resolve errors where properties
// on the `data` variable were not accessible due to being typed as 'unknown'.
type TemplatePrompt = { id: string; base: string; };
type TemplateData = {
    name: string;
    description: string;
    icon: string;
    isPolaroid: boolean;
    prompts: TemplatePrompt[];
    styles?: string[];
};


const App: React.FC = () => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<{ id: string, status: 'pending' | 'success' | 'failed', imageUrl: string | null }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [isDownloadingAlbum, setIsDownloadingAlbum] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [template, setTemplate] = useState<string | null>(null);
    const [currentAlbumStyle, setCurrentAlbumStyle] = useState('');
    const [hairColors, setHairColors] = useState<string[]>([]);
    const [selectedHairStyles, setSelectedHairStyles] = useState<string[]>([]);
    const [customHairStyle, setCustomHairStyle] = useState('');
    const [isCustomHairActive, setIsCustomHairActive] = useState(false);
    const [lookbookStyle, setLookbookStyle] = useState('');
    const [customLookbookStyle, setCustomLookbookStyle] = useState('');
    const [headshotExpression, setHeadshotExpression] = useState('Friendly Smile');
    const [headshotPose, setHeadshotPose] = useState('Forward');
    const [celebrityName, setCelebrityName] = useState('');
    const [keychainText, setKeychainText] = useState('');
    const [generationCount, setGenerationCount] = useState(3);

    useEffect(() => {
        const storedCount = localStorage.getItem('generationCount');
        const storedTimestamp = localStorage.getItem('generationResetTimestamp');
        const now = new Date().getTime();

        if (storedTimestamp && now > parseInt(storedTimestamp)) {
            localStorage.removeItem('generationCount');
            localStorage.removeItem('generationResetTimestamp');
            setGenerationCount(3);
        } else if (storedCount !== null) {
            setGenerationCount(parseInt(storedCount));
        }
    }, []);

    useEffect(() => {
        const canvas = document.getElementById('background-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];
        let animationFrameId: number;

        const setup = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = [];
            const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: Math.random() * 0.4 - 0.2,
                    vy: Math.random() * 0.4 - 0.2,
                    radius: Math.random() * 1.5 + 0.5,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
                ctx.fill();
            });

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        const opacity = 1 - (dist / 120);
                        ctx.strokeStyle = `rgba(34, 211, 238, ${opacity * 0.3})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            animationFrameId = requestAnimationFrame(draw);
        };
        
        setup();
        draw();
        
        const handleResize = () => {
             cancelAnimationFrame(animationFrameId);
             setup();
             draw();
        };
        
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // --- API Helper Functions ---
    const generateDynamicPrompt = useCallback(async (themeDescription: string): Promise<string> => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Generate a short, creative, and detailed style description for a photoshoot based on this theme: "${themeDescription}". The description should be a single sentence and sound cool.`,
            });
            return response.text.trim();
        } catch (error) {
            console.error("Error generating dynamic prompt:", error);
            return "A retro 80s studio background with laser beams, neon geometric shapes, fog, and dramatic backlighting.";
        }
    }, []);

    const generateImageWithRetry = useCallback(async (modelInstruction: string, imageWithoutPrefix: string, totalAttempts = 3): Promise<string> => {
        let lastError: Error | undefined;
        for (let attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
                const imagePart = { inlineData: { data: imageWithoutPrefix, mimeType: 'image/png' } };
                const textPart = { text: modelInstruction };

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: { parts: [textPart, imagePart] },
                    config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });

                if (response.candidates && response.candidates.length > 0) {
                  for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                  }
                }
                
                lastError = new Error("API returned no image data.");
                console.warn(`Attempt ${attempt}/${totalAttempts}: ${lastError.message}`);

            } catch (error) {
                lastError = error as Error;
                console.error(`Attempt ${attempt}/${totalAttempts} failed:`, error);
                if (error instanceof Error && error.message.includes('API key not valid')) {
                    setError("The hardcoded API Key is not valid. Please update it in the code.");
                    throw error;
                }
            }

            if (attempt < totalAttempts) {
                const delay = 1000 * Math.pow(2, attempt - 1);
                await new Promise(res => setTimeout(res, delay));
            }
        }
        throw new Error(`Image generation failed after ${totalAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
    }, []);


    const handleColorChange = (index: number, newColor: string) => setHairColors(p => p.map((c, i) => i === index ? newColor : c));
    const addHairColor = () => { if (hairColors.length < 2) setHairColors(p => [...p, '#ff00ff']); };
    const removeHairColor = (index: number) => setHairColors(p => p.filter((_, i) => i !== index));

    const handleHairStyleSelect = (styleId: string) => {
        if (styleId === 'Other') {
            setIsCustomHairActive(prev => {
                if (!prev && (selectedHairStyles.length + 1) > 6) { setError("You can select a maximum of 6 styles."); return prev; }
                if (prev) setCustomHairStyle('');
                return !prev;
            });
            return;
        }
        setSelectedHairStyles(prev => {
            if (prev.includes(styleId)) return prev.filter(s => s !== styleId);
            if (prev.length + (isCustomHairActive ? 1 : 0) < 6) return [...prev, styleId];
            setError("You can select a maximum of 6 styles.");
            return prev;
        });
    };

    const templates: { [key: string]: TemplateData } = useMemo(() => ({
        photoRestoration: {
            name: 'Photo Restoration',
            description: 'Repair and enhance old photographs.',
            icon: '✨',
            isPolaroid: false,
            prompts: [
                { id: 'Colorize', base: 'Colorize this black and white photo with realistic, natural colors.' },
                { id: 'Repair Damage', base: 'Repair physical damage like cracks, scratches, dust, and tears from this photo.' },
                { id: 'Enhance Clarity', base: 'Improve the overall sharpness, clarity, and focus of this slightly blurry photo.' },
                { id: 'Full Restore', base: 'Perform a full restoration: repair damage, colorize if B&W, and enhance clarity.' },
                { id: 'Gentle Update', base: 'Gently enhance the colors and lighting to make the photo look more vibrant, without changing the vintage feel.' },
                { id: 'Fix Fading', base: 'Restore faded colors and contrast to their original vibrancy.' }
            ]
        },
        pixarStyle: {
            name: 'Pixar-style Me',
            description: 'Become a 3D animated character.',
            icon: '🧸',
            isPolaroid: false,
            prompts: [
                { id: 'Adventurer', base: 'as a brave adventurer in a lush, magical jungle.' },
                { id: 'Scientist', base: 'as a quirky scientist in a chaotic, colorful laboratory.' },
                { id: 'Musician', base: 'as a passionate musician on a brightly lit stage.' },
                { id: 'Chef', base: 'as a cheerful chef in a warm, bustling kitchen.' },
                { id: 'Artist', base: 'as a creative artist in a messy, paint-splattered studio.' },
                { id: 'Astronaut', base: 'as a curious astronaut floating in a star-filled galaxy.' }
            ]
        },
        celebrity: {
            name: "Stand with a Celebrity",
            description: "Pose with your favorite star, in new scenes or in your original photo.",
            icon: '⭐',
            isPolaroid: false,
            prompts: [
                { id: 'Side-by-Side', base: 'Add {celebrity} standing next to the person in the original photo. Both should be looking at the camera and smiling. Match the lighting, shadows, and style of the original image perfectly. Do not change the background or the original person.' },
                { id: 'Photobomb', base: 'Add {celebrity} into the background of the original photo, photobombing the picture. Match the lighting, shadows, and style of the original image perfectly. Do not change the background or the original person.' },
                { id: 'Red Carpet', base: 'posing on the red carpet with {celebrity} at a glamorous movie premiere.' },
                { id: 'Casual Selfie', base: 'taking a fun, casual selfie with {celebrity}.' },
                { id: 'Backstage Pass', base: 'getting a photo backstage with {celebrity} after a concert.' },
                { id: 'On Set', base: 'visiting {celebrity} on a movie set and getting a picture together between takes.' },
            ]
        },
        mizoAttire: { name: 'Mizo Traditional Attire', description: 'Elegant portraits in traditional Mizo garments.', icon: '🌺', isPolaroid: false, prompts: [
            { id: 'Puanchei', base: 'a Puanchei, the most colourful Mizo puan, worn in the traditional style by a woman' },
            { id: 'Tawlhlohpuan', base: 'a Tawlhlohpuan, a puan of courage, draped valiantly over the shoulder of a man' },
            { id: 'Ngotekherh', base: 'a Ngotekherh puan with its distinctive black and white stripes, paired with a simple blouse for a woman' },
            { id: 'Kawrchei', base: 'a festive Kawrchei blouse with intricate embroidery, paired with a matching puan for a woman' },
            { id: 'Festival Attire', base: 'vibrant attire suitable for the Chapchar Kut festival, including traditional accessories and a headdress' },
            { id: 'Puan Laisen', base: 'an elegant Puan Laisen, a puan with prominent red stripes, worn gracefully' }
        ]},
        figurines: { name: 'Toys Miniature Me', description: 'Your own collectible figurines.', icon: '🧍‍♂️', isPolaroid: false, prompts: [
            { id: 'Commercial Figurine', base: 'Create a 1/7 scale commercialized figurine of the characters in the picture, in a realistic style, in a real environment. The figurine is placed on a computer desk. The figurine has a round transparent acrylic base, with no text on the base. The content on the computer screen is a 3D modeling process of this figurine. Next to the computer screen is a toy packaging box, designed in a style reminiscent of high-quality collectible figures, printed with original artwork. The packaging features two-dimensional flat illustrations.' },
            { id: 'Bobblehead', base: 'A realistic bobblehead figure of the person with an oversized head, displayed on a polished wooden desk next to a computer keyboard.' },
            { id: 'Porcelain Figurine', base: 'A delicate souvenir porcelain figurine of the person, painted with glossy colors, sitting on a lace doily on a vintage dresser.' },
            { id: 'Retro Action Figure', base: 'A retro 1980s-style action figure of the person, complete with articulated joints and slightly worn paint, posed in a dynamic stance on a rocky diorama base.' },
            { id: 'Vinyl Figure', base: 'A stylized collectible vinyl art toy of the person with minimalist features, standing on a shelf filled with other similar toys.' },
            { id: 'Plushy Figure', base: 'A soft, cute plushy figure of the person with detailed fabric texture and stitching, sitting on a neatly made bed.' },
            { id: 'Wooden Folk Art', base: 'A hand-carved wooden folk art figure of the person, painted with rustic, charming details, standing on a simple wooden block on a craft fair table.' },
            { id: 'Crystal Figurine', base: 'A transparent, multifaceted crystal figurine of the person, refracting brilliant light on a dark, velvet surface.' },
            { id: 'Claymation Figure', base: 'A stop-motion claymation-style figure of the person, with visible fingerprints and charming imperfections, standing in a miniature, handcrafted set.' },
            { id: 'Bronze Bust', base: 'A classic, weathered bronze bust sculpture of the person on a marble pedestal, as if displayed in a grand library or museum.' },
        ] },
        keychainCreator: {
            name: "Keychain Creator",
            description: "A realistic product photo of a keychain of you.",
            icon: '🔑',
            isPolaroid: false,
            prompts: [ { id: 'Keychain', base: '' } ]
        },
        decades: { name: 'Time Traveler', description: 'See yourself through the decades.', icon: '⏳', isPolaroid: true, prompts: [{ id: '1950s', base: 'A 1950s style portrait.' }, { id: '1960s', base: 'A 1960s style portrait.' }, { id: '1970s', base: 'A 1970s style portrait.' }, { id: '1980s', base: 'An 1980s style portrait.' }, { id: '1990s', base: 'A 1990s style portrait.' }, { id: '2000s', base: 'A 2000s style portrait.' }] },
        styleLookbook: { name: "Style Lookbook", description: "Your personal fashion photoshoot.", icon: '👗', isPolaroid: false, styles: ['Classic / Casual', 'Streetwear', 'Vintage', 'Goth', 'Preppy', 'Minimalist', 'Athleisure', 'Old Money / Quiet Luxury', 'Bohemian (Boho)', 'Business Casual', '90s Grunge', 'Cocktail / Formal'], prompts: [{ id: 'Look 1', base: 'a full-body shot, standing' }, { id: 'Look 2', base: 'a half-body shot, smiling' }, { id: 'Look 3', base: 'a candid walking shot' }, { id: 'Look 4', base: 'a shot showing off outfit details' }, { id: 'Look 5', base: 'a seated pose' }, { id: 'Look 6', base: 'a close-up shot focusing on accessories' }] },
        eightiesMall: { name: "'80s Mall Shoot", description: "Totally tubular 1980s portraits.", icon: '📼', isPolaroid: false, prompts: [{ id: 'Smiling', base: 'a friendly, smiling pose' }, { id: 'Thoughtful', base: 'a thoughtful, looking away from the camera pose' }, { id: 'Fun', base: 'a fun, laughing pose' }, { id: 'Serious', base: 'a serious, dramatic pose' }, { id: 'Hand on Chin', base: 'posing with their hand on their chin' }, { id: 'Over the Shoulder', base: 'looking back over their shoulder' }] },
        hairStyler: { name: 'Hair Styler', description: 'Try on new hairstyles and colors.', icon: '💇‍♀️', isPolaroid: false, prompts: [{ id: 'Short', base: 'a short hairstyle' }, { id: 'Medium', base: 'a medium-length hairstyle' }, { id: 'Long', base: 'a long hairstyle' }, { id: 'Straight', base: 'straight hair' }, { id: 'Wavy', base: 'wavy hair' }, { id: 'Curly', base: 'curly hair' }] },
        impossibleSelfies: { name: 'Impossible Pics', description: 'Photos that defy reality.', icon: '🚀', isPolaroid: false, prompts: [{ id: 'With Lincoln', base: 'The person posing with Abraham Lincoln, who is also making a peace sign and sticking his tongue out. Keep the original location.' }, { id: 'Alien & Bubbles', base: 'The person posing next to a realistic alien holding two bubble guns, blowing thousands of bubbles. Keep the person\'s pose and the original location.' }, { id: 'Room of Puppies', base: 'The person posing in a room filled with a hundred different puppies.' }, { id: 'Singing Puppets', base: 'The person posing in a room full of large, whimsical, brightly colored felt puppets that are singing.' }, { id: 'Giant Chicken Tender', base: 'The person posing with their arm around a 4-foot-tall chicken tender. Keep the person\'s facial expression exactly the same.' }, { id: 'Yeti Photobomb', base: 'Add a realistic yeti standing next to the person on the left side of the photo, matching the lighting. Keep the person\'s pose and face exactly the same.' }] },
        headshots: { name: "Pro Headshots", description: "Professional profile pictures.", icon: '💼', isPolaroid: false, prompts: [{ id: 'Business Suit', base: 'wearing a dark business suit with a crisp white shirt' }, { id: 'Smart Casual', base: 'wearing a smart-casual knit sweater over a collared shirt' }, { id: 'Creative Pro', base: 'wearing a dark turtleneck' }, { id: 'Corporate Look', base: 'wearing a light blue button-down shirt' }, { id: 'Bright & Modern', base: 'wearing a colorful blazer' }, { id: 'Relaxed', base: 'wearing a simple, high-quality t-shirt under a casual jacket' }] },
    }), []);

    const regenerateImageAtIndex = useCallback(async (imageIndex: number) => {
        if (!generatedImages[imageIndex]) return;
        setGeneratedImages(prev => prev.map((img, i) => i === imageIndex ? { ...img, status: 'pending' } : img));
        setError(null);
    
        const activeTemplate = templates[template!];
        let promptsForGeneration = template === 'hairStyler' ? activeTemplate.prompts.filter(p => selectedHairStyles.includes(p.id)) : activeTemplate.prompts;
        if (template === 'hairStyler' && isCustomHairActive && customHairStyle.trim()) promptsForGeneration.push({ id: customHairStyle, base: customHairStyle });
    
        const prompt = promptsForGeneration[imageIndex];
        if (!prompt) {
            setError("Could not find the prompt to regenerate.");
            setGeneratedImages(prev => prev.map((img, i) => i === imageIndex ? { ...img, status: 'failed' } : img));
            return;
        }
    
        try {
            if (!uploadedImage) throw new Error("No uploaded image found for regeneration.");
            const modelInstruction = getModelInstruction(template!, prompt, { headshotExpression, headshotPose, currentAlbumStyle, lookbookStyle, customLookbookStyle, hairColors, celebrityName, keychainText });
            const imageUrl = await generateImageWithRetry(modelInstruction, uploadedImage.split(',')[1]);
            const watermarkedImageUrl = await addWatermark(imageUrl);
            setGeneratedImages(prev => prev.map((img, i) => i === imageIndex ? { ...img, status: 'success', imageUrl: watermarkedImageUrl } : img));
        } catch (err) {
            setError(`Oops! Regeneration for "${prompt.id}" failed. Please try again.`);
            setGeneratedImages(prev => prev.map((img, i) => i === imageIndex ? { ...img, status: 'failed' } : img));
        }
    }, [generatedImages, template, uploadedImage, templates, selectedHairStyles, isCustomHairActive, customHairStyle, headshotExpression, headshotPose, currentAlbumStyle, lookbookStyle, customLookbookStyle, hairColors, celebrityName, keychainText, generateImageWithRetry]);
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setError(null);
            try {
                setUploadedImage(await toBase64(file));
                setGeneratedImages([]); 
            } catch (err) {
                setError("That image couldn't be processed. Please try another file.");
            } finally {
                setIsUploading(false);
            }
        }
    };
    
    const handleCaptureConfirm = (imageDataUrl: string) => {
        setUploadedImage(imageDataUrl);
        setGeneratedImages([]);
        setError(null);
    };

    const handleGenerateClick = useCallback(async () => {
        if (generationCount <= 0) {
            setError("You've reached your generation limit for today.");
            return;
        }
        if (!uploadedImage || !template) {
            setError(!uploadedImage ? "Please upload a photo!" : "Please select a theme!");
            return;
        }
        
        if (template === 'styleLookbook' && (lookbookStyle === '' || (lookbookStyle === 'Other' && !customLookbookStyle.trim()))) {
            setError("Please choose or enter a fashion style!");
            return;
        }
        if (template === 'hairStyler' && selectedHairStyles.length === 0 && (!isCustomHairActive || !customHairStyle.trim())) {
            setError("Please select at least one hairstyle!");
            return;
        }
        if (template === 'celebrity' && !celebrityName.trim()) {
            setError("Please enter the name of the celebrity!");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        
        const currentTimestamp = localStorage.getItem('generationResetTimestamp');
        if (!currentTimestamp) {
            const newResetTimestamp = new Date().getTime() + 24 * 60 * 60 * 1000;
            localStorage.setItem('generationResetTimestamp', newResetTimestamp.toString());
        }
        const newCount = generationCount - 1;
        setGenerationCount(newCount);
        localStorage.setItem('generationCount', newCount.toString());

        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

        const imageWithoutPrefix = uploadedImage.split(',')[1];
        const activeTemplate = templates[template];
        
        let dynamicStyleForAlbum = '';
        if (template === 'eightiesMall') {
            setIsSettingUp(true);
            try {
                dynamicStyleForAlbum = await generateDynamicPrompt("A specific, creative, and detailed style for an 80s mall portrait studio photoshoot.");
                setCurrentAlbumStyle(dynamicStyleForAlbum);
            } catch(e) {
                setError("Could not generate a photoshoot style. Please try again.");
                setIsLoading(false);
                setIsSettingUp(false);
                return;
            }
            setIsSettingUp(false);
        } else {
            setCurrentAlbumStyle(''); 
        }

        let promptsForGeneration = activeTemplate.prompts;
        if (template === 'hairStyler') {
            promptsForGeneration = activeTemplate.prompts.filter(p => selectedHairStyles.includes(p.id));
            if (isCustomHairActive && customHairStyle.trim()) {
                promptsForGeneration.push({ id: customHairStyle, base: customHairStyle });
            }
        }

        setGeneratedImages(promptsForGeneration.map(p => ({ id: p.id, status: 'pending', imageUrl: null })));

        for (let i = 0; i < promptsForGeneration.length; i++) {
            const p = promptsForGeneration[i];
            try {
                const modelInstruction = getModelInstruction(template, p, { headshotExpression, headshotPose, currentAlbumStyle: dynamicStyleForAlbum, lookbookStyle, customLookbookStyle, hairColors, celebrityName, keychainText });
                const imageUrl = await generateImageWithRetry(modelInstruction, imageWithoutPrefix);
                const watermarkedImageUrl = await addWatermark(imageUrl);
                setGeneratedImages(prev => prev.map((img, index) => index === i ? { ...img, status: 'success', imageUrl: watermarkedImageUrl } : img));
            } catch (err) {
                setGeneratedImages(prev => prev.map((img, index) => index === i ? { ...img, status: 'failed' } : img));
                 if (err instanceof Error && err.message.includes('API key not valid')) {
                    break; 
                }
            }
        }
        setIsLoading(false);
    }, [uploadedImage, template, templates, lookbookStyle, customLookbookStyle, selectedHairStyles, isCustomHairActive, customHairStyle, hairColors, headshotExpression, headshotPose, celebrityName, keychainText, generationCount, generateDynamicPrompt, generateImageWithRetry]);

    const triggerDownload = (href: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadRequest = async (imageUrl: string, era: string, ratio: string) => {
        try {
            const shouldAddLabel = !['headshots', 'eightiesMall', 'styleLookbook', 'figurines', 'mizoAttire', 'photoRestoration', 'celebrity', 'keychainCreator'].includes(template!);
            const framedImageUrl = await createSingleFramedImage(imageUrl, ratio, shouldAddLabel ? era : null);
            triggerDownload(framedImageUrl, `khiangtevillain-ai-${era.toLowerCase().replace(/\s+/g, '-')}.png`);
        } catch (err) {
            setError(`Could not prepare that image for download.`);
        }
    };
    
    const handleAlbumDownloadRequest = async () => {
        if (isDownloadingAlbum) return;
        setIsDownloadingAlbum(true);
        setError(null);
    
        try {
            const successfulImages = generatedImages.filter(img => img.status === 'success' && img.imageUrl);
            if (successfulImages.length === 0) {
                setError("No successful images to download.");
                return;
            }
    
            const zip = new JSZip();
            
            for (let i = 0; i < successfulImages.length; i++) {
                const img = successfulImages[i];
                const response = await fetch(img.imageUrl!);
                const blob = await response.blob();
                const fileName = `khiangtevillain-ai-${img.id.toLowerCase().replace(/\s+/g, '-')}-${i + 1}.png`;
                zip.file(fileName, blob);
            }
    
            const content = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(content);
            triggerDownload(url, "khiangtevillain-ai-album.zip");
            window.URL.revokeObjectURL(url);
    
        // Fix: Corrected syntax for catch block. The incorrect arrow function syntax was causing parsing errors.
        } catch (err) {
            console.error("Failed to create or download album:", err);
            setError("Sorry, the album download failed.");
        } finally {
            setIsDownloadingAlbum(false);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        setTemplate(templateId);
        setHeadshotExpression('Friendly Smile');
        setHeadshotPose('Forward');
        setLookbookStyle('');
        setCustomLookbookStyle('');
        setHairColors([]);
        setSelectedHairStyles([]);
        setCustomHairStyle('');
        setIsCustomHairActive(false);
        setCelebrityName('');
        setKeychainText('');
    };

    const handleStartOver = () => {
        setGeneratedImages([]);
        setUploadedImage(null);
        setError(null);
        setTemplate(null);
        handleTemplateSelect('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const totalSelectedStyles = selectedHairStyles.length + (isCustomHairActive && customHairStyle.trim() ? 1 : 0);
    const progress = generatedImages.length > 0 ? (generatedImages.filter(img => img.status !== 'pending').length / generatedImages.length) * 100 : 0;
    
    return (
        <>
            <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCaptureConfirm} />

            <div className="bg-slate-950/0 text-gray-200 min-h-screen flex flex-col items-center p-4 pb-20 relative z-10">
                 <ErrorNotification message={error} onDismiss={() => setError(null)} />
                
                <div className="w-full max-w-6xl mx-auto">
                    <header className="text-center my-12 animate-fade-in-down">
                        <h1 
                            className="glitch-text text-4xl md:text-5xl font-orbitron tracking-tight uppercase"
                            data-text="KhiangteVillain AI Images Generator"
                        >
                            KhiangteVillain
                            {' '}
                            <span style={{color: '#ec4899', textShadow: '0 0 5px #ec4899, 0 0 10px #ec4899, 0 0 20px #d946ef'}}>
                                AI Images Generator
                            </span>
                        </h1>
                        <p className="mt-4 text-lg text-cyan-300/80">Transform your photos with (SOTA) Nano-Banana Preview</p>
                        <div className="flex justify-center gap-x-8 gap-y-4 mt-6 flex-wrap">
                            <a href="https://www.instagram.com/khiangte.villain" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-300 hover:text-pink-400 transition-colors font-medium">
                                <IconInstagram />
                                <span>@khiangte.villain</span>
                            </a>
                            <a href="https://www.youtube.com/@khiangtevillainAi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-300 hover:text-cyan-400 transition-colors font-medium">
                                <IconYouTube />
                                <span>@khiangtevillainAi</span>
                            </a>
                        </div>
                    </header>

                    <main>
                        <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-800 mb-16 animate-fade-in-up">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                                <div>
                                    <h2 className="text-2xl font-semibold mb-6 text-white font-orbitron">1. YOUR PHOTO</h2>
                                    <div className="w-full aspect-square border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-pink-500 transition-colors bg-slate-800/50 overflow-hidden shadow-inner" onClick={() => !uploadedImage && fileInputRef.current?.click()}>
                                        {isUploading ? <div className="flex flex-col items-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500"></div><p className="text-gray-400 mt-4">Uploading...</p></div> : uploadedImage ? <img src={uploadedImage} alt="Uploaded preview" className="w-full h-full object-contain" /> : <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400"><IconUpload /><p className="mt-4 text-lg text-slate-300">Click to upload a file</p><p className="mt-4 text-sm">or</p><Button onClick={(e) => { e.stopPropagation(); setIsCameraOpen(true); }} className="mt-2"><div className="flex items-center gap-2"><IconCamera /><span>Use Camera</span></div></Button></div>}
                                    </div>
                                    {uploadedImage && !isUploading && <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full"><Button onClick={() => fileInputRef.current?.click()} className="flex-1">Change File</Button><Button onClick={() => setIsCameraOpen(true)} className="flex-1"><div className="flex items-center justify-center gap-2"><IconCamera /><span>Use Camera</span></div></Button></div>}
                                     <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
                                </div>

                                <div>
                                     <h2 className="text-2xl font-semibold mb-6 text-white font-orbitron">2. CHOOSE THEME</h2>
                                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                                        {Object.entries(templates).map(([key, data]) => <TemplateCard key={key} id={key} name={data.name} icon={data.icon} description={data.description} isSelected={template === key} onSelect={handleTemplateSelect} />)}
                                     </div>
                                     
                                      {template === 'celebrity' && (
                                        <div className="p-6 border border-slate-700 rounded-xl space-y-4 bg-slate-800/50 animate-fade-in">
                                            <h3 className='text-xl font-semibold text-white'>Celebrity Details</h3>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Celebrity's Full Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., Taylor Swift"
                                                    value={celebrityName}
                                                    onChange={(e) => setCelebrityName(e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                                                />
                                            </div>
                                        </div>
                                     )}
                                     {template === 'keychainCreator' && (
                                        <div className="p-6 border border-slate-700 rounded-xl space-y-4 bg-slate-800/50 animate-fade-in">
                                            <h3 className='text-xl font-semibold text-white'>Keychain Details</h3>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Keychain Text Label (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Defaults to 'KhiangteVillain'"
                                                    value={keychainText}
                                                    onChange={(e) => setKeychainText(e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                                                />
                                            </div>
                                        </div>
                                     )}
                                     {template === 'hairStyler' && (
                                        <div className="p-6 border border-slate-700 rounded-xl space-y-6 bg-slate-800/50 animate-fade-in">
                                            <div className="flex justify-between items-center"><h3 className='text-xl font-semibold text-white'>Customize Hairstyle</h3><span className={`text-sm font-bold ${totalSelectedStyles >= 6 ? 'text-pink-400' : 'text-slate-500'}`}>{totalSelectedStyles} / 6</span></div>
                                            <div><label className="block text-sm font-medium text-slate-400 mb-3">Style (select up to 6)</label><div className="flex flex-wrap gap-3">{templates.hairStyler.prompts.map(p => <button key={p.id} onClick={() => handleHairStyleSelect(p.id)} className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors font-semibold ${selectedHairStyles.includes(p.id) ? 'bg-pink-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>{p.id}</button>)}<button onClick={() => handleHairStyleSelect('Other')} className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors font-semibold ${isCustomHairActive ? 'bg-pink-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>Other...</button></div></div>
                                            {isCustomHairActive && <div><label className="block text-sm font-medium text-slate-400 mb-2">Your Custom Style</label><input type="text" placeholder="e.g., A vibrant pink mohawk" value={customHairStyle} onChange={(e) => setCustomHairStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white" /></div>}
                                            <div><label className="block text-sm font-medium text-slate-400 mb-3">Hair Color</label><div className="flex items-center gap-4 flex-wrap">{hairColors.map((color, index) => <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg border border-slate-600"><div className="relative w-10 h-10 rounded-md overflow-hidden" style={{ backgroundColor: color }}><input type="color" value={color} onChange={(e) => handleColorChange(index, e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" /></div><span className="font-mono text-sm text-slate-300 uppercase">{color}</span><button onClick={() => removeHairColor(index)} className="p-1 rounded-full text-slate-500 hover:bg-slate-600 hover:text-red-400 transition-colors" aria-label="Remove color"><IconX /></button></div>)}
                                            {hairColors.length < 2 && <button onClick={addHairColor} className="flex items-center justify-center gap-2 h-[68px] px-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-pink-500 text-slate-400 hover:text-pink-400 transition-colors bg-slate-700/30"><IconPlus /><span>{hairColors.length === 0 ? 'Add Color' : 'Add Highlight'}</span></button>}</div>{hairColors.length > 0 && <button onClick={() => setHairColors([])} className="text-xs text-slate-500 hover:text-white transition-colors mt-3">Clear all colors</button>}</div>
                                        </div>
                                     )}
                                     {template === 'headshots' && (
                                        <div className="p-6 border border-slate-700 rounded-xl space-y-6 bg-slate-800/50 animate-fade-in"><h3 className='text-xl font-semibold text-white'>Customize Headshot</h3><div><label className="block text-sm font-medium text-slate-400 mb-3">Facial Expression</label><div className="flex flex-wrap gap-3"><RadioPill name="expression" value="Friendly Smile" label="Friendly Smile" checked={headshotExpression === 'Friendly Smile'} onChange={e => setHeadshotExpression(e.target.value)} /><RadioPill name="expression" value="Confident Look" label="Confident Look" checked={headshotExpression === 'Confident Look'} onChange={e => setHeadshotExpression(e.target.value)} /><RadioPill name="expression" value="Thoughtful Gaze" label="Thoughtful Gaze" checked={headshotExpression === 'Thoughtful Gaze'} onChange={e => setHeadshotExpression(e.target.value)} /></div></div><div><label className="block text-sm font-medium text-slate-400 mb-3">Pose</label><div className="flex flex-wrap gap-3"><RadioPill name="pose" value="Forward" label="Facing Forward" checked={headshotPose === 'Forward'} onChange={e => setHeadshotPose(e.target.value)} /><RadioPill name="pose" value="Angle" label="Slight Angle" checked={headshotPose === 'Angle'} onChange={e => setHeadshotPose(e.target.value)} /></div></div></div>
                                     )}
                                     {template === 'styleLookbook' && (
                                        <div className="p-6 border border-slate-700 rounded-xl space-y-6 bg-slate-800/50 animate-fade-in"><h3 className='text-xl font-semibold text-white'>Choose a Fashion Style</h3><div><div className="flex flex-wrap gap-3">{templates.styleLookbook!.styles!.map(style => <RadioPill key={style} name="style" value={style} label={style} checked={lookbookStyle === style} onChange={e => {setLookbookStyle(e.target.value); setCustomLookbookStyle('');}} />)}<RadioPill name="style" value="Other" label="Other..." checked={lookbookStyle === 'Other'} onChange={e => setLookbookStyle(e.target.value)} /></div></div>{lookbookStyle === 'Other' && <div><label className="block text-sm font-medium text-slate-400 mb-2">Your Custom Style</label><input type="text" placeholder="e.g., Cyberpunk, Avant-garde" value={customLookbookStyle} onChange={(e) => setCustomLookbookStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-pink-500 text-white" /></div>}</div>
                                     )}
                                </div>
                            </div>
                            <div className="mt-12 text-center">
                                <div className="mb-4 text-sm text-slate-400">
                                    {generationCount > 0 ? (
                                        <p>Generations remaining today: <span className="font-bold text-cyan-300">{generationCount} / 3</span></p>
                                    ) : (
                                        <p className="font-bold text-pink-400">You've used all your generations. Please check back tomorrow!</p>
                                    )}
                                </div>
                                <Button 
                                    onClick={handleGenerateClick} 
                                    disabled={!uploadedImage || !template || isLoading || isUploading || isSettingUp || generationCount <= 0} 
                                    primary 
                                    className="text-lg px-12 py-4"
                                >
                                    <div className="flex items-center gap-3">
                                        {isLoading || isSettingUp ? 
                                            <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>{isSettingUp ? "Setting the stage..." : `Generating... (${Math.round(progress)}%)`}</> : 
                                        generationCount <= 0 ? 
                                            <>Limit Reached</> : 
                                            <><IconSparkles />Generate Photos</>}
                                    </div>
                                </Button>
                            </div>
                        </div>

                        <div ref={resultsRef}>
                            {isSettingUp && <div className="text-center my-20 flex flex-col items-center p-10 bg-slate-900/70 rounded-2xl"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mb-6"></div><p className="text-2xl text-pink-400 font-semibold tracking-wider italic">Teasing our hair and firing up the lasers...</p><p className="text-slate-400 mt-2">Generating a totally tubular '80s photoshoot style!</p></div>}
                            {(isLoading || generatedImages.length > 0) && !isSettingUp && (
                                <div className="mt-16">
                                    <h2 className="text-3xl font-bold text-white mb-8 text-center font-orbitron">YOUR GENERATED PHOTOS</h2>
                                    {isLoading && <div className="w-full max-w-4xl mx-auto mb-8 text-center"><div className="bg-slate-800 rounded-full h-3 overflow-hidden shadow-md"><div className="bg-gradient-to-r from-cyan-400 to-pink-500 h-3 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div></div><p className="text-slate-400 mt-4 text-sm">Please keep this window open while your photos are being generated.</p></div>}
                                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mt-8">
                                        {generatedImages.map((img, index) => {
                                            const isPolaroid = templates[template!]?.isPolaroid ?? false;
                                            const showLabel = !['headshots', 'eightiesMall', 'styleLookbook', 'figurines', 'mizoAttire', 'photoRestoration', 'celebrity', 'keychainCreator'].includes(template!);
                                            switch (img.status) {
                                                case 'success': return <PhotoDisplay key={`${img.id}-${index}-s`} era={img.id} imageUrl={img.imageUrl!} onDownload={handleDownloadRequest} onRegenerate={() => regenerateImageAtIndex(index)} isPolaroid={isPolaroid} index={index} showLabel={showLabel} />;
                                                case 'failed': return <ErrorCard key={`${img.id}-${index}-f`} era={img.id} isPolaroid={isPolaroid} onRegenerate={() => regenerateImageAtIndex(index)} showLabel={showLabel} />;
                                                default: return <LoadingCard key={`${img.id}-${index}-p`} era={img.id} isPolaroid={isPolaroid} showLabel={showLabel} />;
                                            }
                                        })}
                                    </div>
                                </div>
                            )}
                            {!isLoading && generatedImages.length > 0 && <div className="text-center mt-16 mb-12 flex flex-col sm:flex-row justify-center items-center gap-6"><Button onClick={handleStartOver}>Start Over</Button><Button onClick={handleAlbumDownloadRequest} primary disabled={isDownloadingAlbum}>{isDownloadingAlbum ? <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div><span>Zipping...</span></div> : <div className="flex items-center gap-2"><IconDownload /><span>Download Album</span></div>}</Button></div>}
                        </div>
                    </main>
                    <footer className="text-center mt-16 py-8 border-t border-slate-800 text-slate-500 text-sm animate-fade-in">
                        <p>copyright khiangtevillain 2025</p>
                        <p className="mt-1">Workspace by J&R business Aizawl, Mizoram</p>
                    </footer>
                </div>
            </div>
        </>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);