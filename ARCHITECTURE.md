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

## The 4-Layer Service-Oriented Architecture (SOA)
ChompChomp follows a strict **4-Layer SOA** model to ensure modularity and scalability:

| Layer | Components | Role |
|---|---|---|
| **1. UI Layer** | React, CSS, Vite | The entry point for users (Customers & Merchants). |
| **2. Composite Layer** | Discovery & Checkout Orchestrators | "The Verbs." They coordinate multiple services to fulfill a business process. |
| **3. Atomic Layer** | User MS, Order MS, Inventory MS | "The Nouns." They own a single data entity and its exclusive database. |
| **4. Wrapper Layer** | Payment MS, Alert MS | "The Adapters." They wrap external 3rd-party APIs (Stripe, Twilio). |

## Core Infrastructure Components

### 1. Kong (API Gateway)
- **Role:** The single entry point for all frontend requests. The frontend only ever talks to Kong (on port 8000). 
- **How it works:** Kong receives a request (e.g., `GET /api/v1/inventory`) and acts as a traffic cop, routing the request to the correct microservice container (in this case, `inventory-ms:5001`). It hides the internal ports and architecture from the frontend.

### 2. PostgreSQL (Database)
- **Role:** The main relational database for persistent data storage.
- **How it works:** Instead of one massive database, each microservice has its own isolated logical database within Postgres (e.g., `user_db`, `inventory_db`, `order_db`). This ensures that microservices do not tightly couple their data.

### 3. Redis (In-Memory Data Store)
- **Role:** Used for distributed locking and temporary state management (Session Caching).
- **How it works:** 
  - **Scenario 2 Concurrent Lock:** We use Redis `SETNX` to place a "distributed lock" on an item. This prevents race conditions where two users hit the "Reserve" button simultaneously.
  - **Scenario 3 Timeout Cache:** It powers the 60-second reservation timer. If the user doesn't pay, a background worker sees the expired session and releases the stock.

### 4. RabbitMQ (Message Broker)
- **Role:** Handles asynchronous, background communication and complex workflow delays.
- **How it works (Advanced Pattern):** We use a **TTL (Time To Live) + Dead Letter Queue** pattern for tiered notifications. 
  - Listings for "Premium" users are sent to an immediate queue.
  - Listings for "Free" users are sent to a "Waiting Room" queue with a 60-second TTL.
  - When the TTL expires, RabbitMQ automatically moves the message to a **DLQ**, which the `alert-ms` then consumes.

---

## Service Breakdown

### 1. Atomic Services
These services manage core entity data and have **exclusive ownership** of their databases.

- **User MS**: Manages all accounts (Customers & Merchants). Owns `user_db` (Postgres).
- **Order MS**: Manages persistent order history. Owns `order_db` (Postgres).
- **Inventory MS (OutSystems Cloud)**: Manages food listings and atomic stock updates. Hosted on the OutSystems platform.

### 2. Wrapper Services
Thin adapters that expose external APIs as internal microservices.

- **Payment MS**: Wraps the **Stripe API** for secure payments.
- **Alert MS**: Wraps the **Twilio API** for SMS notifications. It is a RabbitMQ consumer.

### 3. Composite Orchestrators
The "Brains" of the system. They coordinate atomic and wrapper services.

- **Discovery Orchestrator**: 
  - **Geocoding:** Interacts with the **OneMap SG API**.
  - **Tiered Access:** Manages 60-second visibility delays and RabbitMQ tiered notification routing.
  - **GraphQL:** Provides a single, optimized endpoint for the marketplace UI.
- **Checkout Orchestrator**:
  - Manages the race-condition defense layer (Redis Lock).
  - Handles the 60-second payment deadline and automated stock release.
  - Coordinates Inventory, Payment, and Order microservices.

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
