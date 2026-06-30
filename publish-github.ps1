param(
  [string]$Message = "Update YILU Creation Archive",
  [string]$Remote = "origin",
  [string]$Branch = "main",
  [int]$NetworkRetries = 3,
  [int]$NetworkLowSpeedTime = 45,
  [int]$KeepHistoryCommits = 6,
  [switch]$SkipHistoryPrune,
  [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$env:GIT_TERMINAL_PROMPT = "0"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

$publicPaths = @(
  ".github",
  ".gitignore",
  "README.md",
  "index.html",
  "package.json",
  "package-lock.json",
  "public",
  "scripts",
  "src",
  "vite.config.js",
  "publish-github.ps1"
)

function Write-ProgressEvent {
  param(
    [int]$Value,
    [string]$Step
  )
  Write-Output "::progress|$Value|$Step"
}

function Short-Sha {
  param([string]$Sha)
  if (-not $Sha) { return "" }
  if ($Sha.Length -lt 8) { return $Sha }
  return $Sha.Substring(0, 8)
}

function Assert-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

function Invoke-CommandCapture {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [string]$FailureMessage,
    [switch]$Network
  )

  $attempts = if ($Network) { [Math]::Max(1, $NetworkRetries) } else { 1 }
  $lastOutput = ""

  for ($attempt = 1; $attempt -le $attempts; $attempt += 1) {
    $previousErrorActionPreference = $ErrorActionPreference
    try {
      # Windows PowerShell can promote native stderr to a terminating
      # NativeCommandError when the script uses Stop globally. Capture the
      # process exit code ourselves so network retries can actually run.
      $ErrorActionPreference = "Continue"
      $output = & $Command @Arguments 2>&1
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    $lastOutput = ($output | Out-String).Trim()

    if ($exitCode -eq 0) {
      return $lastOutput
    }

    if ($attempt -lt $attempts) {
      Write-Host "$FailureMessage Retrying $attempt/$attempts..."
      if ($lastOutput) {
        Write-Host $lastOutput
      }
      Start-Sleep -Seconds ([Math]::Min(12, 2 * $attempt))
    }
  }

  if ($lastOutput) {
    throw "$FailureMessage`n$lastOutput"
  }
  throw $FailureMessage
}

function Invoke-Git {
  param(
    [string[]]$Arguments,
    [string]$FailureMessage = "Git command failed."
  )
  Invoke-CommandCapture -Command "git" -Arguments $Arguments -FailureMessage $FailureMessage
}

function Get-GitHubFallbackIp {
  $providers = @(
    @{
      Uri = "https://dns.google/resolve?name=github.com&type=A"
      Headers = @{ Accept = "application/dns-json" }
    },
    @{
      Uri = "https://cloudflare-dns.com/dns-query?name=github.com&type=A"
      Headers = @{ Accept = "application/dns-json" }
    }
  )

  foreach ($provider in $providers) {
    try {
      $response = Invoke-RestMethod `
        -Uri $provider.Uri `
        -Headers $provider.Headers `
        -TimeoutSec 15
      $address = $response.Answer |
        Where-Object { $_.type -eq 1 -and $_.data -match "^\d{1,3}(?:\.\d{1,3}){3}$" } |
        Select-Object -ExpandProperty data -First 1
      if ($address) {
        return $address
      }
    } catch {
      Write-Host "GitHub DNS fallback provider is unavailable: $($_.Exception.Message)"
    }
  }

  return ""
}

function Invoke-GitNetwork {
  param(
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  $networkArgs = @(
    "-c", "http.version=HTTP/1.1",
    "-c", "http.lowSpeedLimit=1",
    "-c", "http.lowSpeedTime=$NetworkLowSpeedTime"
  ) + $Arguments
  try {
    return Invoke-CommandCapture -Command "git" -Arguments $networkArgs -FailureMessage $FailureMessage
  } catch {
    $remoteUrl = & git remote get-url $Remote 2>$null
    if ($LASTEXITCODE -ne 0 -or $remoteUrl -notmatch "^https://github\.com/") {
      return Invoke-CommandCapture -Command "git" -Arguments $networkArgs -FailureMessage $FailureMessage -Network
    }

    $fallbackIp = Get-GitHubFallbackIp
    if (-not $fallbackIp) {
      return Invoke-CommandCapture -Command "git" -Arguments $networkArgs -FailureMessage $FailureMessage -Network
    }

    Write-Host "Direct GitHub connection failed. Retrying with DNS fallback $fallbackIp."
    $fallbackArgs = @(
      "-c", "http.curloptResolve=github.com:443:$fallbackIp"
    ) + $networkArgs
    return Invoke-CommandCapture -Command "git" -Arguments $fallbackArgs -FailureMessage $FailureMessage -Network
  }
}

function Assert-RepositoryReady {
  if (-not (Test-Path -LiteralPath ".git")) {
    throw "Git repository is not initialized."
  }

  Assert-Command "git"
  Assert-Command "npm.cmd"

  Invoke-Git -Arguments @("rev-parse", "--is-inside-work-tree") -FailureMessage "Current directory is not a Git work tree." | Out-Null
  Invoke-Git -Arguments @("remote", "get-url", $Remote) -FailureMessage "Git remote '$Remote' is not configured." | Out-Null

  $currentBranch = Invoke-Git -Arguments @("branch", "--show-current") -FailureMessage "Unable to read current Git branch."
  if ($currentBranch -ne $Branch) {
    throw "Publish must run on branch '$Branch'. Current branch is '$currentBranch'."
  }
}

function Assert-IndexReady {
  $staged = Invoke-Git -Arguments @("diff", "--cached", "--name-only") -FailureMessage "Unable to inspect staged Git files."
  if ($staged) {
    throw "Git index already has staged files. Commit or unstage them before running publish-github.ps1:`n$staged"
  }
}

function Get-LocalSha {
  Invoke-Git -Arguments @("rev-parse", "HEAD") -FailureMessage "Unable to read local HEAD."
}

function Get-CachedRemoteSha {
  $ref = "refs/remotes/$Remote/$Branch"
  $sha = & git rev-parse --verify $ref 2>$null
  if ($LASTEXITCODE -ne 0) {
    return ""
  }
  return $sha
}

function Get-RemoteSha {
  $ref = "refs/heads/$Branch"
  $remoteLine = Invoke-GitNetwork `
    -Arguments @("ls-remote", "--heads", $Remote, $ref) `
    -FailureMessage "Unable to reach GitHub remote '$Remote/$Branch'. Check network, proxy, VPN, or GitHub access."
  if (-not $remoteLine) {
    return ""
  }
  return ($remoteLine -split "\s+")[0]
}

function Assert-RemoteCanFastForward {
  param(
    [string]$RemoteSha,
    [string]$LocalSha
  )

  if (-not $RemoteSha) {
    return
  }

  & git merge-base --is-ancestor $RemoteSha $LocalSha
  if ($LASTEXITCODE -ne 0) {
    throw "Remote '$Remote/$Branch' has commits that are not in local '$Branch'. Run 'git pull --rebase $Remote $Branch' first. Local $(Short-Sha $LocalSha), remote $(Short-Sha $RemoteSha)."
  }
}

function Test-GitAncestor {
  param(
    [string]$AncestorSha,
    [string]$DescendantSha
  )

  if (-not $AncestorSha -or -not $DescendantSha) {
    return $false
  }

  & git merge-base --is-ancestor $AncestorSha $DescendantSha
  return ($LASTEXITCODE -eq 0)
}

function Test-GitHasMergeBase {
  param(
    [string]$LeftSha,
    [string]$RightSha
  )

  if (-not $LeftSha -or -not $RightSha) {
    return $false
  }

  & git merge-base $LeftSha $RightSha 1>$null 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Get-CommitCount {
  param([string]$Ref)

  $countText = Invoke-Git `
    -Arguments @("rev-list", "--count", $Ref) `
    -FailureMessage "Unable to count Git history for '$Ref'."
  return [int]$countText
}

function Test-PrunedSnapshotReplacementAllowed {
  param(
    [string]$RemoteSha,
    [string]$LocalSha
  )

  if (Test-GitHasMergeBase -LeftSha $RemoteSha -RightSha $LocalSha) {
    return $false
  }

  $localCount = Get-CommitCount -Ref $LocalSha
  $remoteCount = Get-CommitCount -Ref $RemoteSha
  return ($localCount -le $KeepHistoryCommits -and $remoteCount -le $KeepHistoryCommits)
}

function Push-CurrentHead {
  param(
    [string]$ExpectedRemoteSha = "",
    [switch]$ForceWithLease
  )

  Write-ProgressEvent -Value 86 -Step "push"
  $arguments = @("push", "-u")
  if ($ForceWithLease) {
    if ($ExpectedRemoteSha) {
      $arguments += "--force-with-lease=refs/heads/$($Branch):$ExpectedRemoteSha"
    } else {
      $arguments += "--force-with-lease"
    }
  }
  $arguments += @($Remote, "$($Branch):$($Branch)")
  Invoke-GitNetwork `
    -Arguments $arguments `
    -FailureMessage "GitHub push failed. Check network, proxy, VPN, credentials, and repository permission." | Out-Null
}

function Verify-And-SyncRemote {
  param(
    [string]$LocalSha,
    [switch]$AllowCachedVerification
  )

  Write-ProgressEvent -Value 96 -Step "verify"
  try {
    $remoteSha = Get-RemoteSha
    if ($remoteSha -ne $LocalSha) {
      if (Test-GitAncestor -AncestorSha $remoteSha -DescendantSha $LocalSha) {
        Write-Host "Remote '$Remote/$Branch' is behind local HEAD. Pushing $(Short-Sha $LocalSha)..."
        Push-CurrentHead
      } elseif (Test-PrunedSnapshotReplacementAllowed -RemoteSha $remoteSha -LocalSha $LocalSha) {
        Write-Host "Remote '$Remote/$Branch' and local '$Branch' are both pruned snapshots with no shared base. Replacing remote with local HEAD $(Short-Sha $LocalSha) using force-with-lease."
        Push-CurrentHead -ExpectedRemoteSha $remoteSha -ForceWithLease
      } else {
        Assert-RemoteCanFastForward -RemoteSha $remoteSha -LocalSha $LocalSha
      }
      $remoteSha = Get-RemoteSha
    }

    if ($remoteSha -ne $LocalSha) {
      throw "Remote verification failed. Local $(Short-Sha $LocalSha), remote $(Short-Sha $remoteSha)."
    }

    Invoke-GitNetwork `
      -Arguments @("fetch", $Remote, $Branch) `
      -FailureMessage "GitHub fetch failed after push." | Out-Null
    return "remote"
  } catch {
    if ($AllowCachedVerification) {
      $cachedSha = Get-CachedRemoteSha
      if ($cachedSha -eq $LocalSha) {
        Write-Host "Online verification is unavailable, but cached '$Remote/$Branch' matches HEAD: $(Short-Sha $LocalSha)"
        return "cached"
      }
    }
    throw
  }
}

function Prune-CurrentBranchHistory {
  if ($SkipHistoryPrune) {
    Write-Host "Skipping Git history pruning by request."
    return $false
  }

  if ($KeepHistoryCommits -lt 1) {
    throw "KeepHistoryCommits must be at least 1."
  }

  $commitCountText = Invoke-Git `
    -Arguments @("rev-list", "--count", "HEAD") `
    -FailureMessage "Unable to count local Git history."
  $commitCount = [int]$commitCountText
  if ($commitCount -le $KeepHistoryCommits) {
    Write-Host "Git history already has $commitCount commit(s), no pruning needed."
    return $false
  }

  Write-ProgressEvent -Value 82 -Step "prune-history"
  $oldHead = Get-LocalSha
  $rootKeep = Invoke-Git `
    -Arguments @("rev-parse", "HEAD~$($KeepHistoryCommits - 1)") `
    -FailureMessage "Unable to locate the oldest commit to keep."
  $tempBranch = "history-prune-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"

  Write-Host "Pruning Git history: keeping latest $KeepHistoryCommits commit(s), root $(Short-Sha $rootKeep)."
  try {
    Invoke-Git `
      -Arguments @("switch", "--orphan", $tempBranch) `
      -FailureMessage "Unable to create temporary orphan branch '$tempBranch'." | Out-Null
    Invoke-Git `
      -Arguments @("read-tree", "--reset", "-u", $rootKeep) `
      -FailureMessage "Unable to load kept root commit tree." | Out-Null
    Invoke-Git `
      -Arguments @("commit", "-C", $rootKeep) `
      -FailureMessage "Unable to create new root commit for pruned history." | Out-Null

    $range = "$rootKeep..$oldHead"
    Invoke-Git `
      -Arguments @("cherry-pick", $range) `
      -FailureMessage "Unable to replay kept commits onto pruned history." | Out-Null
    Invoke-Git `
      -Arguments @("branch", "-M", $tempBranch, $Branch) `
      -FailureMessage "Unable to replace local '$Branch' with pruned history." | Out-Null
    return $true
  } catch {
    throw "Git history pruning failed. Resolve the repository state manually before publishing again.`n$($_.Exception.Message)"
  }
}

function Run-Check {
  if ($SkipCheck) {
    Write-Host "Skipping npm check by request."
    return
  }

  Write-ProgressEvent -Value 20 -Step "validate"
  Write-Host "Validating public site..."
  & npm.cmd run check
  if ($LASTEXITCODE -ne 0) {
    throw "Site validation failed. Publish stopped."
  }
  Write-ProgressEvent -Value 55 -Step "build-complete"
}

function Stage-PublicFiles {
  Write-ProgressEvent -Value 62 -Step "stage"
  & git add -A -- $publicPaths
  if ($LASTEXITCODE -ne 0) {
    throw "Git staging failed."
  }
}

function Has-StagedChanges {
  & git diff --cached --quiet
  return ($LASTEXITCODE -ne 0)
}

function Commit-StagedChanges {
  param([string]$CommitMessage)

  $cleanMessage = ($CommitMessage.Trim())
  if (-not $cleanMessage) {
    $cleanMessage = "Update YILU Creation Archive"
  }
  if ($cleanMessage.Length -gt 120) {
    $cleanMessage = $cleanMessage.Substring(0, 120)
  }

  Write-ProgressEvent -Value 74 -Step "commit"
  & git commit -m $cleanMessage
  if ($LASTEXITCODE -ne 0) {
    throw "Git commit failed."
  }
}

Assert-RepositoryReady
Assert-IndexReady
Run-Check
Stage-PublicFiles

if (Has-StagedChanges) {
  Commit-StagedChanges -CommitMessage $Message
  $prunedHistory = Prune-CurrentBranchHistory
  $sha = Get-LocalSha
  if ($prunedHistory) {
    $expectedRemoteSha = Get-RemoteSha
    Push-CurrentHead -ExpectedRemoteSha $expectedRemoteSha -ForceWithLease
  }
  $verificationMode = Verify-And-SyncRemote -LocalSha $sha
  Write-ProgressEvent -Value 100 -Step "done"
  Write-Host "Publish complete: $(Short-Sha $sha) ($verificationMode verification)"
  exit 0
}

$prunedHistory = Prune-CurrentBranchHistory
$sha = Get-LocalSha
if ($prunedHistory) {
  $expectedRemoteSha = Get-RemoteSha
  Push-CurrentHead -ExpectedRemoteSha $expectedRemoteSha -ForceWithLease
  $verificationMode = Verify-And-SyncRemote -LocalSha $sha
  Write-ProgressEvent -Value 100 -Step "done"
  Write-Host "History pruned and synchronized: $(Short-Sha $sha) ($verificationMode verification)"
  exit 0
}

$verificationMode = Verify-And-SyncRemote -LocalSha $sha -AllowCachedVerification
Write-ProgressEvent -Value 100 -Step "unchanged"
Write-Host "No public site changes to commit. HEAD $(Short-Sha $sha) is synchronized ($verificationMode verification)."
