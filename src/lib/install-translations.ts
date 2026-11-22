// Source strings join the existing public dictionary; no translation calls on visits.
const source = [
  "Instalar en el móvil", "Instalar Aquí Bonela", "Añadir Aquí Bonela a tu pantalla de inicio",
  "Instalar", "Ahora no", "Compartir", "Añadir a la pantalla de inicio", "Añadir",
  "Abre esta página en Safari para añadirla a tu pantalla de inicio.",
  "Abre el menú de tu navegador y selecciona «Instalar aplicación» o «Añadir a la pantalla de inicio».",
  "No se ha podido abrir la instalación. Puedes volver a intentarlo.",
] as const;
const targets: Record<string, readonly string[]> = {
  en: ["Install on your phone", "Install Aquí Bonela", "Add Aquí Bonela to your home screen", "Install", "Not now", "Share", "Add to Home Screen", "Add", "Open this page in Safari to add it to your home screen.", "Open your browser menu and select “Install app” or “Add to Home Screen”.", "Installation could not be opened. You can try again."],
  de: ["Auf dem Handy installieren", "Aquí Bonela installieren", "Aquí Bonela zum Startbildschirm hinzufügen", "Installieren", "Jetzt nicht", "Teilen", "Zum Home-Bildschirm", "Hinzufügen", "Öffne diese Seite in Safari, um sie zum Home-Bildschirm hinzuzufügen.", "Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.", "Die Installation konnte nicht geöffnet werden. Versuche es erneut."],
  nl: ["Installeren op je telefoon", "Aquí Bonela installeren", "Aquí Bonela toevoegen aan je beginscherm", "Installeren", "Niet nu", "Deel", "Zet op beginscherm", "Voeg toe", "Open deze pagina in Safari om haar aan je beginscherm toe te voegen.", "Open het browsermenu en kies ‘App installeren’ of ‘Toevoegen aan beginscherm’.", "De installatie kon niet worden geopend. Probeer het opnieuw."],
  fr: ["Installer sur le mobile", "Installer Aquí Bonela", "Ajouter Aquí Bonela à votre écran d’accueil", "Installer", "Pas maintenant", "Partager", "Sur l’écran d’accueil", "Ajouter", "Ouvrez cette page dans Safari pour l’ajouter à votre écran d’accueil.", "Ouvrez le menu du navigateur et sélectionnez « Installer l’application » ou « Ajouter à l’écran d’accueil ».", "L’installation n’a pas pu s’ouvrir. Vous pouvez réessayer."],
  uk: ["Встановити на телефон", "Встановити Aquí Bonela", "Додати Aquí Bonela на початковий екран", "Встановити", "Не зараз", "Поширити", "На початковий екран", "Додати", "Відкрийте цю сторінку в Safari, щоб додати її на початковий екран.", "Відкрийте меню браузера та виберіть «Встановити застосунок» або «Додати на початковий екран».", "Не вдалося відкрити встановлення. Спробуйте ще раз."],
};
export const installTexts = Object.fromEntries(Object.entries(targets).map(([language, values]) => [language,
  Object.fromEntries(source.map((text, index) => [text, values[index] ?? text])),
]));