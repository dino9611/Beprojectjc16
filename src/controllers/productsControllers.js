const { mysqldb } = require("./../connection");
const { uploader } = require("./../lib");
const fs = require("fs");
module.exports = {
  getProductsAdmin: (req, res) => {
    const { pages, limit } = req.query; //1 maka 0 , 2 maka 5 3 maka rumus =(pages-1)*5
    if (!pages || !limit) {
      return res.status(400).send({ message: "bad request" });
    }
    let sql = `select p.*,c.name as namacategory,sum(i.qty)as qty from products p 
    join category c on p.category_id=c.id
    join inventory i on p.idproducts = i.products_id group by p.idproducts limit ${mysqldb.escape(
      (parseInt(pages) - 1) * limit
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
  getProductsbyid: (req, res) => {
    const { id } = req.params;
    let sql = `select p.*,c.name as namacategory,sum(i.qty)as qty from products p 
    join category c on p.category_id=c.id
    join inventory i on p.idproducts = i.products_id where idproducts= ?  `;
    mysqldb.query(sql, [parseInt(id)], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      return res.status(200).send(result[0]);
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
        if (imagedetail) {
          imagedetail.forEach((val) => {
            let imageDetailPath = val ? path + "/" + val.filename : null;
            arr.push(imageDetailPath);
          });
        }
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
            var insertinvent = {
              qty: data.qty,
              products_id: result.insertId,
            };
            // console.log(insertinvent)
            mysqldb.query(
              `insert into inventory set ?`,
              insertinvent,
              (err) => {
                if (err) {
                  return res.status(500).send(err);
                }
                return res.status(200).send({ message: "berhasil" });
              }
            );
          }
        );
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  deleteProducts: (req, res) => {
    const { id } = req.params;
    let sql = `select * from products where idproducts= ?`;
    mysqldb.query(sql, [id], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      sql = `delete from products where idproducts = ?`;
      mysqldb.query(sql, [id], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).send({ message: "server error" });
        }
        if (result[0].image) {
          // hapus foto di dalam server api jika image tidak null
          fs.unlinkSync("./public" + result[0].image);
        }
        let image_detail = JSON.parse(result[0].image_detail);
        if (image_detail.length) {
          image_detail.forEach((val) => {
            fs.unlinkSync("./public" + val);
          });
        }
        return res.status(200).send({ message: "berhasil" });
      });
    });
  },
  latihan: (req, res) => {
    const { minprice, tahun, categoryid } = req.query;
    let sql = `select * from products p join category c on p.category_id = c.id where NOT idproducts=0 `;
    if (minprice) {
      sql += `and price >= ${mysqldb.escape(minprice)} `; //dikasih spasi diujung
    }
    if (tahun) {
      sql += `and tahun = ${mysqldb.escape(tahun)} `;
    }
    if (categoryid) {
      sql += `and category_id = ${mysqldb.escape(categoryid)}`;
    }
    mysqldb.query(sql, (err, prod) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      return res.status(200).send(prod);
    });
  },
  PostRating: (req, res) => {
    const { rating, products_id, users_id } = req.body;
    let sql = `insert into rating set ?`;
    let dataInsert = {
      rating: rating,
      products_id,
      users_id,
    };
    mysqldb.query(sql, dataInsert, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      let idrating = result.insertId;
      return res.status(200).send({ idrating, message: "success add rating" });
    });
  },
};
