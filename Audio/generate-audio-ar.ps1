Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$arVoices = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture -match "ar" }

if ($arVoices.Count -eq 0) {
    Write-Host "No Arabic voice found." -ForegroundColor Red
    Write-Host "Go to: Settings > Time & Language > Speech > Add voices > Arabic" -ForegroundColor Yellow
    exit
}

$preferred = $arVoices | Where-Object { $_.VoiceInfo.Name -match "Hana|Naayf|Shakir" } | Select-Object -First 1
if ($preferred) {
    $synth.SelectVoice($preferred.VoiceInfo.Name)
} else {
    $synth.SelectVoice($arVoices[0].VoiceInfo.Name)
}
Write-Host "Using voice: $($synth.Voice.Name)" -ForegroundColor Green

$synth.Rate = -2
$synth.Volume = 100
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$textsFile = Join-Path $scriptDir "ar-texts.txt"
$steps = [System.IO.File]::ReadAllLines($textsFile, [System.Text.Encoding]::UTF8)

for ($i = 0; $i -lt $steps.Count; $i++) {
    if ($steps[$i].Trim() -eq "") { continue }
    $outPath = Join-Path $scriptDir "step_${i}_ar.wav"
    $synth.SetOutputToWaveFile($outPath)
    $synth.Speak($steps[$i])
    Write-Host "Generated: step_${i}_ar.wav"
}

$synth.SetOutputToDefaultAudioDevice()
Write-Host ""
Write-Host "Done! Arabic files saved to: $scriptDir" -ForegroundColor Green
Write-Host "Upload at: getsuitel.com/dashboard/admin/demo-audio"
