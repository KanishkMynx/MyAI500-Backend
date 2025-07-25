require("dotenv").config();
require("colors");

const express = require("express");
const cors = require("cors");
const ExpressWs = require("express-ws");
const axios = require('axios');

const { agentRouter } = require("./routes/agent");
const { callRouter } = require("./routes/calls");
const { userRouter } = require("./routes/users");
const { memberRouter } = require("./routes/member");
const { defaultRouter } = require("./routes/default");
const { connectDB } = require("./config/db");
const { getFullISTDateTime } = require("./utils/dateTime");
const { callConnection } = require("./controllers/calls");

const PORT = process.env.PORT || 8000;
const app = express();
ExpressWs(app);

// Middleware
app.use(cors()); //  Allow CORS for all origins
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Routers
app.use("/agent", agentRouter);
app.use("/call", callRouter);
app.use("/user", userRouter);
app.use("/member", memberRouter);
app.use("/", defaultRouter);

// WebSocket route for call connection
app.ws("/call/connection", (ws, req) => {
  console.log(`WebSocket connection established`.cyan);
  console.log(`req.url: ${req.url}`.cyan);
  console.log(`req.originalUrl: ${req.originalUrl}`.cyan);
  callConnection(ws, req);
});

// Connect DB
connectDB(process.env.MONGODB_URI);

// Start server
app.listen(PORT, () => {
  console.log(
    `Server started on port ${PORT} at ${getFullISTDateTime(new Date())}`.green
  );
});

app.get('/ip-check', async (req, res) => {
  try {
    const response = await axios.get('https://api64.ipify.org?format=json');
    res.json({ ip: response.data.ip });
  } catch (err) {
    console.error('IP check failed:', err);
    res.status(500).json({ error: 'Failed to get IP' });
  }
});