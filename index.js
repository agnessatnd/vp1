const express = require("express");
const app = express();
const dtEt = require("./dateTime.js");
const fs = require("fs");
//paringu lahti harutamiseks POST meetodil
const bodyParser = require("body-parser");

app.set("view engine", "ejs");
app.use(express.static("public"));
//paringu URL-i parsimine, falsee kui ainult tekst, true kui muud ka
app.use(bodyParser.urlencoded({extended: false}));

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

app.listen(5114);