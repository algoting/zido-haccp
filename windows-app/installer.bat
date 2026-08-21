@echo off
chcp 65001 > nul
echo ========================================================
echo   Installation de Zido HACCP sur Windows
echo   Sécurité Alimentaire & Contrôle Sanitaire
echo ========================================================
echo.

set TARGET_DIR=%LOCALAPPDATA%\ZidoHACCP
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [1/3] Copie des fichiers d'application...
copy /Y "%~dp0*.*" "%TARGET_DIR%\" > nul

echo [2/3] Création du raccourci sur le Bureau...
set SCRIPT="%TEMP%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Zido HACCP.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "msedge.exe" >> %SCRIPT%
echo oLink.Arguments = "--app=https://zido-haccp.online/ --window-size=1280,800" >> %SCRIPT%
echo oLink.Description = "Zido HACCP - Application Bureau" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo [3/3] Lancement de Zido HACCP...
start msedge.exe --app=https://zido-haccp.online/ --window-size=1280,800

echo.
echo ========================================================
echo   ✅ Zido HACCP a été installé avec succès !
echo   Le raccourci a été ajouté sur votre Bureau Windows.
echo ========================================================
pause
