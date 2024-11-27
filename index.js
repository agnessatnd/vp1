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
//parooli krupteerimiseks
const bcrypt = require("bcrypt");
//sessioonide haldamiseks
const session = require("express-session");
const async = require("async");

app.use(session({secret:"MinuSalajaneVoti", saveUninitialized: true, resave: true}));

app.use((req, res, next) => {
    res.locals.user = req.session.userId
        ? {
            id: req.session.userId,
            firstName: req.session.firstName,
            lastName: req.session.lastName
        }
        : null;
    next();
});
    
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

app.get("/logout", (req, res) => {
    req.session.destroy();
    console.log("Kasutaja on välja logitud!");
    res.redirect("/");
});

app.get("/signin", (req, res) => {
    res.render("signin");
});

app.post("/signin", (req, res) => {
    let notice = "";

    if (!req.body.emailInput || !req.body.passwordInput) {
        notice = "E-mail või parool on sisestamata!";
        return res.render("signin", { notice: notice });
    }
    else{
        let sqlReq = "SELECT id, password, first_name, last_name FROM vp1_users WHERE email = ?";
        conn.execute(sqlReq, [req.body.emailInput], (err, result) => {
            if(err){
                console.log("Viga andmebaasist lugedes!" + err);
                notice = "Tehniline viga, sisselogimine ebaoõnestus!";
                res.render("signin", { notice: notice});
            }
            else{
                if(result[0] != null){
                    //kasutaja leiti
                    bcrypt.compare(req.body.passwordInput, result[0].password, (err, compareresult) => {
                        if(err){
                            notice = "Tehniline viga, sisselogimine ebaõnnestus!";
                            res.render("signin", { notice: notice});
                        }
                        else{
                            if(compareresult){
                                //notice = "Sisselogimine õnnestus!";
                                //res.render("signin", { notice: notice});
                                req.session.userId = result[0].id;
                                req.session.firstName = result[0].first_name;
                                req.session.lastName = result[0].last_name;
                                res.redirect("/home");
                            }
                            else{
                                notice = "Kasutajatunnus ja/või parool on vale!";
                                res.render("signin", { notice: notice });
                            }
                        }
                    });
                }
                else{
                    notice = "Kasutajatunnus ja/või parool on vale!";
                    res.render("signin", { notice: notice });
                }

            }
        });
    }
});

app.get("/photos", (req, res) => { 
    res.render("photosindex");
});

const checkLogin = function(req, res, next){
    if(req.session != null){
        if(req.session.userId){
            console.log("Kasutaja on sisselogitud!" + req.session.userId + " " + req.session.firstName + " " + req.session.lastName);
            next();
        }
        else{
            console.log("Login not detected!");
            res.redirect("/signin");
        }
    }
    else{
        console.log("session not detected!");
        res.redirect("/signin");
    }
};

app.get("/home", checkLogin, (req, res) => {
    console.log("Sees on kasutaja: " + req.session.userId + " " + req.session.firstName + " " + req.session.lastName);
    res.render("home");
});


app.get("/signup", (req, res)=>{
    res.render("signup");
});

app.post("/signup", (req, res) => {
    let notice = "Ootan andmeid!";
    const { firstNameInput, lastNameInput, birthDateInput, genderInput, emailInput, passwordInput, confirmPasswordInput } = req.body;
    console.log(req.body);

    if (!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput ||
        req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput) {
        console.log("Osa andmeid on sisetamata või paroolid ei kattu!");
        notice = "Osad andmed on puudu, parool on liiga lühike voi paroolid ei kattu!";
        res.render("signup", {notice: notice, firstNameInput: firstNameInput, lastNameInput: lastNameInput, birthDateInput: birthDateInput, genderInput: genderInput, emailInput: emailInput});
    } else {
        // Kontrollime, kas sellise e-mailiga kasutaja on juba olemas
        const checkEmail = "SELECT id FROM vp1_users WHERE email = ?";
        conn.execute(checkEmail, [req.body.emailInput], (err, result) => {
            if (err) {
                notice = "Tehniline viga, kasutajat ei loodud!";
                res.render("signup", {notice: notice, firstNameInput: firstNameInput, lastNameInput: lastNameInput, birthDateInput: birthDateInput, genderInput: genderInput, emailInput: emailInput});
            } else if (result[0] != null) {
                notice = "Sellise e-mailiga kasutaja on juba olemas!";
                res.render("signup", {notice: notice, firstNameInput: firstNameInput, lastNameInput: lastNameInput, birthDateInput: birthDateInput, genderInput: genderInput, emailInput: emailInput});
            } else {
                notice = "Andmed sisestatud!";
                // Loome parooli räsi jaoks "soola"
                bcrypt.genSalt(10, (err, salt) => {
                    if (err) {
                        notice = "Tehniline viga, kasutajat ei loodud!";
                        res.render("signup", {notice: notice, firstNameInput: firstNameInput, lastNameInput: lastNameInput, birthDateInput: birthDateInput, genderInput: genderInput, emailInput: emailInput});
                    } else {
                        // Krüpteerime parooli
                        bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash) => {
                            if (err) {
                                notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud!";
                                res.render("signup", {notice: notice, firstNameInput: firstNameInput, lastNameInput: lastNameInput, birthDateInput: birthDateInput, genderInput: genderInput, emailInput: emailInput});
                            } else {
                                let sqlReq = "INSERT INTO vp1_users (first_name, last_name, birth_date, gender, email, password) VALUES (?, ?, ?, ?, ?, ?)";
                                conn.execute(sqlReq, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result) => {
                                    if (err) {
                                        notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud!";
                                        res.render("signup", {notice: notice, firstNameInput: firstNameInput, lastNameInput: lastNameInput, birthDateInput: birthDateInput, genderInput: genderInput, emailInput: emailInput});
                                    } else {
                                        notice = "Kasutaja loodud!";
                                        res.render("signup", {notice: notice});
                                    }
                                });//conn.execute loppeb
                            }
                        });//hash loppeb
                    }
                });//genSalt loppeb
            }
        });//kui andmed on korras, loppeb
        //res.render("signup");
    }
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
    //console.log(req.body);
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
                    //console.log("Faili kirjutati!");
                    res.render("regvisit");
                }
            });

        }
    });
});

app.get("/visitlog", checkLogin, (req, res)=>{
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


app.get("/visitlogdb", checkLogin, (req, res) => {
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

//uudiste osa eraldi marsruutide failiga
const movieRoutes = require("./routes/movieRoutes");
app.use("/eestifilm", movieRoutes);

const newsRoutes = require("./routes/newsRoutes");
app.use("/news", newsRoutes);

app.get("/photos/photoupload", checkLogin, (req, res) => {
    let notice = "";

    res.render("photoupload", { notice });
});

app.post("/photos/photoupload", checkLogin, upload.single("photoInput"), (req, res) => {
    let notice = "";
    console.log(req.body);
    console.log(req.file);
    //genereerime oma failinime
    const fileName = "vp_" + Date.now() + ".jpg";
    const user_id = req.session.userId;

    if (!user_id) {
        notice = "Kasutaja pole sisse logitud!";
        return res.render("photoupload", { notice });
    }
    //nimetame uleslaetud faili umber
    if (!req.file) {
        notice = "Pildifail on sisestamata!";
        return res.render("photoupload", { notice });
    }
    fs.rename(req.file.path, req.file.destination + fileName,(err)=>{
        console.log(err);

    });
    //teeme pildi kahes erisuuruses
    sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
    sharp(req.file.destination + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName);
    //salvestame andmebaasi
    let sqlReq = "INSERT INTO vp1_photos (file_name, orig_name, alt_text, privacy, user_id) VALUES (?, ?, ?, ?, ?)";

    conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, user_id], (err, result)=>{
        if(err) {
            throw err;
        }
        else {
            notice = "Pilt laeti üles!";
            res.render("photoupload", { notice });
        }
    });
});

app.get("/photos/gallery", checkLogin, (req, res) => {

    let sqlReq = "SELECT id, file_name, alt_text FROM vp1_photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC;"
    const privacy = 3;
    let photoList = [];
    conn.execute(sqlReq, [privacy], (err, results) => {
        if (err) {
            throw err;
        }
        else{
            for(let i = 0; i < results.length; i++){
                photoList.push({id: results[i].id, href: "/gallery/thumb/", filename: results[i].file_name, alt: results[i].alt_text});
            }
            res.render("gallery", { listData: photoList });
        }
    });
});

app.listen(5114);