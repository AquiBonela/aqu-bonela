import { createContext, useContext } from "react";

/** Si el navegador permite instalar la web y cómo mostrar la invitación (lo provee InstallPromptProvider). */
export const InstallContext = createContext<{ available: boolean; show: () => void }>({ available: false, show: () => {} });
export const useInstallPrompt = () => useContext(InstallContext);
