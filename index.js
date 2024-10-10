const express = require("express");
const app = express();
const dtEt = require("./dateTime.js");
const fs = require("fs");
const dbInfo = require("../../vp2024_config.js");
const mysql = require("mysql2");
//paringu lahti harutamiseks POST meetodil
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.use(express.static("public"));
//paringu URL-i parsimine, falsee kui ainult tekst, true kui muud ka
app.use(bodyParser.urlencoded({extended: false}));

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.password,
    database: dbInfo.configData.database
});

app.get("/", (req, res)=>{
    //res.send("Express läks täiesti käima!");'
    res.render("index");
});

app.get("/timenow", (req, res)=>{
    const weekdayNow = dtEt.dayEt();
    const dateNow = dtEt.dateEt();
    const timeNow = dtEt.timeEt();
    res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});
});

app.get("/justlist", (req, res)=>{
    let folkWisdom = [];
    fs.readFile("public/text_files/vanasonad.txt", "utf-8", (err, data)=>{
        if(err){
            //throw err;
            res.render("justlist", {h2: "Vanasonad", listData: ["Ei leidnud uhtegi vanasona"]});
        }
        else {
            folkWisdom = data.split(";");
            res.render("justlist", {h2: "Vanasõnad", listData: folkWisdom});
        }
    });
});

app.get("/regvisit", (req, res)=>{
    res.render("regvisit");
});

app.post("/regvisit", (req, res)=>{
    console.log(req.body);
    const weekdayNow = dtEt.dayEt();
    const dateNow = dtEt.dateEt();
    const timeNow = dtEt.timeEt();

    fs.open("public/text_files/visitorlog.txt", "a", (err, file)=>{
        if(err){
            throw err;
        }
        else {
            fs.appendFile("public/text_files/visitorlog.txt", req.body.firstNameInput + " " + req.body.lastNameInput + ", " +  weekdayNow + ", " + dateNow + ", " + timeNow + ";", (err)=>{
                if(err){
                    throw err;
                }
                else {
                    console.log("Faili kirjutati!");
                    res.render("regvisit");
                }
            });

        }
    });
});

app.get("/visitlog", (req, res)=>{
    let log = [];
    fs.readFile("public/text_files/visitorlog.txt", "utf-8", (err, data)=>{
        if(err || data.length === 0){
            //throw err;
            res.render("visitlog", {visit: "Külastuslogi", listData: ["Ei leidnud ühtegi külastust"]});
        }
        else {
            log = data.split(";").filter(item => item.trim() !== "");
            res.render("visitlog", {visit: "Külastuslogi", listData: log});
        }
    });
});

app.get("/eestifilm", (req, res)=>{
    res.render("filmindex");
});

app.get("/eestifilm/tegelased", (req, res) => {
    let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
    let persons = [];
    conn.query(sqlReq, (err, sqlres) => {
        if (err) {
            throw err;
        } else {
            console.log(sqlres);
            persons = sqlres;
            res.render("tegelased", { persons: persons });
        }
    });
});

app.get("/regvisit_db", (req, res)=>{
    let notice = "";
    let firstName = "";
    let lastName = "";
    res.render("regvisit_db", {notice: notice, firstName: firstName, lastName: lastName});
})

app.post("/regvisit_db", (req, res)=>{
    let notice = "";
    let firstName = "";
    let lastName = "";
    if(!req.body.firstNameInput || !req.body.lastNameInput){
        firstName = req.body.firstNameInput;
        lastName = req.body.lastNameInput;
        notice = "Osa andmeid on sisestamata!";
        res.render("reqvisit_db", {notice: notice, firstName: firstName, lastName: lastName});
    }
    else{
        let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES (?, ?)";
        conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlres)=>{
            if(err){
                throw err;
            }
            else{
                notice = "Külastus registreeritud!";
                res.render("reqvisit_db", {notice: notice, firstName: firstName, lastName: lastName});
            }
        });
    };
})

app.listen(5114);