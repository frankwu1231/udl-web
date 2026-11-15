#Requires -Version 5.1
<#
.SYNOPSIS
    面積前測 HTML 轉 PDF 批次處理腳本 (Windows PowerShell 5.1)
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# 設定基準目錄（優先使用腳本所在目錄，直接貼上執行則採用當前工作目錄）
$baseDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# Edge 執行檔路徑檢查
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path -LiteralPath $edgePath)) {
    $altEdgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    if (Test-Path -LiteralPath $altEdgePath) {
        $edgePath = $altEdgePath
    } else {
        throw "找不到 Microsoft Edge 執行檔：$edgePath"
    }
}

# 確保輸出目錄結構存在
$outputDirs = @(
    "$baseDir\pdf\一般版\學生卷",
    "$baseDir\pdf\一般版\答案卷",
    "$baseDir\pdf\注音版\學生卷",
    "$baseDir\pdf\注音版\答案卷"
)
foreach ($dir in $outputDirs) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 建立獨立暫存工作目錄（含 Edge User Data 與暫存 HTML）
$tempBase = Join-Path $env:TEMP ("pretest_pdf_build_" + [System.Guid]::NewGuid().ToString("N"))
$tempUserData = Join-Path $tempBase "edge_profile"
$tempHtmlDir = Join-Path $tempBase "temp_html"

New-Item -ItemType Directory -Path $tempUserData -Force | Out-Null
New-Item -ItemType Directory -Path $tempHtmlDir -Force | Out-Null

# 樣式設定
# 學生卷：隱藏 .teacher
$styleStudent = "<style>`n.teacher { display: none !important; }`n@media print { .teacher { display: none !important; } }`n</style>"

# 答案卷：隱藏 .sheet-head 和 .item，並覆寫 .teacher 避免首頁空白
$styleAnswer = "<style>`n.sheet-head, .item { display: none !important; }`n.teacher { break-before: auto !important; }`n@media print { .sheet-head, .item { display: none !important; } .teacher { break-before: auto !important; } }`n</style>"

# 樣式插入輔助函式
function Insert-HeadStyle {
    param (
        [string]$Html,
        [string]$StyleBlock
    )
    $idx = $Html.IndexOf("</head>", [System.StringComparison]::OrdinalIgnoreCase)
    if ($idx -ge 0) {
        return $Html.Substring(0, $idx) + $StyleBlock + "`n" + $Html.Substring($idx)
    } else {
        return $StyleBlock + "`n" + $Html
    }
}

# UTF-8 無 BOM 編碼物件
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# 建立 80 個 PDF 轉換任務清單
$tasks = [System.Collections.Generic.List[PSCustomObject]]::new()

$versions = @(
    @{
        Label      = "一般版"
        Folder     = "pretest-versions"
        FilePrefix = "pretest-"
        DocPrefix  = "面積前測_一般版"
    },
    @{
        Label      = "注音版"
        Folder     = "pretest-zhuyin"
        FilePrefix = "pretest-zhuyin-"
        DocPrefix  = "面積前測_注音版"
    }
)

foreach ($ver in $versions) {
    for ($i = 1; $i -le 20; $i++) {
        $num = "{0:D2}" -f $i
        $srcRel = "$($ver.Folder)\$($ver.FilePrefix)$num.html"
        $srcFull = "$baseDir\$srcRel"

        # 學生卷任務
        $tasks.Add([PSCustomObject]@{
            Version      = $ver.Label
            Type         = "學生卷"
            Num          = $num
            SourcePath   = $srcFull
            OutputPath   = "$baseDir\pdf\$($ver.Label)\學生卷\$($ver.DocPrefix)_卷號$num.pdf"
            RelativeOut  = "pdf\$($ver.Label)\學生卷\$($ver.DocPrefix)_卷號$num.pdf"
            StyleBlock   = $styleStudent
            TempHtmlName = "$($ver.FilePrefix)$num`_student.html"
        })

        # 答案卷任務
        $tasks.Add([PSCustomObject]@{
            Version      = $ver.Label
            Type         = "答案卷"
            Num          = $num
            SourcePath   = $srcFull
            OutputPath   = "$baseDir\pdf\$($ver.Label)\答案卷\$($ver.DocPrefix)_卷號${num}_答案.pdf"
            RelativeOut  = "pdf\$($ver.Label)\答案卷\$($ver.DocPrefix)_卷號${num}_答案.pdf"
            StyleBlock   = $styleAnswer
            TempHtmlName = "$($ver.FilePrefix)$num`_answer.html"
        })
    }
}

Write-Host "開始執行 HTML 轉 PDF 作業，總計 $($tasks.Count) 個檔案..." -ForegroundColor Cyan

try {
    $currentIndex = 0
    foreach ($task in $tasks) {
        $currentIndex++

        if (-not (Test-Path -LiteralPath $task.SourcePath)) {
            Write-Warning "[$currentIndex/$($tasks.Count)] 來源檔案不存在：$($task.SourcePath)"
            continue
        }

        # 讀取來源 HTML (UTF-8)
        $rawHtml = [System.IO.File]::ReadAllText($task.SourcePath, [System.Text.Encoding]::UTF8)

        # 插入對應樣式
        $modifiedHtml = Insert-HeadStyle -Html $rawHtml -StyleBlock $task.StyleBlock

        # 存為暫存 HTML (UTF-8 無 BOM)
        $tempHtmlPath = Join-Path $tempHtmlDir $task.TempHtmlName
        [System.IO.File]::WriteAllText($tempHtmlPath, $modifiedHtml, $utf8NoBom)

        # 轉成 file:/// 網址（轉為正斜線並對空白做 URL 編碼）
        $fullTempPath = [System.IO.Path]::GetFullPath($tempHtmlPath)
        $fileUrl = "file:///" + ($fullTempPath.Replace('\', '/').Replace(' ', '%20'))

        # 若已存在舊 PDF 則先刪除，避免影響判斷
        if (Test-Path -LiteralPath $task.OutputPath) {
            Remove-Item -LiteralPath $task.OutputPath -Force
        }

        # 組裝 Edge 命令列參數（路徑以引號包覆以支援空白及中文）
        $edgeArgs = "--headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 --user-data-dir=`"$tempUserData`" --print-to-pdf=`"$($task.OutputPath)`" `"$fileUrl`""

        # 呼叫 Edge 執行列印
        $proc = Start-Process -FilePath $edgePath -ArgumentList $edgeArgs -Wait -WindowStyle Hidden -PassThru

        # 刪除暫存 HTML
        if (Test-Path -LiteralPath $tempHtmlPath) {
            Remove-Item -LiteralPath $tempHtmlPath -Force -ErrorAction SilentlyContinue
        }

        # 輸出單檔進度
        if (Test-Path -LiteralPath $task.OutputPath) {
            $fileSize = (Get-Item -LiteralPath $task.OutputPath).Length
            $sizeKB = [Math]::Round($fileSize / 1KB, 1)
            Write-Host "[$currentIndex/$($tasks.Count)] 完成：$($task.RelativeOut) ($sizeKB KB)" -ForegroundColor Green
        } else {
            Write-Host "[$currentIndex/$($tasks.Count)] 失敗：$($task.RelativeOut) 未能成功產生 PDF" -ForegroundColor Red
        }
    }
}
finally {
    # 清理所有暫存檔案與目錄
    if (Test-Path -LiteralPath $tempBase) {
        Remove-Item -LiteralPath $tempBase -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 檢查 80 個 PDF 是否都存在且大於 10 KB
Write-Host "`n=== 檢查 PDF 產出結果 (共 $($tasks.Count) 份) ===" -ForegroundColor Cyan
$minSizeBytes = 10 * 1024 # 10 KB
$successCount = 0
$issues = [System.Collections.Generic.List[PSCustomObject]]::new()

foreach ($task in $tasks) {
    if (-not (Test-Path -LiteralPath $task.OutputPath)) {
        $issues.Add([PSCustomObject]@{
            "檔案路徑" = $task.RelativeOut
            "狀態"     = "缺少 (檔案不存在)"
            "大小(KB)" = 0
        })
    } else {
        $item = Get-Item -LiteralPath $task.OutputPath
        $sizeKB = [Math]::Round($item.Length / 1KB, 2)
        if ($item.Length -lt $minSizeBytes) {
            $issues.Add([PSCustomObject]@{
                "檔案路徑" = $task.RelativeOut
                "狀態"     = "檔案過小 (< 10 KB)"
                "大小(KB)" = $sizeKB
            })
        } else {
            $successCount++
        }
    }
}

if ($issues.Count -eq 0) {
    Write-Host "檢查通過：全部 $successCount 個 PDF 均存在且大小正常（均大於 10 KB）！" -ForegroundColor Green
} else {
    Write-Warning "發現 $($issues.Count) 個異常檔案："
    $issues | Format-Table -AutoSize
}
