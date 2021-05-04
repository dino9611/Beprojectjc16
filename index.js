const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bearerToken = require("express-bearer-token");
app.use(bearerToken());
app.use(
  cors({
    exposedHeaders: [
      "Content-Length",
      "x-token-access",
      "x-token-refresh",
      "x-total-count",
    ], // exposed header untuk token
  })
);
const PORT = 5000;
const morgan = require("morgan");

morgan.token("date", function (req, res) {
  return new Date();
});

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :date")
);

app.use(express.urlencoded({ extended: false }));

app.use(express.json());
//? menyediakan file statis
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("<h1>selamat datang di API 1.0 EmerceApp</h1>");
});
// const schedule = require("node-schedule");

// schedule.scheduleJob("*/10 * * * * *", function (firedate) {
//   console.log("The answer to life, the universe, and everything!" + firedate);

// });
const {
  AuthRoutes,
  ProductsRoutes,
  TransactionsRoutes,
} = require("./src/routes");
app.use("/auth", AuthRoutes);
app.use("/product", ProductsRoutes);
app.use("/trans", TransactionsRoutes);

app.all("*", (req, res) => {
  res.status(404).send("resource not found");
});

app.listen(PORT, () => console.log("listen in port " + PORT));
