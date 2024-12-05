const express = require("express");
const app = express();
const dbInfo = require("../../vp2024_config.js");
const mysql = require("mysql2");
app.use(express.urlencoded({ extended: true })); 

app.set("view engine", "ejs");

const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.password,
    database: dbInfo.configData.database
});

app.get("/", (req, res) => {
    res.render("homepage");
});

app.get("/kokkuvote", (req, res) => {
    let sqlreq = "SELECT truck, weight_in, weight_out, SUM(weight_in-weight_out) AS kokkuvote FROM vp1_viljavedu WHERE weight_out IS NOT NULL GROUP BY truck";
    let data = [];

    conn.query(sqlreq, (err, sqlres)=>{
        if(err){
            throw err;
        }
        else{
            data = sqlres;
            res.render("kokkuvote", {data: data});
        }
    });
});


app.get("/viljaveoandmed", (req, res) => {
    let notice = '';
    let truckInput = '';
    let weightInInput = '';
    let weightOutInput = '';

    let sqlreq = "SELECT id, truck FROM vp1_viljavedu WHERE weight_out IS NULL";
    let trucks = [];

    conn.query(sqlreq, (err, sqlres)=>{
        if(err){
            throw err;
        }
        else{
            trucks = sqlres;
            res.render("viljaveoandmed", {notice: notice, truckInput: truckInput, weightInInput: weightInInput, weightOutInput: weightOutInput, trucks: trucks});
        }
    });
});

app.post("/add", (req, res) => {
    let notice = '';
    let truckInput = req.body.truckInput || '';
    let weightInInput = req.body.weightInInput || '';
    let truckNrInput = req.body.truckNrInput || '';
    let weightOutInput = req.body.weightOutInput || '';

    if (!truckInput || !weightInInput) {
        notice = "Osa andmeid on sisestamata!";
        let sqlreq = "SELECT id, truck FROM vp1_viljavedu WHERE weight_out IS NULL";
        conn.query(sqlreq, (err, trucks) => {
            if (err) throw err;
            res.render("viljaveoandmed", { notice: notice, truckInput, weightInInput, weightOutInput, truckNrInput, trucks });
        });
    } else {
        let sqlreq = "INSERT INTO vp1_viljavedu (truck, weight_in, weight_out) VALUES (?, ?, ?)";
        conn.query(sqlreq, [truckInput, weightInInput, weightOutInput || null], (err) => {
            if (err) throw err;
            notice = "Andmed salvestatud!";
            let reloadSql = "SELECT id, truck FROM vp1_viljavedu WHERE weight_out IS NULL";
            conn.query(reloadSql, (err, trucks) => {
                if (err) throw err;
                res.render("viljaveoandmed", { notice: notice, truckInput, weightInInput, weightOutInput, trucks });
            });
        });
    }
});

app.post("/update", (req, res) => {
    let notice = '';
    let truckNrInput = req.body.truckNrInput || '';
    let weightOutUpdate = req.body.weightOutUpdate || '';

    if (!truckNrInput) {
        notice = "Auto nr on valimata!";
        return res.render("viljaveoandmed", { notice: notice, truckNrInput, weightOutUpdate });
    }

    let sqlreq = "SELECT id, truck FROM vp1_viljavedu WHERE id = ? AND weight_out IS NULL";
    conn.query(sqlreq, [truckNrInput], (err, trucks) => {
        if (err) {
            throw err;
        }

        if (trucks.length === 0) {
            notice = "Sellise numbriga sobivat kirjet ei leitud või on kaal juba sisestatud!";
            return res.render("viljaveoandmed", { notice: notice, truckNrInput, weightOutUpdate });
        }

        let updateSql = "UPDATE vp1_viljavedu SET weight_out = ? WHERE id = ?";
        conn.query(updateSql, [weightOutUpdate, truckNrInput], (err) => {
            if (err) {
                throw err;
            }

            notice = "Andmed uuendatud!";
            let reloadSql = "SELECT id, truck FROM vp1_viljavedu WHERE weight_out IS NULL";
            conn.query(reloadSql, (err, trucks) => {
                if (err) {
                    throw err;
                }
                res.render("viljaveoandmed", { notice: notice, truckNrInput, weightOutUpdate, trucks });
            });
        });
    });
});



app.listen(5114);