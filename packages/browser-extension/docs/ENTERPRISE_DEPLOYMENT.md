# PromptTrap Browser Extension - Enterprise Deployment Guide

This guide covers deploying the PromptTrap browser extension to enterprise environments using Chrome Enterprise, Microsoft Intune, and Group Policy.

## Prerequisites

- Chrome/Edge Enterprise license (for managed deployments)
- Access to Google Admin Console or Microsoft Intune
- PromptTrap extension built and packaged

## Installation Methods

### Method 1: Chrome Enterprise (Recommended for Google Workspace)

#### Step 1: Publish to Chrome Web Store (Private)

1. **Package the extension:**
   ```bash
   cd packages/browser-extension
   npm run build
   npm run package
   ```

2. **Upload to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Click "New Item"
   - Upload `prompttrap-extension.zip`
   - Set visibility to "Private" for organization only
   - Add your organization's domain to allowed installs

3. **Get Extension ID** from the dashboard (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

#### Step 2: Configure Native Messaging Host

The native messaging host bridges the extension to the SQLite database.

**On macOS:**
```bash
# Install native host binary
sudo cp dist/native-host.js /usr/local/bin/prompttrap-host
sudo chmod +x /usr/local/bin/prompttrap-host

# Install native messaging manifest
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
cp src/native-host/manifest-chrome.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.prompttrap.host.json

# Update manifest with actual extension ID
sed -i '' 's/EXTENSION_ID_HERE/abcdefghijklmnopqrstuvwxyz123456/' ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.prompttrap.host.json
```

**On Windows:**
```powershell
# Install native host binary
Copy-Item dist\native-host.js "C:\Program Files\PromptTrap\prompttrap-host.js"

# Install native messaging manifest
$manifestPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\NativeMessagingHosts"
New-Item -ItemType Directory -Force -Path $manifestPath
Copy-Item src\native-host\manifest-chrome.json "$manifestPath\com.prompttrap.host.json"

# Update path in manifest
$manifest = Get-Content "$manifestPath\com.prompttrap.host.json" | ConvertFrom-Json
$manifest.path = "C:\Program Files\PromptTrap\prompttrap-host.js"
$manifest.allowed_origins = @("chrome-extension://YOUR_EXTENSION_ID/")
$manifest | ConvertTo-Json | Set-Content "$manifestPath\com.prompttrap.host.json"
```

**On Linux:**
```bash
# Install native host binary
sudo cp dist/native-host.js /usr/local/bin/prompttrap-host
sudo chmod +x /usr/local/bin/prompttrap-host

# Install native messaging manifest
mkdir -p ~/.config/google-chrome/NativeMessagingHosts
cp src/native-host/manifest-chrome.json ~/.config/google-chrome/NativeMessagingHosts/com.prompttrap.host.json

# Update manifest with actual extension ID
sed -i 's/EXTENSION_ID_HERE/abcdefghijklmnopqrstuvwxyz123456/' ~/.config/google-chrome/NativeMessagingHosts/com.prompttrap.host.json
```

#### Step 3: Deploy via Google Admin Console

1. **Go to Admin Console** → Devices → Chrome → Apps & Extensions

2. **Add the extension:**
   - Click "Add Chrome app or extension"
   - Paste the Extension ID
   - Select install policy:
     - **Force install**: Automatically installed, users cannot remove
     - **Normal install**: Automatically installed, users can disable
     - **Allowed**: Users can install manually

3. **Configure extension settings (optional):**
   ```json
   {
     "dlpAction": {
       "Value": "warn"
     },
     "showBanner": {
       "Value": true
     },
     "monitoringEnabled": {
       "Value": true
     }
   }
   ```

4. **Target to organizational units:**
   - Select which OUs/groups receive the extension
   - Apply settings

---

### Method 2: Microsoft Intune (Microsoft 365 / Azure AD)

#### Step 1: Package Extension for Intune

```bash
cd packages/browser-extension
npm run build

# Create Intune deployment package
mkdir intune-package
cp -r dist intune-package/
cp install-script.ps1 intune-package/
```

#### Step 2: Create Install Script

Create `install-script.ps1`:
```powershell
# PromptTrap Extension Install Script for Intune

$extensionId = "YOUR_EXTENSION_ID"
$registryPath = "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist"

# Force install extension
if (!(Test-Path $registryPath)) {
    New-Item -Path $registryPath -Force
}

$value = "$extensionId;https://clients2.google.com/service/update2/crx"
New-ItemProperty -Path $registryPath -Name "1" -Value $value -PropertyType String -Force

# Install native messaging host
$hostPath = "C:\Program Files\PromptTrap"
New-Item -ItemType Directory -Force -Path $hostPath
Copy-Item .\native-host.js "$hostPath\prompttrap-host.js"

$manifestPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\NativeMessagingHosts"
New-Item -ItemType Directory -Force -Path $manifestPath

$manifest = @{
    name = "com.prompttrap.host"
    description = "PromptTrap native messaging host"
    path = "$hostPath\prompttrap-host.js"
    type = "stdio"
    allowed_origins = @("chrome-extension://$extensionId/")
}

$manifest | ConvertTo-Json | Set-Content "$manifestPath\com.prompttrap.host.json"

Write-Host "PromptTrap extension installed successfully"
```

#### Step 3: Create Intune App Package

1. **Go to Intune Admin Center** → Apps → All Apps → Add

2. **Select app type:** Windows app (Win32)

3. **Upload package:**
   - Package `.intunewin` file (use Microsoft Win32 Content Prep Tool)
   - Install command: `powershell.exe -ExecutionPolicy Bypass -File install-script.ps1`
   - Uninstall command: `powershell.exe -ExecutionPolicy Bypass -File uninstall-script.ps1`

4. **Target assignment:**
   - Required: Automatically installed
   - Available: Users can install from Company Portal

---

### Method 3: Group Policy (Windows Active Directory)

#### Step 1: Configure GPO for Chrome Extension

1. **Download Chrome ADMX templates:**
   - Get from [Google Chrome Enterprise](https://chromeenterprise.google/browser/download/)
   - Copy `chrome.admx` to `C:\Windows\PolicyDefinitions`
   - Copy `chrome.adml` to `C:\Windows\PolicyDefinitions\en-US`

2. **Open Group Policy Editor:**
   ```
   gpedit.msc
   ```

3. **Navigate to:**
   ```
   Computer Configuration → Administrative Templates → Google → Google Chrome → Extensions
   ```

4. **Configure "Extension management settings":**
   ```json
   {
     "YOUR_EXTENSION_ID": {
       "installation_mode": "force_installed",
       "update_url": "https://clients2.google.com/service/update2/crx"
     }
   }
   ```

5. **Deploy native messaging host:**
   - Use GPO software deployment or login script
   - Install manifest to registry:
     ```
     HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.prompttrap.host
     Default = "C:\Program Files\PromptTrap\manifest.json"
     ```

---

## Configuration Management

### Extension Configuration via Policy

Configure extension behavior through managed storage:

**Chrome Enterprise (JSON):**
```json
{
  "dlpAction": {
    "Value": "warn"
  },
  "showBanner": {
    "Value": true
  },
  "monitoredDomains": {
    "Value": [
      "chatgpt.com",
      "claude.ai",
      "gemini.google.com"
    ]
  },
  "blockedDomains": {
    "Value": [
      "unauthorized-ai.com"
    ]
  }
}
```

**Group Policy (Registry):**
```
HKLM\SOFTWARE\Policies\Google\Chrome\3rdparty\extensions\YOUR_EXTENSION_ID\policy
```

---

## Verification

### Test Extension Installation

1. **Check extension is installed:**
   - Open Chrome → Extensions
   - Verify PromptTrap is present and enabled

2. **Test native messaging:**
   - Visit `chatgpt.com`
   - Open browser console
   - Look for `[PromptTrap] Initialized on ChatGPT`

3. **Verify database writes:**
   ```bash
   sqlite3 /path/to/prompttrap.db "SELECT * FROM events WHERE source='browser' ORDER BY timestamp DESC LIMIT 5;"
   ```

### Common Issues

**Extension not loading:**
- Check extension ID matches in all configs
- Verify Chrome version supports MV3
- Check browser console for errors

**Native messaging errors:**
- Verify manifest path is correct
- Check file permissions on host binary
- Ensure extension ID in manifest matches installed ID

**DLP not working:**
- Check extension has necessary permissions
- Verify content scripts are injecting
- Review console logs for errors

---

## Security Considerations

1. **Least Privilege:**
   - Extension only requests AI domain permissions
   - No access to all sites or browsing history

2. **Data Privacy:**
   - Default: metadata only (no full prompts)
   - Enable `log_prompts: true` only if required and disclosed

3. **Transport Security:**
   - Native messaging uses local IPC only
   - SQLite database should be on encrypted volume

4. **User Transparency:**
   - Banner notifies users of monitoring
   - Privacy policy should disclose what's logged

---

## Monitoring & Maintenance

### Check Extension Health

```bash
# View recent browser events
sqlite3 prompttrap.db "SELECT ai_service, COUNT(*) FROM events WHERE source='browser' GROUP BY ai_service;"

# Check for DLP findings
sqlite3 prompttrap.db "SELECT dlp_severity, COUNT(*) FROM events WHERE source='browser' AND dlp_severity != 'none' GROUP BY dlp_severity;"
```

### Update Extension

**Via Chrome Web Store:**
- Upload new version to dashboard
- Extensions auto-update within 24 hours

**Via Intune:**
- Update `.intunewin` package
- Deploy to target groups

---

## Support

- **Extension Issues:** Check browser console and background page logs
- **Native Messaging:** Check system logs and host process output
- **Database:** Verify SQLite file permissions and schema

## Appendix: Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `monitoringEnabled` | boolean | true | Master toggle for monitoring |
| `dlpAction` | string | "log" | "log", "warn", or "block" |
| `showBanner` | boolean | true | Show monitoring banner on AI sites |
| `logPrompts` | boolean | false | Log full prompt content (privacy impact) |
| `monitoredDomains` | array | [all AI services] | Which domains to monitor |
| `blockedDomains` | array | [] | Which AI domains to block entirely |
