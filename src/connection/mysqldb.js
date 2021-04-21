//? connect sql to nodejs
const mysql = require("mysql");
const connection = mysql.createConnection({
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "cargo",
});
// const connection = mysql.createConnection({
//   host: "db4free.net",
//   user: "dino96112",
//   password: "241d9e23",
//   database: "jc12hokihoki",
//   port: 3306,
// });
connection.connect((err) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log("connected as id " + connection.threadId);
});

module.exports = connection;
