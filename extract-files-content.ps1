# Set the root project directory
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootFolderName = Split-Path $projectRoot -Leaf

# Gather all files and directories under the project
$allFiles = Get-ChildItem -Path $projectRoot -Recurse -File
$allDirs  = Get-ChildItem -Path $projectRoot -Recurse -Directory

# Ask the user where to save the output
$choice = Read-Host "Do you want to save the output in the current folder (Y), the parent folder (N), or a custom path (C)? [Y/N/C]"
switch ($choice.ToUpper()) {
    "Y" { $saveBase = $projectRoot; break }
    "N" { $saveBase = Split-Path $projectRoot -Parent; break }
    "C" {
        $saveBase = Read-Host "Enter the full path where you want to save the output"
        break
    }
    default {
        Write-Host "Invalid option. Defaulting to current folder."
        $saveBase = $projectRoot
    }
}

# Create the output directory named after the project root
$outputDir = Join-Path $saveBase "extraction_$rootFolderName"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# Define the Markdown output file
$outputFile = Join-Path $outputDir 'extractedContent.md'

# Remove old output file if it exists
if (Test-Path $outputFile) {
    try { Remove-Item $outputFile -Force } catch { Write-Host "Failed to delete the old file. Please close any program using it."; exit }
}

# Mapping of file extensions to decide inclusion
$languageMap = @{
    '.php'   = $true; 
    '.js'    = $true;  
    '.ts'   = $true;
    '.jsx'   = $true; 
    '.tsx'   = $true; 
    '.html' = $true;
    '.css'   = $true; 
    '.json'  = $true; 
    '.xml'  = $true;
    '.md'    = $false; 
    '.py'    = $true; 
    '.sh'   = $false;
    '.c'     = $true; 
    '.cpp'   = $true; 
    '.cs'   = $true;
    '.java'  = $true; 
    '.go'    = $true; 
    '.rb'   = $true;
    '.rs'    = $true; 
    '.swift' = $true; 
    '.kt'   = $true;
    '.scala' = $true; 
    '.lua'   = $true; 
    '.yml'  = $true;
    '.yaml'  = $true; 
    '.ini'   = $true; 
    '.toml' = $true;
    '.env'   = $false; 
    '.txt'  = $false; 
    '.bat'  = $true;
    '.conf'  = $false; 
    '.cfg'  = $false;  
    '.gitignore' = $false;
    '.gitattributes' = $false;
}

# Files without extensions that should always be included
# $alwaysAllow = @(
#     'Dockerfile', 'Makefile', '.gitignore', '.prettierrc',
#     '.editorconfig', '.gitattributes', '.eslintrc', '.babelrc'
# )
$alwaysAllow = @(
    'Dockerfile', 'Makefile', '.prettierrc',
    '.editorconfig', '.eslintrc', '.babelrc'
)

# Process each file and append its content in fenced code blocks
foreach ($file in $allFiles) {
    $ext  = $file.Extension.ToLower()
    $name = $file.Name

    # Determine if the file should be included
    $shouldInclude = ($languageMap.ContainsKey($ext) -and $languageMap[$ext]) -or ($alwaysAllow -contains $name)
    if (-not $shouldInclude) { continue }

    # Read file content or mark as error
    try { $content = Get-Content -Path $file.FullName -Raw } catch { $content = "[ERROR READING FILE]" }

    Add-Content -Path $outputFile -Value "### $name"
    # Always use generic fenced code block
    Add-Content -Path $outputFile -Value '```'
    Add-Content -Path $outputFile -Value $content
    Add-Content -Path $outputFile -Value '```'
    Add-Content -Path $outputFile -Value ''
}

# Append a styled summary section
Add-Content -Path $outputFile -Value '## 📝 Processing Summary'
Add-Content -Path $outputFile -Value ''
Add-Content -Path $outputFile -Value "- 📁 Directories processed: $($allDirs.Count)"
Add-Content -Path $outputFile -Value "- 📄 Files processed: $($allFiles.Count)"
Add-Content -Path $outputFile -Value ''

# List of Directories with root folder prefix
Add-Content -Path $outputFile -Value '### 📁 List of Directories'
Add-Content -Path $outputFile -Value ''
foreach ($d in $allDirs) {
    $relative = $d.FullName.Substring($projectRoot.Length + 1)
    Add-Content -Path $outputFile -Value "- $rootFolderName\$relative"
}
Add-Content -Path $outputFile -Value ''

# List of Files with root folder prefix
Add-Content -Path $outputFile -Value '### 📄 List of Files'
Add-Content -Path $outputFile -Value ''
foreach ($f in $allFiles) {
    $relative = $f.FullName.Substring($projectRoot.Length + 1)
    Add-Content -Path $outputFile -Value "- $rootFolderName\$relative"
}

Write-Host "`n✅ Markdown file successfully generated at:`n$outputFile"
