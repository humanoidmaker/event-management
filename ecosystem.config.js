module.exports = {
  apps: [
    {
      name: "event-management-backend",
      cwd: "./backend",
      script: "uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      interpreter: "python3",
      env: {
        PORT: 8000,
        MONGODB_URI: "mongodb://localhost:27017/event_management",
        JWT_SECRET: "change-in-production",
      },
      max_restarts: 10,
      watch: false,
    },    {
      name: "event-management-frontend",
      cwd: "./frontend",
      script: "npx",
      args: "vite --host 0.0.0.0 --port 3000",
      env: {
        PORT: 3000,
      },
      max_restarts: 10,
      watch: false,
    }
  ],
};
