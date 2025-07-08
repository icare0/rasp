## Architecture

Here's a sequence diagram illustrating the interaction between the user, frontend, backend, and Raspberry Pi:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant RaspberryPi

    User->>Frontend: Interacts with UI (e.g., start project)
    Frontend->>Backend: Sends API request (e.g., POST /api/commands/start/:projectId)
    Backend->>RaspberryPi: Executes command (child_process.exec)
    RaspberryPi->>Backend: Returns command output
    Backend->>MongoDB: Saves command log
    Backend->>Frontend: Sends API response (success/failure)
    Frontend->>User: Updates UI
    Backend->>Frontend: Sends real-time updates via Socket.IO (logs)
    User->>Frontend: Observes real-time updates

