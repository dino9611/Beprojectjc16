const { mysqldb } = require("./../connection");
const {
  createAccessToken,
  createEmailVerifiedToken,
  createTokenRefresh,
} = require("./../helpers/createToken");
const fs = require("fs");
const hashpass = require("./../helpers/hashingpass");
const { v4: uuidv4 } = require("uuid");
const { promisify } = require("util");
const path = require("path");
const handlebars = require("handlebars");
const transporter = require("./../helpers/transporter");
const dba = promisify(mysqldb.query).bind(mysqldb);
const jwt = require("jsonwebtoken");

const dbprom = (query, arr = []) => {
  return new Promise((resolve, reject) => {
    mysqldb.query(query, arr, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = {
  Register: async (req, res) => {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).send({ message: "bad request" });
      }
      let sql = `select * from users where username=? `;
      //   get username yang sama
      const datausers = await dba(sql, [username]);
      if (datausers.length) {
        //   masuk disini jika username samaa
        return res.status(500).send({ message: "username telah terdaftar" });
      } else {
        sql = `insert into users set ?`;
        const iduser = uuidv4();
        let data = {
          idusers: iduser,
          username: username,
          password: hashpass(password),
          email: email,
        };
        // insert users
        await dba(sql, data);
        sql = `select idusers,username,email,isverified,role from users where idusers = ? `;

        // get data user lagi
        const datauser = await dba(sql, [iduser]);
        console.log(datauser);
        let filepath = path.resolve(
          __dirname,
          "../template/emailVerification.html"
        );
        const htmlrender = fs.readFileSync(filepath, "utf-8");
        const template = handlebars.compile(htmlrender);
        let dataToken = {
          idusers: datauser[0].idusers,
          username: datauser[0].username,
        };
        // buat token email,access,refresh
        const tokenEmail = createEmailVerifiedToken(dataToken);
        const tokenAccess = createAccessToken(dataToken);
        // const decoded = jwt.verify(tokenAccess, "saitama");
        // console.log(decoded);
        // console.log(new Date());
        // console.log(new Date(decoded.exp * 1000).getHours());
        // console.log(new Date(decoded.iat * 1000));
        // console.log(decoded.iat);
        // console.log(decoded.exp - decoded.iat);
        const tokenRefresh = createTokenRefresh(dataToken);
        const link = "http://localhost:3000/verified/" + tokenEmail;
        const htmltoemail = template({ username: username, link: link });
        // kirim email
        await transporter.sendMail({
          from: "raja bajak laut <dinotestes12@gmail.com>",
          to: email,
          subject: "Hai konfirm cargo",
          html: htmltoemail,
        });
        // buat res responsheader
        res.set("x-token-access", tokenAccess);
        res.set("x-token-refresh", tokenRefresh);
        // kriim data
        return res.status(200).send({ ...datauser[0], cart: [] });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  keeplogin: async (req, res) => {
    try {
      const { idusers } = req.user;
      let sql = `select idusers,username,email,isverified,role from users where idusers = ? `;
      // get data user lagi
      const datauser = await dbprom(sql, [idusers]);
      // get cart user
      sql = `select id,p.*,qty from ordersdetail od join products p on od.products_id = p.idproducts  
      where isdeleted= 0 and orders_id = 
      (select idorders from orders 
      where status = 'onCart' 
      and users_id = ?);`;
      let cart = await dbprom(sql, [idusers]);
      return res.status(200).send({ ...datauser[0], cart: cart });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  login: async (req, res) => {
    try {
      const { emailorusername, password } = req.body;
      if (!emailorusername || !password) {
        return res.status(400).send({ message: "bad request" });
      }

      // mysqldb.query(sql,(err,result))
      let sql = `select idusers,username,email,isverified,role from users where (username= ? or email = ?) and password = ? `;
      const datauser = await dba(sql, [
        emailorusername,
        emailorusername,
        hashpass(password),
      ]);
      if (datauser.length) {
        // get cart user
        sql = `select id,p.*,qty from ordersdetail od join products p on od.products_id = p.idproducts  
        where isdeleted= 0 and orders_id = 
        (select idorders from orders 
        where status = 'onCart' 
        and users_id = ?);`;
        let cart = await dba(sql, [datauser[0].idusers]);
        let dataToken = {
          idusers: datauser[0].idusers,
          username: datauser[0].username,
        };
        const tokenAccess = createAccessToken(dataToken);
        const tokenRefresh = createTokenRefresh(dataToken);
        res.set("x-token-access", tokenAccess);
        res.set("x-token-refresh", tokenRefresh);
        // kirim data
        return res.status(200).send({ ...datauser[0], cart: cart });
      } else {
        return res.status(500).send({ message: "username tidak terdaftar" });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
};
