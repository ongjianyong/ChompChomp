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

### 4. RabbitMQ (Message Broker)
- **Role:** Handles asynchronous, background communication between microservices using events.
- **How it works:** Instead of making microservices wait for each other, they "publish" events to RabbitMQ. For example, when an order is paid, `payment_ms` publishes an `order.paid` event. RabbitMQ holds this message and routes it to any service that cares (like `logistics_ms` to find a driver, and `notification_ms` to send an SMS).

## The Microservices

### 1. User MS (`user_ms`)
- **Role:** Handles user authentication, registration, and profile management.

### 2. Inventory MS (`inventory_ms`)
- **Role:** Manages the restaurant listings, food boxes, and tracks available stock quantities. It handles locking and releasing stock during checkout.

### 3. Order MS (`order_ms`)
- **Role:** Manages the lifecycle of an order. It creates a temporary reservation, applies the 1-minute timeout, and confirms the final order state when payment succeeds.

### 4. Payment MS (`payment_ms`)
- **Role:** Processes credit card transactions using the Stripe API. It generates the checkout link and verifies payment success.

### 5. Logistics MS (`logistics_ms`)
- **Role:** Simulates finding a delivery courier for users who choose delivery instead of pickup.

### 6. Notification MS (`notification_ms`)
- **Role:** Sends SMS alerts to users using the Twilio API (e.g., sending receipts after payment).

## HTTP vs. AMQP: How They Talk to Each Other

### HTTP (Synchronous / Real-Time)
- **What it is:** The standard web request protocol (like loading a webpage). It is a "request-response" model. The caller waits until the receiver answers.
- **Where it's used:**
  - Frontend calling Kong API Gateway.
  - Kong routing to the internal Microservices.
  - Microservices making external API calls (e.g., calling Stripe or Twilio).
  - Microservices communicating when an immediate answer is required (e.g., `order_ms` calling `inventory_ms` to check if stock is available *right now* to complete a reservation).

### AMQP / RabbitMQ (Asynchronous / Background)
- **What it is:** A "publish-subscribe" model. A service shouts a message ("Event happened!") into a queue and immediately moves on. Other services listen to the queue and react whenever they have time.
- **Where it's used:**
  - `payment_ms` telling the system an order was paid.
  - `logistics_ms` hearing about the payment and finding a driver in the background.
  - `notification_ms` hearing about the payment and sending an SMS in the background.
- **Why?** If sending an SMS via Twilio takes 3 seconds, we don't want the user's browser loading spinner to freeze for 3 seconds while waiting. We use AMQP so `payment_ms` can instantly return a "Success" page to the user, while the SMS handles itself independently in the background.
