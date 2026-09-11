# SwasthyaSetu — Server IP Deployment & Docker Setup Guide

This guide explains how to install Docker, clone/pull this repository on any cloud or on-premise Linux server (Ubuntu/Debian), configure the `.env` for your server's IP address, and launch the entire SwasthyaSetu stack.

---

## 1. Docker & Docker Compose Installation on Ubuntu Server

If Docker is not yet installed on your server, run the following commands:

```bash
# 1. Update package list and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 2. Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Add the Docker repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, containerd, and Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Add your current user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker

# 6. Verify installation
docker --version
docker compose version
```

---

## 2. Clone or Pull the Repository on the Server

```bash
# Clone the repository
git clone https://github.com/amyssnippet/phc.git
cd phc

# If you already have the repository on the server, pull the latest updates:
git pull origin main
```

---

## 3. Server Firewall / Security Group Configuration

Ensure the following inbound ports are open in your server firewall (AWS Security Group / DigitalOcean Firewall / GCP Firewall / UFW):

- **Port 3000 (TCP)**: Frontend Next.js Web Application & Citizen Portal
- **Port 4000 (TCP)**: Backend Express API & WebSocket/SSE Queue Events
- **Port 22 (TCP)**: SSH (keep open for management)

If using `ufw` on Ubuntu:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 4000/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## 4. Configure `.env` for Your Server IP

Copy the `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` using `nano` or `vim`:

```bash
nano .env
```

### Key Values to Update:

Suppose your server's public IP is **`123.45.67.89`** (or your LAN IP **`192.168.1.100`**):

```env
NODE_ENV=production
PORT=4000

# 1. Point the client browser to your Server's API port (4000)
NEXT_PUBLIC_API_BASE_URL=http://123.45.67.89:4000/api/v1

# 2. Allow your Server's frontend (3000) through backend CORS
CORS_ORIGIN=http://123.45.67.89:3000

# 3. Application branding
NEXT_PUBLIC_APP_NAME=SwasthyaSetu
NEXT_PUBLIC_DEMO_MODE=true

# 4. Database & Cache credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mahaswasthya
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/mahaswasthya?schema=public
REDIS_URL=redis://redis:6379

# 5. Cryptographic secrets (Generate strong random strings in production)
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_2026_change_me!
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_2026_change_me!

# 6. Auth settings
OTP_MODE=MOCK
MOCK_OTP=123456
DEMO_MODE=true
LOG_LEVEL=info
```

> **Why this is necessary:**  
> Next.js client-side code runs in the user's browser, NOT on the server. When a user opens `http://123.45.67.89:3000`, their browser needs to make API calls to `http://123.45.67.89:4000/api/v1` (not `localhost`). Passing `NEXT_PUBLIC_API_BASE_URL` and `CORS_ORIGIN` ensures clean cross-origin requests.

---

## 5. Build and Launch the Docker Stack

Run the single command to build and launch all containers:

```bash
docker compose up -d --build
```

Check the status of the containers:

```bash
docker compose ps
```

You should see all 5 containers running:
- `mahaswasthya_postgres` (Healthy on port 5432)
- `mahaswasthya_redis` (Healthy on port 6379)
- `mahaswasthya_backend` (Healthy on port 4000)
- `mahaswasthya_worker` (Up)
- `mahaswasthya_frontend` (Up on port 3000)

---

## 6. Verify Health & Connectivity

### On the Server (CLI):
```bash
# Verify backend API is alive
curl http://localhost:4000/health
# Output: {"success":true,"data":{"status":"healthy",...}}

# Verify database and redis readiness
curl http://localhost:4000/ready
# Output: {"success":true,"data":{"status":"ready","database":"up","postgis":"up","redis":"up"}}

# Verify 50 PHCs are populated
curl http://localhost:4000/api/v1/public/facilities?limit=1
```

### In Your Browser:
Open in any browser:
- **Web Application:** `http://YOUR_SERVER_IP:3000`
- **Backend API:** `http://YOUR_SERVER_IP:4000/health`
- **District Command Center:** `http://YOUR_SERVER_IP:3000/command`
- **Workforce Queue Console:** `http://YOUR_SERVER_IP:3000/portal/queues`

---

## 7. Useful Operational Commands

### View live logs:
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Reset demo data to initial state:
```bash
docker compose exec backend npm run demo:seed
```

### Stop the entire stack:
```bash
docker compose down
```

### Restart after updating `.env`:
```bash
docker compose up -d --build
```
