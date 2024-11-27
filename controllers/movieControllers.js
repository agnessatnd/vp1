const mysql = require("mysql2");
const dbInfo = require("../../../vp2024_config.js");
const dtEt = require("../dateTime.js");
const async = require("async");

const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.password,
    database: dbInfo.configData.database
});

// @desc home page for movie section
// @route GET /eestifilm
// @accsess private
const movieHome = (req, res)=>{
    res.render("filmindex");
};

// @desc page for persons in movies
// @route GET /eestifilm/tegelased
// @accsess private
const personInMovie = (req, res) => {
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
};

// @desc page for adding movie relations
// @route GET /eestifilm/addRelations
// @accsess private
const addRelations = (req, res) => {
    // votan kasutusele async mooduli, et korraga teha mitu andmebaasiparingut
    const filmQueries = [
        function(callback){
            let sqlReq1 = "SELECT id, first_name, last_name, birth_date FROM person";
            conn.execute(sqlReq1, (err, result)=>{
                if(err){
                    return callback(err);
                }
                else{
                    return callback(null, result);
                }
            });
        },
        function(callback){
            let sqlReq2 = "SELECT id, title, production_year FROM movie";
            conn.execute(sqlReq2, (err, result)=>{
                if(err){
                    return callback(err);
                }
                else{
                    return callback(null, result);
                }
            });
        },
        function(callback){
            let sqlReq3 = "SELECT id, position_name FROM `position`";
            conn.execute(sqlReq3, (err, result)=>{
                if(err){
                    return callback(err);
                }
                else{
                    return callback(null, result);
                }
            });
        }
    ];
    //paneme need paringud paaralleelselt jooksma, tulemuseks saame kolme paringu koodid
    async.parallel(filmQueries, (err, results)=>{
        if(err){
            throw err;
        }
        else{
            console.log(results);
            //res.render("addRelations", {personList: results[0], movieList: results[1], positionList: results[2], personSelect, movieSelect, positionSelect, roleInput});
            res.locals.personList = results[0];
            res.locals.movieList = results[1];
            res.locals.positionList = results[2];
            res.render("addRelations", {
                personSelect: "",
                movieSelect: "",
                positionSelect: "",
                roleInput: ""
            });
        }
    });
};

// @desc adding movie relations
// @route POST /eestifilm/addRelations
// @accsess private
const addingRelations = (req, res) => {
    let notice = "";
    const { personSelect, movieSelect, positionSelect, roleInput } = req.body;

    if (!personSelect || !movieSelect || !positionSelect) {
        notice = "Osa andmeid on sisestamata!";
        return res.render("addRelations", { notice, personSelect, movieSelect, positionSelect, roleInput, personList: res.locals.personList || [], movieList: res.locals.movieList || [], positionList: res.locals.positionList || [] });
    } else {
        let sqlReq = "INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES (?, ?, ?, ?)";
        conn.execute(sqlReq, [personSelect, movieSelect, positionSelect, roleInput || null], (err) => {
            if(err){
                throw err;
            }
            else{
                res.redirect("addRelations");
            }
        });
    }
};

// @desc page for adding movie data to database
// @route GET /eestifilm/moviedatadb
// @accsess private
const movieDataDB = (req, res) => {
    let notice = "";
    res.render("moviedatadb", { notice });
};

// @desc adding person in movie data to database
// @route POST /eestifilm/moviedatadb
// @accsess private
const personData = (req, res) => {
    let notice = "";
    let firstName = "";
    let lastName = "";
    let birthDate = "";
    res.render("moviedatadb", {notice, firstName, lastName, birthDate });
};

// @desc adding person in movie data to database
// @route POST /eestifilm/moviedatadb
// @accsess private

const addingPersonData = (req, res) => {
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
};

// @desc page for adding movie data to database
// @route GET /eestifilm/moviedatadb
// @accsess private
const movieData = (req, res) => {
    let notice = "";
    let title = "";
    let productionYear = "";
    let duration = "";
    let description = "";
    res.render("moviedatadb", {notice, title, productionYear, duration, description});
};

// @desc adding movie data to database
// @route POST /eestifilm/moviedatadb
// @accsess private
const addingMovieData = (req, res) => {
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
};

// @desc page for position data to database
// @route GET /eestifilm/moviedatadb
// @accsess private
const positionData = (req, res) => {
    let notice = "";
    let positionName = "";
    let description = "";
    res.render("moviedatadb", { notice, positionName, description });
};

// @desc adding position data to database
// @route POST /eestifilm/moviedatadb
// @accsess private
const addingPositionData = (req, res) => {
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
};

module.exports = {
    movieHome,
    personInMovie,
    addRelations,
    addingRelations,
    movieDataDB,
    personData,
    addingPersonData,
    movieData,
    addingMovieData,
    positionData,
    addingPositionData
};