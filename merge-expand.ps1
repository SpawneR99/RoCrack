$root = "C:\Users\zivad\Desktop\CrackBlox-main\seo-content"

# Append expansion content to base content files
$gamePages = @(
    "blox", "garden", "rivals", "fisch", "brookhaven", "deadrails",
    "brainrot", "forsaken", "forest", "island", "volleyball", 
    "plantsbrainrots", "arise", "fishit"
)

# Generic game expansion content
$genericExpand = Get-Content "$root\expand-game-generic.html" -Raw -Encoding UTF8

# Append generic expansion to all game pages
foreach ($game in $gamePages) {
    $file = "$root\$game.html"
    $current = Get-Content $file -Raw -Encoding UTF8
    $merged = $current + "`n" + $genericExpand
    [System.IO.File]::WriteAllText($file, $merged, [System.Text.Encoding]::UTF8)
    
    $text = $merged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
    $words = ($text.Trim() -split '\s+').Count
    Write-Host "Merged ($words words) - $game.html"
}

# Append scripts expansion
$scriptsBase = Get-Content "$root\scripts.html" -Raw -Encoding UTF8
$scriptsExpand = Get-Content "$root\expand-scripts.html" -Raw -Encoding UTF8
$scriptsMerged = $scriptsBase + "`n" + $scriptsExpand
[System.IO.File]::WriteAllText("$root\scripts.html", $scriptsMerged, [System.Text.Encoding]::UTF8)
$text = $scriptsMerged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
$words = ($text.Trim() -split '\s+').Count
Write-Host "Merged ($words words) - scripts.html"

# Append homepage expansion
$homeBase = Get-Content "$root\homepage.html" -Raw -Encoding UTF8
$homeExpand = Get-Content "$root\expand-homepage.html" -Raw -Encoding UTF8
$homeMerged = $homeBase + "`n" + $homeExpand
[System.IO.File]::WriteAllText("$root\homepage.html", $homeMerged, [System.Text.Encoding]::UTF8)
$text = $homeMerged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
$words = ($text.Trim() -split '\s+').Count
Write-Host "Merged ($words words) - homepage.html"

# Delta is already 3128 words, append a bit more
$deltaBase = Get-Content "$root\delta.html" -Raw -Encoding UTF8
$deltaExtra = @"

            <h2>Delta Executor Technical Deep Dive — Architecture &amp; Performance</h2>
            <p>For users who want to understand what happens under the hood, <strong>Delta Executor</strong> employs a sophisticated multi-stage injection process. The injection pipeline begins with process identification, where Delta locates the running Roblox instance in memory. Next, a custom DLL loader is utilized to inject Delta's execution library into the Roblox process space. Once loaded, the execution library establishes hooks into Roblox's Lua scripting environment, creating an execution context that allows custom scripts to run alongside the game's native code.</p>
            <p>The <strong>Level 8 execution engine</strong> achieves its power through several advanced techniques. Direct memory manipulation allows scripts to read and modify game state data without going through normal API channels that might be monitored. Custom Luau bytecode compilation enables scripts to run at near-native performance levels. Thread management systems prevent script execution from blocking the game's main thread, ensuring smooth gameplay even while complex scripts are running in the background.</p>
            <p>On mobile devices, Delta's architecture is adapted to work within the constraints of mobile operating systems. Android injection uses a modified approach that works without root access by leveraging accessibility services and overlay permissions. iOS support utilizes certificate-based installation or jailbreak-specific injection methods depending on the device configuration. Both mobile implementations maintain full Level 8 execution capability despite the additional technical challenges of mobile injection.</p>
            <p>Performance optimization is critical for mobile execution, where CPU and memory resources are significantly more limited than on desktop computers. Delta Executor mobile uses aggressive memory pooling to reduce allocation overhead, lazy loading of script components to minimize initial memory footprint, and adaptive execution throttling that reduces script processing during frame-critical rendering periods to maintain smooth gameplay. These optimizations allow complex scripts like full Blox Fruits hubs with dozens of active features to run smoothly on mid-range mobile devices.</p>

            <h2>Delta Executor Community &amp; Support</h2>
            <p>The Delta Executor community spans millions of users across every region of the globe. BloxCrack provides comprehensive support resources for Delta users including detailed installation guides for every platform, troubleshooting documentation for common issues, frequently updated FAQ sections, and community forums where users can help each other. Our support infrastructure ensures that every user can get Delta up and running quickly regardless of their technical experience level.</p>
            <p>Community engagement is a core part of the Delta Executor experience. User feedback directly influences our development priorities — features requested by the community are evaluated and often implemented in future updates. Bug reports from users help us identify and fix issues that our internal testing may miss. And community-created content like tutorial videos and setup guides extend our documentation in valuable ways.</p>
            <p>Delta Executor's update frequency reflects our commitment to the community. On average, Delta receives a major feature update every 4-6 weeks and compatibility patches within hours of Roblox updates. This relentless development pace ensures that Delta remains at the cutting edge of executor technology and continues to deliver the best possible experience for all users — whether they are on Android phones, iPhones, iPads, or Windows PCs.</p>
"@
$deltaMerged = $deltaBase + "`n" + $deltaExtra
[System.IO.File]::WriteAllText("$root\delta.html", $deltaMerged, [System.Text.Encoding]::UTF8)
$text = $deltaMerged -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&[a-z]+;', ' ' -replace '\s+', ' '
$words = ($text.Trim() -split '\s+').Count
Write-Host "Merged ($words words) - delta.html"

Write-Host "`nAll content files expanded. Now run inject-seo.ps1 to inject into HTML pages."
