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

app.get("/visitlogdb", (req, res) => {
    let sqlReq = "SELECT first_name, last_name, visit_time FROM visitlog";
    let visits = [];
    conn.query(sqlReq, (err, sqlres) => {
        if (err) {
            throw err;
        } else {
            console.log(sqlres);
            visits = sqlres;
            res.render("visitlogdb", { visits: visits });
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
        res.render("regvisit_db", {notice: notice, firstName: firstName, lastName: lastName});
    }
    else{
        let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES (?, ?)";
        conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlres)=>{
            if(err){
                throw err;
            }
            else{
                notice = "Külastus registreeritud!";
                res.render("regvisit_db", {notice: notice, firstName: firstName, lastName: lastName});
            }
        });
    };
})

app.get("/moviedatadb", (req, res) => {
    let notice = "";
    res.render("moviedatadb", { notice });
});

app.get("/add-person", (req, res) => {
    let notice = "";
    let firstName = "";
    let lastName = "";
    let birthDate = "";
    res.render("moviedatadb", {notice, firstName, lastName, birthDate });
});

app.get("/add-movie", (req, res) => {
    let notice = "";
    let title = "";
    let productionYear = "";
    let duration = "";
    let description = "";
    res.render("moviedatadb", {notice, title, productionYear, duration, description});
});


app.get("/add-role", (req, res) => {
    let notice = "";
    let movieId = "";
    let personId = "";
    let positionName = "";
    let role = "";
    res.render("moviedatadb", {notice, movieId, personId, positionName, role});
});

// Tegelase lisamine
app.post("/add-person", (req, res) => {
    let notice = "";
    let firstName = req.body.first_name;
    let lastName = req.body.last_name;
    let birthDate = req.body.birth_date;

    if (!firstName || !lastName || !birthDate) {
        notice = "Osa andmeid on sisestamata!";
        res.render("moviedatadb", { notice, firstName, lastName, birthDate });
    } else {
        let sqlreq = "INSERT INTO person (first_name, last_name, birth_date) VALUES (?, ?, ?)";
        conn.query(sqlreq, [firstName, lastName, birthDate], (err) => {
            if(err){
                throw err;
            }
            else{
                notice = "Tegelane lisatud!";
                res.render("moviedatadb", { notice, firstName: "", lastName: "", birthDate: "" });
            }
        });
    }
});

// Filmide lisamine
app.post("/add-movie", (req, res) => {
    let notice = "";
    let title = req.body.title;
    let productionYear = req.body.production_year;
    let duration = req.body.duration;
    let description = req.body.description;

    if (!title || !productionYear || !duration || !description) {
        notice = "Osa andmeid on sisestamata!";
        res.render("moviedatadb", { notice, title, productionYear, duration, description });
    } else {
        let sqlreq = "INSERT INTO movie (title, production_year, duration, description) VALUES (?, ?, ?, ?)";
        conn.query(sqlreq, [title, productionYear, duration, description], (err) => {
            if(err){
                throw err;
            }
            else{
                notice = "Film lisatud!";
                res.render("moviedatadb", { notice, title: "", productionYear: "", duration: "", description: "" });
            }
        });
    }
});

// Rolli lisamine
app.post("/add-role", (req, res) => {
    let notice = "";
    let personId = req.body.person_id;
    let movieId = req.body.movie_id;
    let positionName = req.body.position_name;
    let role = req.body.role;

    if (!personId || !movieId || !positionName || !role) {
        notice = "Osa andmeid on sisestamata!";
        return res.render("moviedatadb", { notice, personId, movieId, positionName, role });
    }

    let positionQuery = "SELECT id FROM position WHERE position_name = ?";
    conn.query(positionQuery, [positionName], (err, positionResult) => {
        if (err) throw err;
        if (positionResult.length === 0) {
            notice = "Positsiooni ei leitud.";
            return res.render("moviedatadb", { notice, personId, movieId, positionName, role });
        }
        let positionId = positionResult[0].id;

        let roleQuery = "INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES (?, ?, ?, ?)";
        let values = [personId, movieId, positionId, role];

        conn.query(roleQuery, values, (err) => {
            if(err){
                throw err;
            }
            else{
                notice = "Roll lisatud!";
                res.render("moviedatadb", { notice, personId: "", movieId: "", positionName: "", role: "" });
            }
        });
    });
});


app.listen(5114);