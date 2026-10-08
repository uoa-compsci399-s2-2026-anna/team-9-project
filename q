[1mdiff --git a/index.js b/index.js[m
[1mindex 2bba53c5..d03ec503 100644[m
[1m--- a/index.js[m
[1m+++ b/index.js[m
[36m@@ -130,11 +130,13 @@[m [mipcMain.handle("settings:getDefaults", () => {[m
     return getDefaultSettings();[m
 });[m
 [m
[32m+[m[32m// Update the window background[m
[32m+[m[32mnativeTheme.on("updated", updateWindowBackgroundColour);[m
[32m+[m
 ipcMain.handle("settings:set", (_event, newSettings) => {[m
     const mergedSettings = { ...store.get("settings"), ...newSettings };[m
     store.set("settings", mergedSettings);[m
     applyNativeTheme();[m
[31m-    updateWindowBackgroundColour();[m
 });[m
 [m
 // Refresh the current web page[m
