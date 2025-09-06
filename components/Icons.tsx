
import React from 'react';

type IconProps = { className?: string };

export const UploadIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3.75 12h16.5" />
  </svg>
);

export const CameraIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

export const SparklesIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.456-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.456-2.456L16.5 14.25l.398 1.197a3.375 3.375 0 002.456 2.456L20.25 18l-1.197.398a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

// Theme Icons
export const TimeTravelerIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 7h-2v5.414l3.293 3.293 1.414-1.414L13 11.586z"></path></svg>
);
export const StyleLookbookIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M13.262 3.097 11.5 6.404 9.738 3.097a1.002 1.002 0 0 0-1.74-.004L6.26 6.403 4.5 3.093a1 1 0 1 0-1.737.99l2.498 4.33a1.001 1.001 0 0 0 .868.514H7.5V20H9v-2h6v2h1.5V8.927h1.37a1.001 1.001 0 0 0 .868-.514l2.498-4.33a1 1 0 1 0-1.737-.99L19.74 6.403l-1.738-3.31a1.002 1.002 0 0 0-1.74.004z"></path></svg>
);
export const MallShootIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20 6h-3V4c0-1.103-.897-2-2-2H9c-1.103 0-2 .897-2 2v2H4c-1.103 0-2 .897-2 2v11c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V8c0-1.103-.897-2-2-2zM9 4h6v2H9V4zm11 15H4V8h16v11z"></path><path d="M12 9c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"></path></svg>
);
export const MiniatureMeIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2zM12 11c-2.2 0-4 1.8-4 4v.5c0 1.93 1.57 3.5 3.5 3.5h1c1.93 0 3.5-1.57 3.5-3.5V15c0-2.2-1.8-4-4-4z"></path></svg>
);
export const HairStylerIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 14c-3 0-4 2-4 2v2h8v-2s-1-2-4-2zM10.36 12.87a2.5 2.5 0 1 0-4.86-1.74 2.5 2.5 0 0 0 4.86 1.74zM18.5 11.13a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12 2a5 5 0 0 0-5 5c0 .35.05.68.12 1a6.99 6.99 0 0 0 9.76 0c.07-.32.12-.65.12-1a5 5 0 0 0-5-5z"></path></svg>
);
export const ImpossiblePicsIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 17.5h-1.5v-3a.5.5 0 0 0-1 0v3H18a.5.5 0 0 0 0 1h1.5v3a.5.5 0 0 0 1 0v-3H22a.5.5 0 0 0 0-1zm-6.08-11.89L13.1 7.27a1.004 1.004 0 0 0 1.25.32l1.62-.77c.45-.22.95.23.83.71l-.8 3.2a1 1 0 0 0 .54 1.1l3.06 1.62c.42.22.42.82 0 1.04l-3.06 1.62a1 1 0 0 0-.54 1.1l.8 3.2c.12.48-.38.93-.83.71l-1.62-.77a1 1 0 0 0-1.25.32l-2.82 1.66a1 1 0 0 0 0 1.74l8.28 4.86a2 2 0 0 0 2.73-1L24 12 .74 4.54a2 2 0 0 0-1.25 2.65L4 18.23a1.992 1.992 0 0 0 3.12 1.04l6.8-4.02a1 1 0 0 0 0-1.74L7.04 8.65a1 1 0 0 0-1.37-1.14L3.1 8.7a1 1 0 0 0-.91-.56H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1.12a1 1 0 0 0 .91-.56l.33-.89-1.5-2.61.1.06z"></path></svg>
);
export const ProHeadshotsIcon: React.FC<IconProps> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M16 14h.5c.827 0 1.5.673 1.5 1.5v3c0 .827-.673 1.5-1.5 1.5H16v-6zM8 14H7.5c-.827 0-1.5.673-1.5 1.5v3c0 .827.673 1.5 1.5 1.5H8v-6z"></path><path d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3z"></path><path d="M12 13c-3.309 0-6 2.691-6 6v1h12v-1c0-3.309-2.691-6-6-6z"></path></svg>
);
