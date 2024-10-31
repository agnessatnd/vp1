const express = require("express");
const app = express();
const dtEt = require("./dateTime.js");
const fs = require("fs");
const dbInfo = require("../../vp2024_config.js");
const mysql = require("mysql2");
//paringu lahti harutamiseks POST meetodil
const bodyParser = require("body-parser");
//failide üleslaadimiseks
const multer = require("multer");
// pildimanipulatsiooniks (suuruse muutmine)
const sharp = require("sharp");

app.set("view engine", "ejs");
app.use(express.static("public"));
//paringu URL-i parsimine, falsee kui ainult tekst, true kui muud ka
app.use(bodyParser.urlencoded({extended: true}));

//seadistame vahevara multer fotodde laadimiseks kindlasse kataloogi
const upload = multer({dest: "./public/gallery/orig/"});

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.password,
    database: dbInfo.configData.database
});

app.get("/", (req, res) => {
    const [daysPast, daysLeft] = dtEt.dateDiff();
    
    // uudis
    const sqlReq = "SELECT news_title, news_text, news_date FROM vp1_news ORDER BY news_date DESC LIMIT 1";
    
    conn.query(sqlReq, (err, results) => {
        if (err) {
            throw err;
        }
        const latestNews = results.length > 0 ? {
            news_title: results[0].news_title,
            news_text: results[0].news_text,
            news_date: dtEt.givenDate(results[0].news_date)
        } : null;

        res.render("index", { daysPast: daysPast, daysLeft: daysLeft, latestNews: latestNews });
    });
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

            for (let i = 0; i < sqlres.length; i++) {
                persons.push({
                    first_name: sqlres[i].first_name,
                    last_name: sqlres[i].last_name,
                    birth_date: dtEt.givenDate(sqlres[i].birth_date)
                });
            }

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


app.get("/add-position", (req, res) => {
    let notice = "";
    let positionName = "";
    let description = "";
    res.render("moviedatadb", { notice, positionName, description });
});


app.post("/add-position", (req, res) => {
    let notice = "";
    let positionName = req.body.position_name;
    let description = req.body.description;

    if (!positionName) {
        notice = "Osa andmeid on sisestamata!";
        return res.render("moviedatadb", { notice, positionName });
    }
    else {
        let sqlreq = "INSERT INTO `position` (position_name, description) VALUES (?, ?)";
        conn.query(sqlreq, [positionName, description], (err) => {
            if(err){
                console.log("Position:", positionName);
                console.log("Description:", description);
                throw err;
            }
            else{
                notice = "Positsioon lisatud!";
                res.render("moviedatadb", { notice, positionName: "", description: "" });
            }
        });
    }
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

app.get("/addnews", (req, res) => {
    let newsTitle = "";
    let newsText = "";
    let expired = "";
    let notice = "";

    const today = new Date();
    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(today.getDate() + 10);

    const year = tenDaysFromNow.getFullYear();
    const month = String(tenDaysFromNow.getMonth() + 1).padStart(2, '0');
    const day = String(tenDaysFromNow.getDate()).padStart(2, '0');
    expired = `${year}-${month}-${day}`;

    res.render("addnews", { newsTitle, newsText, expired, notice });
});

app.post("/addnews", (req, res) => {
    let newsTitle = req.body.titleInput;
    let newsText = req.body.newsInput;
    let expired = req.body.expireInput;
    let user = 1;

    if (!newsTitle || newsTitle.length < 3) {
        let notice = "Uudise pealkiri peab olema vähemalt 3 tähemärki!";
        return res.render("addnews", { newsTitle, newsText, expired, notice });
    }
    if (!newsText || newsText.length < 10) {
        let notice = "Uudise sisu peab olema vähemalt 10 tähemärki!";
        return res.render("addnews", { newsTitle, newsText, expired, notice });
    }

    if (!newsTitle || !newsText || !expired) {
        let notice = "Osa andmeid on sisestamata!";
        res.render("addnews", {newsTitle, newsText, expired, notice});
    } else {
        let sqlreq = "INSERT INTO vp1_news (news_title, news_text, expire_date, user_id) VALUES (?, ?, ?, ?)";
        conn.query(sqlreq, [newsTitle, newsText, expired, user], (err) => {
            if (err) {
                throw err;
            } else {
                let notice = "Uudis salvestatud!";
                res.render("addnews", {newsTitle: "", newsText: "", expired: "", notice});
            }
        });
    }
});

app.get("/news", (req, res) => {
    const today = dtEt.dateEt();
    const todayDay = dtEt.dayEt();
    const currentTime = dtEt.timeEt();

    let sqlReq = "SELECT news_title, news_text, news_date FROM vp1_news WHERE expire_date >= ? ORDER BY id DESC";
    const formattedDate = new Date().toISOString().split('T')[0];
    conn.query(sqlReq, [formattedDate], (err, results) => {
        if (err) {
            throw err;
        } else {
            let newsList = results.map(item => ({
                news_title: item.news_title,
                news_text: item.news_text,
                news_date: dtEt.givenDate(item.news_date)
            }));

            res.render("news", { newsList, today, todayDay, currentTime });
        }
    });
});

app.get("/photoupload", (req, res) => {
    res.render("photoupload");
});

app.post("/photoupload", upload.single("photoInput"), (req, res) => {
    console.log(req.body);
    console.log(req.file);
    //genereerime oma failinime
    const fileName = "vp_" + Date.now() + ".jpg";
    //nimetame uleslaetud faili umber
    fs.rename(req.file.path, req.file.destination + fileName,(err)=>{
        console.log(err);

    });
    //teeme pildi kahes erisuuruses
    sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
    sharp(req.file.destination + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName);
    //salvestame andmebaasi
    let sqlReq = "INSERT INTO vp1_photos (file_name, orig_name, alt_text, privacy, user_id) VALUES (?, ?, ?, ?, ?)";
    const user_id = 1;

    conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, user_id], (err, result)=>{
        if(err) {
            throw err;
        }
        else {
            res.render("photoupload");
        }
    });
});

app.listen(5114);