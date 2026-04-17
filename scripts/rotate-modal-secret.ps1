# rotate-modal-secret.ps1
# Run after rotating AWS credentials to update the Modal aura-x-secrets secret.
#
# Usage:
#   .\scripts\rotate-modal-secret.ps1 -KeyId "AKIA..." -Secret "your-secret"

param(
    [Parameter(Mandatory = $true)]
    [string]$KeyId,

    [Parameter(Mandatory = $true)]
    [string]$Secret,

    [string]$Bucket = "aura-x-audio-generation",
    [string]$Region = "us-east-1"
)

Write-Host "Updating Modal secret 'aura-x-secrets'..." -ForegroundColor Cyan

modal secret create aura-x-secrets `
    AWS_ACCESS_KEY_ID="$KeyId" `
    AWS_SECRET_ACCESS_KEY="$Secret" `
    S3_BUCKET="$Bucket" `
    S3_REGION="$Region" `
    --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "Modal secret updated successfully." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: redeploy the Modal app so it picks up the new secret:" -ForegroundColor Yellow
    Write-Host "  cd modal_backend && modal deploy modal_app.py" -ForegroundColor White
} else {
    Write-Host "Failed to update Modal secret. Check that 'modal' CLI is installed and you are logged in." -ForegroundColor Red
    Write-Host "  modal token new" -ForegroundColor White
}
