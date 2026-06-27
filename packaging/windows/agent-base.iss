#define AppName "Agent Base"
#define AppVersion "0.1.0"

[Setup]
AppId={{97C91286-03D4-4C3C-B866-40AF889D9DC7}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\Agent Base
DefaultGroupName=Agent Base
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\release
OutputBaseFilename=agent-base-{#AppVersion}-windows-x64
Compression=lzma2
SolidCompression=yes
UninstallDisplayIcon={app}\runtime\node\node.exe

[Files]
Source: "..\..\release\stage\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Start Agent Base"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\controls\Start-AgentBase.ps1"""
Name: "{group}\Agent Base Health"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\controls\Health-AgentBase.ps1"""
Name: "{group}\Stop Agent Base"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\controls\Stop-AgentBase.ps1"""

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\controls\AgentBase.ps1"" initialize"; StatusMsg: "Initializing private Agent Base data..."; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\controls\Stop-AgentBase.ps1"""; Flags: runhidden; RunOnceId: "StopAgentBase"
