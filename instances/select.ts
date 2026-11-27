// Plugin de Vite: resuelve el alias "@instance" a la instancia elegida.
import { loadEnv, type Plugin } from "vite";
import { instanceConfigPath, resolveInstanceId } from "./resolve";

export function instanceSelection(): Plugin {
  return {
    name: "groundwork:instance",
    config(userConfig, { mode }) {
      const root = userConfig.root ?? process.cwd();
      // loadEnv da prioridad a las variables del proceso sobre los archivos .env.
      const id = resolveInstanceId(loadEnv(mode, root, "VITE_")["VITE_MUNICIPALITY_ID"], root);
      return { resolve: { alias: { "@instance": instanceConfigPath(root, id) } } };
    },
  };
}
