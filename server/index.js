require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config");
const requireAuth = require("./middleware/requireAuth");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
	res.json({ status: "ok" });
});

app.use("/auth", require("./routes/auth"));
app.use("/api/sessions", requireAuth, require("./routes/session"));
app.use("/api/verify", require("./routes/verify"));

app.use((err, _req, res, _next) => {
	console.error(err);
	res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));