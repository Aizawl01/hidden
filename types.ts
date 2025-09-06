
import type React from 'react';

export interface ImageData {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}
