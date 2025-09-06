
import { GoogleGenAI, Modality } from '@google/genai';
import type { ImageData, Theme } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateImage(photoData: ImageData, theme: Theme): Promise<string[]> {
  const model = 'gemini-2.5-flash-image-preview';

  const imagePart = {
    inlineData: {
      data: photoData.base64,
      mimeType: photoData.mimeType,
    },
  };

  const textPart = {
    text: theme.prompt,
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const generatedImages: string[] = [];
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64ImageBytes: string = part.inlineData.data;
          const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          generatedImages.push(imageUrl);
        }
      }
    }
    return generatedImages;
  } catch (error) {
    console.error('Error generating image with Gemini:', error);
    throw new Error('Failed to generate image from the API.');
  }
}
