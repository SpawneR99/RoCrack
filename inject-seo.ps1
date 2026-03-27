$root = "C:\Users\zivad\Desktop\CrackBlox-main"

# Map: HTML page path -> SEO content file
$mappings = @{
    "$root\index.html" = "$root\seo-content\homepage.html"
    "$root\script\index.html" = "$root\seo-content\delta.html"
    "$root\scripts\index.html" = "$root\seo-content\scripts.html"
    "$root\scripts\blox\index.html" = "$root\seo-content\blox.html"
    "$root\scripts\garden\index.html" = "$root\seo-content\garden.html"
    "$root\scripts\rivals\index.html" = "$root\seo-content\rivals.html"
    "$root\scripts\fisch\index.html" = "$root\seo-content\fisch.html"
    "$root\scripts\brookhaven\index.html" = "$root\seo-content\brookhaven.html"
    "$root\scripts\deadrails\index.html" = "$root\seo-content\deadrails.html"
    "$root\scripts\brainrot\index.html" = "$root\seo-content\brainrot.html"
    "$root\scripts\forsaken\index.html" = "$root\seo-content\forsaken.html"
    "$root\scripts\forest\index.html" = "$root\seo-content\forest.html"
    "$root\scripts\island\index.html" = "$root\seo-content\island.html"
    "$root\scripts\volleyball\index.html" = "$root\seo-content\volleyball.html"
    "$root\scripts\plantsbrainrots\index.html" = "$root\seo-content\plantsbrainrots.html"
    "$root\scripts\arise\index.html" = "$root\seo-content\arise.html"
    "$root\scripts\fishit\index.html" = "$root\seo-content\fishit.html"
}

foreach ($entry in $mappings.GetEnumerator()) {
    $htmlFile = $entry.Key
    $seoFile = $entry.Value
    
    if (-not (Test-Path $htmlFile)) {
        Write-Host "SKIP - File not found: $htmlFile"
        continue
    }
    if (-not (Test-Path $seoFile)) {
        Write-Host "SKIP - SEO content not found: $seoFile"
        continue
    }
    
    $content = Get-Content $htmlFile -Raw -Encoding UTF8
    $seoContent = Get-Content $seoFile -Raw -Encoding UTF8
    
    # Check if page has existing seo-content section
    if ($content -match '(?s)<section class="seo-content">(.*?)</section>') {
        # Replace the content inside the seo-content section
        $newSection = "<section class=""seo-content"">`n$seoContent        </section>"
        $content = $content -replace '(?s)<section class="seo-content">.*?</section>', $newSection
        [System.IO.File]::WriteAllText($htmlFile, $content, [System.Text.Encoding]::UTF8)
        
        # Count words
        $text = $seoContent -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
        $words = ($text.Trim() -split '\s+').Count
        $rel = $htmlFile.Replace("$root\", '')
        Write-Host "UPDATED ($words words) - $rel"
    } else {
        # Page doesn't have seo-content section yet - need to add it
        # Find the insertion point: before </body>
        $seoSection = @"

    <div class="seo-section">
        <section class="seo-content">
$seoContent        </section>
    </div>
"@
        $content = $content -replace '</body>', "$seoSection`n</body>"
        [System.IO.File]::WriteAllText($htmlFile, $content, [System.Text.Encoding]::UTF8)
        
        $text = $seoContent -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
        $words = ($text.Trim() -split '\s+').Count
        $rel = $htmlFile.Replace("$root\", '')
        Write-Host "ADDED ($words words) - $rel"
    }
}

Write-Host "`nDone! All SEO content updated."
