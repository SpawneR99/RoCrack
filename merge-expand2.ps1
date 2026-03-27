$root = "C:\Users\zivad\Desktop\CrackBlox-main\seo-content"

$gamePages = @(
    "brainrot", "forsaken", "forest", "island", "volleyball", 
    "plantsbrainrots", "arise", "fishit", "garden", "fisch",
    "brookhaven", "deadrails", "rivals"
)

# Extra game expansion content
$extraExpand = Get-Content "$root\expand-game-extra.html" -Raw -Encoding UTF8

foreach ($game in $gamePages) {
    $file = "$root\$game.html"
    $current = Get-Content $file -Raw -Encoding UTF8
    $merged = $current + "`n" + $extraExpand
    [System.IO.File]::WriteAllText($file, $merged, [System.Text.Encoding]::UTF8)
    
    $text = $merged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
    $words = ($text.Trim() -split '\s+').Count
    Write-Host "Expanded ($words words) - $game.html"
}

# Expand homepage extra
$homeBase = Get-Content "$root\homepage.html" -Raw -Encoding UTF8
$homeExtra = Get-Content "$root\expand-homepage-extra.html" -Raw -Encoding UTF8
$homeMerged = $homeBase + "`n" + $homeExtra
[System.IO.File]::WriteAllText("$root\homepage.html", $homeMerged, [System.Text.Encoding]::UTF8)
$text = $homeMerged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
$words = ($text.Trim() -split '\s+').Count
Write-Host "Expanded ($words words) - homepage.html"

# Scripts also need a bit more  
$scriptsExtra = Get-Content "$root\expand-game-extra.html" -Raw -Encoding UTF8
$scriptsBase = Get-Content "$root\scripts.html" -Raw -Encoding UTF8
$scriptsMerged = $scriptsBase + "`n" + $scriptsExtra
[System.IO.File]::WriteAllText("$root\scripts.html", $scriptsMerged, [System.Text.Encoding]::UTF8)
$text = $scriptsMerged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
$words = ($text.Trim() -split '\s+').Count
Write-Host "Expanded ($words words) - scripts.html"

Write-Host "`nDone! Now run inject-seo.ps1 to apply to HTML pages."
