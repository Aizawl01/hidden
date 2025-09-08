import React, { useState, useRef, useEffect, useCallback, useMemo } from 'https://esm.sh/react@19.1.1';
import ReactDOM from 'https://esm.sh/react-dom@19.1.1/client';
// Fix: Use standard import for @google/genai as per coding guidelines.
import { GoogleGenAI, Modality } from '@google/genai';

// Fix: API key must be retrieved from environment variables as per coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
            return `${baseInstruction} Create a 9:16 ultra-realistic product photograph with soft studio lighting and glossy highlights. The photo should feature a realistic