require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");

const uploadRoutes = require("./routes/upload");
const mcqRoutes = require("./routes/mcq");
const summaryRoutes = require("./routes/summary");

const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/api/upload", uploadRoutes);
app.use("/api/mcq/generate", mcqRoutes);
app.use("/api/summary", summaryRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the running server or set a different PORT.`,
    );
    process.exit(1);
  }

  throw err;
});
