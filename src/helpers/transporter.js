const { createTransport } = require("nodemailer");
let transporter = createTransport({
  service: "gmail",
  auth: {
    user: "dinotestes12@gmail.com",
    pass: "ngmudtdpjoaunnec",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
