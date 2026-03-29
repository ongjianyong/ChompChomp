# ChompChomp System Architecture

## Overview
ChompChomp is a microservices-based application designed to connect users with daily flash sales from restaurants. By splitting the application into smaller, independent services, we can develop, scale, and maintain each part of the system separately.

## How to Start the Project
To run the entire system locally:
1. **Start the Backend Infrastructure & Microservices:**
   Open a terminal in the root directory and run:
   ```bash
   docker-compose up --build -d
   ```
   *This starts Kong, Postgres, Redis, RabbitMQ, and all the microservices.*
2. **Start the Frontend:**
   Open a new terminal in the `frontend` folder and run:
   ```bash
   npm install
   npm run dev
   ```
3. **Access the App:** Open your browser and go to `http://localhost:5173`. 
   *Note: All backend API calls from the frontend go to `http://localhost:8000` (Kong API Gateway).*

## The Role of Docker
Docker is used to package each microservice and infrastructure component into its own isolated environment (called a "container"). 
- **Dependencies:** You don't need to install Python, Postgres, Redis, or RabbitMQ on your actual computer. Docker installs and runs them inside the containers using the `Dockerfile` and `requirements.txt`.
- **Consistency:** It ensures that the app runs exactly the same way on your laptop as it does on a group member's laptop, or the professor's machine.
- **Docker Compose:** The `docker-compose.yml` file acts as the orchestrator. It tells Docker how to start all the containers together and connects them to a shared internal network so they can talk to each other.

## Core Infrastructure Components

### 1. Kong (API Gateway)
- **Role:** The single entry point for all frontend requests. The frontend only ever talks to Kong (on port 8000). 
- **How it works:** Kong receives a request (e.g., `GET /api/v1/inventory`) and acts as a traffic cop, routing the request to the correct microservice container (in this case, `inventory-ms:5001`). It hides the internal ports and architecture from the frontend.

### 2. PostgreSQL (Database)
- **Role:** The main relational database for persistent data storage.
- **How it works:** Instead of one massive database, each microservice has its own isolated logical database within Postgres (e.g., `user_db`, `inventory_db`, `order_db`). This ensures that microservices do not tightly couple their data.

### 3. Redis (In-Memory Data Store)
- **Role:** Used for distributed locking and temporary state management (caching).
- **How it works:** When a user clicks "Buy", we use Redis to place a "lock" on that specific item. This guarantees no two people can buy the exact same physical limited-stock item at the exact same millisecond. It also powers the 1-minute reservation timer. If the timer expires in Redis, a background worker sees this and returns the stock to inventory.

### 3. RabbitMQ (Message Broker)
- **Role:** Handles asynchronous, background communication and complex workflow delays.
- **How it works (Advanced Pattern):** We use a **TTL (Time To Live) + Dead Letter Queue** pattern for tiered notifications. 
  - Listings for "Premium" users are sent to an immediate queue.
  - Listings for "Free" users are sent to a "Waiting Room" queue with a 1-minute TTL.
  - When the TTL expires, RabbitMQ automatically moves the message to a **Dead Letter Queue (DLQ)**, which the `alert-ms` then consumes. This ensures reliable, decentralized delays without blocking Python threads.

## Service-Oriented Architecture (SOA)
ChompChomp follows SOA principles by distinguishing between **Atomic Services** (which manage core entity data) and **Composite (Orchestrator) Services** (which manage business workflows).

### 1. Atomic Services ("The Nouns")
These services are highly specialized, decoupled, and do not call other local services directly. They provide the fundamental building blocks of the system.

- **`user-ms`**: Pure CRUD for all user accounts, including both **Customers** and **Merchants**.
- **`inventory-ms`**: Pure CRUD for food box listings and stock management.
- **`payment-ms`**: Interface for Stripe payment processing.
- **`alert-ms`**: A generic SMS gateway (Twilio/Mock).
- **`order-ms`**: Manages the persistence of order history.

### 3. External Services
- **OneMap SG API**: Used for geocoding Singapore postal codes into coordinates (Latitude/Longitude).
- **Stripe API**: Used for secure payment processing (interfaced via `payment-ms`).
- **Twilio API**: Used for sending SMS alerts (interfaced via `alert-ms`).

### 4. Composite Orchestrators ("The Verbs")
These services manage complex business processes by coordinating multiple atomic services. The frontend communicates primarily with these orchestrators.

- **Discovery Orchestrator**: 
  - Composes `user-ms` and `inventory-ms` data.
  - Handles external geocoding (OneMap SG).
  - **Tier-based Visibility:** Filters listings so "Free" users cannot see or buy items for the first 60 seconds of their existence.
  - **Tiered Notifications:** Manages the routing of new listing events into RabbitMQ TTL/Immediate queues based on user subscription level.
- **Checkout Orchestrator**:
  - Manages the end-to-end reservation and payment lifecycle.
  - Handles the 1-minute stock reservation timeout logic.
  - Coordinates `inventory-ms`, `order-ms`, and `payment-ms`.

## Core Infrastructure Components

### 1. Kong (API Gateway)
- **Role:** The entry point for all frontend requests. Routes traffic to the high-level Orchestrators as well as basic Account management.
- **Routes:**
  - `/api/v1/discovery` -> `discovery-orchestrator`
  - `/api/v1/checkout` -> `checkout-orchestrator`
  - `/api/v1/users` -> `user-ms`

### 2. PostgreSQL (Database)
Each atomic service has its own independent database schema, ensuring data isolation.

### 3. RabbitMQ (Message Broker)
Used for asynchronous cross-service communication (e.g., broadcasting `alert.send` events that the `alert-ms` consumes to send SMS).

## Interaction Models

### Orchestration (Synchronous Workflow)
Used when a business process requires immediate coordination. The **Checkout Orchestrator** calls the **inventory-ms** to reserve stock and the **payment-ms** to charge the user in a single cohesive flow.

### Event-Driven (Asynchronous Workflow)
Used for decoupled side-effects. When the **Discovery Orchestrator** creates a listing, it publishes an event. The **Alert MS** listens for these events to send SMS notifications without blocking the listing creation process.
