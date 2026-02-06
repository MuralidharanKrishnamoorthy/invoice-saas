# PayMe.ai Deployment Script
$IP = "140.245.199.227"
$KEY = "ssh-key-2026-02-06 (2).key"

Write-Host "📦 Bundling application..." -ForegroundColor Cyan
tar -czf app_bundle.tar.gz --exclude=node_modules --exclude=.git --exclude=*.key --exclude=*.tar.gz .

Write-Host "🚀 Uploading to Server ($IP)..." -ForegroundColor Cyan
scp -i $KEY app_bundle.tar.gz ubuntu@${IP}:~/app_bundle.tar.gz

Write-Host "🛠️ Rebuilding and Restarting Containers..." -ForegroundColor Cyan
ssh -i $KEY ubuntu@$IP "sudo rm -rf ~/app && mkdir -p ~/app && tar -xzf ~/app_bundle.tar.gz -C ~/app && cd ~/app && sudo docker-compose up -d --build"

Write-Host "✅ Deployment Complete! Check: http://$IP" -ForegroundColor Green
Remove-Item app_bundle.tar.gz
