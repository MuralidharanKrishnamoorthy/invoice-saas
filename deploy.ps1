# PayMe.ai Deployment Script
$IP = "140.245.199.227"
$KEY = "ssh-key-2026-02-06 (2).key"

Write-Host "--- Bundling application ---" -ForegroundColor Cyan
tar -czf app_bundle.tar.gz --exclude=node_modules --exclude=.git --exclude=*.key --exclude=*.tar.gz .

Write-Host "--- Uploading to Server ($IP) ---" -ForegroundColor Cyan
scp -i $KEY app_bundle.tar.gz ubuntu@${IP}:~/app_bundle.tar.gz

Write-Host "--- Rebuilding and Restarting Containers ---" -ForegroundColor Cyan
# Using a single string without complex nesting to avoid PS 5.1 parser issues
$remoteCommand = "sudo rm -rf ~/app && mkdir -p ~/app && tar -xzf ~/app_bundle.tar.gz -C ~/app && cd ~/app && sudo docker compose build --build-arg VITE_API_URL=/api frontend && sudo docker compose up -d"
ssh -i $KEY ubuntu@$IP $remoteCommand

Write-Host "Final check: http://$IP" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Remove-Item app_bundle.tar.gz
