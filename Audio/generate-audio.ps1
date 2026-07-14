Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$voices = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture -match "en" }
if ($voices.Count -gt 0) {
    $preferred = $voices | Where-Object { $_.VoiceInfo.Name -match "Natural|Neural|Zira|David|Mark|Hazel" } | Select-Object -First 1
    if ($preferred) {
        $synth.SelectVoice($preferred.VoiceInfo.Name)
        Write-Host "Using voice: $($preferred.VoiceInfo.Name)"
    } else {
        $synth.SelectVoice($voices[0].VoiceInfo.Name)
        Write-Host "Using voice: $($voices[0].VoiceInfo.Name)"
    }
}

$synth.Rate = -1
$synth.Volume = 100
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$steps = @(
    "Welcome to GetSuitel, the smart property management platform. Your demo account is fully set up with a real property, tenants, contracts, and invoices. Click Next to begin the tour.",
    "This is the Properties page. Oakwood Residences is a 4-unit residential complex. You can add as many buildings, villas, or compounds as you manage, each with their own units.",
    "Here are the units inside Oakwood Residences. Units 101 and 102 are currently occupied, each linked to a tenant and an active contract. Units 201 and 202 are vacant and available to lease.",
    "The Tenants page shows your current residents. James Carter is in Unit 101 and Sarah Mitchell is in Unit 102. Each tenant has a contract with the rent amount, deposit, and lease dates clearly recorded.",
    "GetSuitel automatically creates a monthly invoice for each active contract. You can see paid invoices and the current pending ones. Tenants receive their invoice by email and can pay directly from their tenant portal.",
    "The Maintenance page shows all requests submitted by your tenants. You can assign them to a service team, update the status as work progresses, and record the final cost when done.",
    "That is the full GetSuitel experience. Start managing your own properties in minutes. Everything you just saw is ready for you from day one."
)

for ($i = 0; $i -lt $steps.Count; $i++) {
    $outPath = Join-Path $scriptDir "step_${i}_en.wav"
    $synth.SetOutputToWaveFile($outPath)
    $synth.Speak($steps[$i])
    Write-Host "Generated: step_${i}_en.wav"
}

$synth.SetOutputToDefaultAudioDevice()
Write-Host ""
Write-Host "Done! 7 files saved to: $scriptDir"
Write-Host "Upload at: getsuitel.com/dashboard/admin/demo-audio"
