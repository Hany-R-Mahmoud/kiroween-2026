import { createContext, useContext } from 'react';
/** The image CDN base from the root loader data. '' (the default) means no CDN: today's URLs. */
export const ImageBaseContext = createContext('');
export const useImageBase = (): string => useContext(ImageBaseContext);
