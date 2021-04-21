const jwt = require("jsonwebtoken");

module.exports.verifyTokenAccess = (req, res, next) => {
  // tanpa bearer
  //   const authHeader = req.headers["authorization"];
  //   console.log(authHeader);
  //   const token = authHeader.split(" ")[1]
  //     ? authHeader.split(" ")[1]
  //     : authHeader;
  //   console.log(token);
  // dengan bearer
  console.log("token", req.token);
  const token = req.token;
  const key = "saitama"; // kata kunci terserah
  jwt.verify(token, key, (err, decoded) => {
    if (err) return res.status(401).send({ message: "user unauthorized" });
    console.log(decoded);
    req.user = decoded;
    next();
  });
};

module.exports.verifyEmailToken = (req, res, next) => {
  console.log("token", req.token);
  const token = req.token;
  const key = "king"; // kata kunci terserah
  jwt.verify(token, key, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "user unauthorized" });
    }
    console.log(decoded);
    req.user = decoded;
    next();
  });
};
