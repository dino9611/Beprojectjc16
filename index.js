const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
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
const bearerToken = require("express-bearer-token");
app.use(bearerToken());
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

const { AuthRoutes, ProductsRoutes } = require("./src/routes");
app.use("/auth", AuthRoutes);
app.use("/product", ProductsRoutes);

app.all("*", (req, res) => {
  res.status(404).send("resource not found");
});

app.listen(PORT, () => console.log("listen in port " + PORT));
