// Plugin de Vite: resuelve "@instance", "@instance-content" y la carpeta pública
// a los de la instancia elegida en VITE_MUNICIPALITY_ID.
import { loadEnv, type Plugin } from "vite";
import { instanceConfigPath, instanceContentPath, instancePublicDir, resolveInstanceId } from "./resolve";

export function instanceSelection(options: { fallbackId?: string } = {}): Plugin {
  return {
    name: "groundwork:instance",
    config(userConfig, { mode }) {
      const root = userConfig.root ?? process.cwd();
      // loadEnv da prioridad a las variables del proceso sobre los archivos .env.
      const raw = loadEnv(mode, root, "VITE_")["VITE_MUNICIPALITY_ID"] || options.fallbackId;
      const id = resolveInstanceId(raw, root);
      return {
        publicDir: instancePublicDir(root, id),
        resolve: {
          alias: {
            "@instance": instanceConfigPath(root, id),
            "@instance-content": instanceContentPath(root, id),
          },
        },
      };
    },
  };
}
