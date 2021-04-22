const { mysqldb } = require("./../connection");
const { uploader } = require("./../lib");
const fs = require("fs");
module.exports = {
  getProductsAdmin: (req, res) => {
    const { pages, limit } = req.query; //1 maka 0 , 2 maka 5 3 maka rumus =(pages-1)*5
    if (!pages || !limit) {
      return res.status(400).send({ message: "bad request" });
    }
    let sql = `select p.*,c.name as namacategory from products p join category c on p.category_id=c.id limit ${mysqldb.escape(
      (parseInt(pages) - 1) * 5
    )},${mysqldb.escape(parseInt(limit))}`;
    mysqldb.query(sql, (err, dataproducts) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      mysqldb.query(`select count(*) as total from products`, (err, total) => {
        if (err) {
          console.log(err);
          return res.status(500).send({ message: "server error" });
        }
        res.set("x-total-count", total[0].total);
        return res.status(200).send(dataproducts);
      });
    });
  },
  getProductsCategory: (req, res) => {
    sql = `select * from category`;
    mysqldb.query(sql, (err, category) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }

      return res.status(200).send(category);
    });
  },
  postProducts: (req, res) => {
    try {
      const path = "/products"; //ini terserah

      const upload = uploader(path, "PROD").fields([
        { name: "imagebg" },
        { name: "imagedetail" },
      ]);
      upload(req, res, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Upload picture failed !", error: err.message });
        }
        console.log("berhasil upload");
        console.log(req.files);
        const { imagebg, imagedetail } = req.files;
        const imagePath = imagebg ? path + "/" + imagebg[0].filename : null;
        console.log(imagePath);
        let arr = [];
        imagedetail.forEach((val) => {
          let imageDetailPath = val ? path + "/" + val.filename : null;
          arr.push(imageDetailPath);
        });
        const data = JSON.parse(req.body.data);
        const datainsert = {
          name: data.name,
          description: data.deskripsi,
          price: data.harga,
          tahun: data.tahun,
          category_id: data.categoryId,
          image: imagePath,
          image_detail: JSON.stringify(arr),
        };
        mysqldb.query(
          "insert into products set ?",
          datainsert,
          (err, result) => {
            if (err) {
              if (imagePath) {
                fs.unlinkSync("./public" + imagePath);
              }
              arr.forEach((val) => {
                if (val) {
                  fs.unlinkSync("./public" + val);
                }
              });
              return res.status(500).send(err);
            }
            return res.status(200).send({ message: "berhasil" });
          }
        );
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
};
