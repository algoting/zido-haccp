Add-Type -AssemblyName System.Windows.Forms
$appUrl = "https://zido-haccp.online/"

try {
    Start-Process "msedge.exe" -ArgumentList "--app=$appUrl", "--window-size=1300,850"
} catch {
    Start-Process "chrome.exe" -ArgumentList "--app=$appUrl", "--window-size=1300,850"
}
