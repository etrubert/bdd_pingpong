import { createContext, useContext } from 'react';

export const UICtx = createContext(null);

export function useUI() {
  return useContext(UICtx);
}
