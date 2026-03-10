# Troubleshooting Guide: Port Conflicts

If you see an error like `Bind for 0.0.0.0:5672 failed: port is already allocated` when running `docker-compose up`, it means another service on your computer is already using that port.

## 1. Identify the Conflict (Windows)

Open **PowerShell** or **Command Prompt** as Administrator and run:

```powershell
netstat -ano | findstr :5672
```

The last number in the output is the **PID** (Process ID) of the program using the port.

## 2. Resolve the Conflict

### Option A: Stop the Service (Recommended)
If you have a local version of RabbitMQ installed, stop it:
1. Open **Services** (search for `services.msc` in the Start menu).
2. Look for **RabbitMQ**.
3. Right-click and select **Stop**.

### Option B: Kill the Process
If it's just a rogue process, you can kill it using the PID from Step 1:
```powershell
taskkill /F /PID <PID_NUMBER>
```

---

## 3. Alternative Workaround (Change Ports)

If you cannot stop the local service, you can change the **host port** in `docker-compose.yml`. 

Find the `rabbitmq` section and change the mapping to something else (e.g., `5673` instead of `5672`):

```yaml
  rabbitmq:
    image: rabbitmq:3-management
    container_name: chomp-rabbitmq
    ports:
      - "5673:5672"  # Changed 5672 to 5673 on the host side
      - "15672:15672"
```

**Note:** This only changes the port you use to connect from your *host machine*. Other microservices inside Docker will still work perfectly because they connect via the internal network using the service name `rabbitmq:5672`.

---

## Common Port Conflicts
- **5672**: RabbitMQ
- **15672**: RabbitMQ Management UI
- **5432**: PostgreSQL (Very common if you have pgAdmin/Postgres local)
- **6379**: Redis
- **8000**: Kong Gateway (or any other local dev server)
