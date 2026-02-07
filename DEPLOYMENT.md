# 🚀 How to Deploy Updates to NudgePay

Follow these steps whenever you make changes to your code and want to see them live on your website.

### 1. The Simple Way (One Command)
I have created a script called `deploy.ps1` in your folder. You can run it in PowerShell:
```powershell
.\deploy.ps1
```

---

### 2. The Manual Way
If you want to do it yourself, these are the 3 steps:

#### Step A: Bundle your code
Run this in your local terminal (Project Folder):
```powershell
tar -czf app_bundle.tar.gz --exclude=node_modules --exclude=.git --exclude=*.key .
```

#### Step B: Upload to the Server
Upload the bundle to your App Server (`140.245.199.227`):
```powershell
scp -i "ssh-key-2026-02-06 (2).key" app_bundle.tar.gz ubuntu@140.245.199.227:~/app_bundle.tar.gz
```

#### Step C: Update the App
Connect to the server and restart the containers:
```powershell
ssh -i "ssh-key-2026-02-06 (2).key" ubuntu@140.245.199.227 "sudo rm -rf ~/app && mkdir -p ~/app && tar -xzf ~/app_bundle.tar.gz -C ~/app && cd ~/app && sudo docker-compose up -d --build"
```

---

### ⚠️ Important Notes
- **Database**: The database is on Server 1 (`152.67.177.160`). You usually don't need to update it unless you change the `docker-compose` for the DB.
- **Keys**: Keep your `.key` files safe! If you lose them, you cannot deploy.
- **Environment Variables**: If you add new variables, remember to update the `.env.oci` files on the server or in your local folder before deploying.
