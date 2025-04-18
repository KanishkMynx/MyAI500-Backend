require("dotenv").config();
require("colors");

const express = require("express");
const ExpressWs = require("express-ws");

// import routers
// const agentRouter = require("./routes/agent");
const { callRouter } = require("./routes/calls");
const { userRouter } = require("./routes/users");
const { defaultRouter } = require("./routes/default");
const { connectDB } = require("./config/db");
const { getFullISTDateTime } = require("./utils/dateTime");

const PORT = process.env.PORT || 8000;
const app = express();
ExpressWs(app);

app.use("/call", callRouter);
app.use("/user", userRouter);
app.use("/", defaultRouter);

connectDB(process.env.MONGODB_URI);

app.listen(PORT, () => {
  console.log(
    `Server started on port ${PORT} at ${getFullISTDateTime(new Date())}`
  );
});