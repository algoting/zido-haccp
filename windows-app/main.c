#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shellapi.h>
#include <stdio.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    const wchar_t* appUrl = L"https://zido-haccp.online/";
    
    // Check 32-bit Program Files Edge path
    wchar_t edgePath[MAX_PATH];
    ExpandEnvironmentStringsW(L"%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe", edgePath, MAX_PATH);
    
    DWORD dwAttrib = GetFileAttributesW(edgePath);
    if (dwAttrib != INVALID_FILE_ATTRIBUTES && !(dwAttrib & FILE_ATTRIBUTE_DIRECTORY)) {
        wchar_t params[1024];
        swprintf(params, 1024, L"--app=%s --window-size=1300,850 --window-position=center", appUrl);
        ShellExecuteW(NULL, L"open", edgePath, params, NULL, SW_SHOWNORMAL);
        return 0;
    }

    // Check 64-bit Program Files Edge path
    ExpandEnvironmentStringsW(L"%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe", edgePath, MAX_PATH);
    dwAttrib = GetFileAttributesW(edgePath);
    if (dwAttrib != INVALID_FILE_ATTRIBUTES && !(dwAttrib & FILE_ATTRIBUTE_DIRECTORY)) {
        wchar_t params[1024];
        swprintf(params, 1024, L"--app=%s --window-size=1300,850 --window-position=center", appUrl);
        ShellExecuteW(NULL, L"open", edgePath, params, NULL, SW_SHOWNORMAL);
        return 0;
    }

    // Fallback: Default browser in app mode
    ShellExecuteW(NULL, L"open", L"msedge.exe", L"--app=https://zido-haccp.online/ --window-size=1300,850", NULL, SW_SHOWNORMAL);
    return 0;
}
