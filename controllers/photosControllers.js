const mysql = require("mysql2");
const dbInfo = require("../../../vp2024_config.js");
const fs = require("fs");
const sharp = require("sharp");
const async = require("async");

const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.password,
    database: dbInfo.configData.database
});

// @desc home page for photos section
// @route GET /photos
// @accsess private
const photosHome = (req, res) => {
    res.render("photosindex");
};

// @desc page for uploading photos
// @route GET /photos/photoupload
// @accsess private
const uploadPhoto = (req, res) => {
    let notice = "";

    res.render("photoupload", { notice });
};

// @desc uploading photos
// @route POST /photos/photoupload
// @accsess private

const uploadingPhoto = (req, res) => {
    let notice = "";
    
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
    sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName), (err) => {
        if (err) console.error("Error resizing for normal size:", err);
    };
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
};

// @desc page for gallery
// @route GET /photos/gallery
// @accsess private

const galleryOpenPage = (req, res) => {
    res.redirect("/photos/gallery/1");
}

const galleryPage = (req, res) => {
    let galleryLinks = "";
    let page = parseInt(req.params.page);
    if(page < 1){
        page = 1;
    }
    const photoLimit = 5;
    let skip = 0;
    let sqlReq = "SELECT id, file_name, alt_text FROM vp1_photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC LIMIT ?, ?";
    const privacy = 3;

    //teeme paringud, mida tuleb kindlasti uksteise jarel teha
    const galleryPageTasks = [
        function(callback){
            conn.execute("SELECT COUNT(id) as photos FROM vp1_photos WHERE privacy = ? AND deleted IS NULL", [privacy], (err, results) => {
                if(err){
                    return callback(err, null);
                }
                else{
                    return callback(null, results);
                }
            });
        },
        function(photoCount, callback){
            console.log("Fotosid on + " + photoCount[0].photos);
            if ((page - 1) * photoLimit >= photoCount[0].photos){
                page = Math.ceil(photoCount[0].photos / photoLimit)
            }
            console.log("Lehekulg on " + page);
            //lingid oleksid
            // <a href="/photos/gallery/1">eelmine leht</a> | <a href="/photos/gallery/2">järgmine leht</a>
            if (page == 1){
                galleryLinks = "eelmine leht &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;";
            }
            else {
                galleryLinks = '<a href="/photos/gallery/' + (page - 1) + '">eelmine leht &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp;';
            }
            if (page * photoLimit >= photoCount[0].photos){
                galleryLinks += "järgmine leht";
            }
            else {
                galleryLinks += '<a href="/photos/gallery/' + (page + 1) + '">järgmine leht</a>';
            }
            return callback(null, page);
        }
    ];
    //async waterfall
    async.waterfall(galleryPageTasks, (err, results)=>{
        if (err){
            throw err;
        }
        else{
            console.log(results);
        }
    })

    /*if(page != parseInt(req.params.page)) {
        res.redirect("/photos/gallery/" + page);
    };*/
    skip = (page - 1) * photoLimit;
    let photoList = [];
    conn.execute(sqlReq, [privacy, skip, photoLimit], (err, results) => {
        if (err) {
            throw err;
        }
        else{
            for(let i = 0; i < results.length; i++){
                photoList.push({id: results[i].id, href: "/gallery/thumb/", filename: results[i].file_name, alt: results[i].alt_text});
            }
            res.render("gallery", { listData: photoList, links: galleryLinks });
        }
    });
};

module.exports = {
    photosHome,
    uploadPhoto,
    uploadingPhoto,
    galleryOpenPage,
    galleryPage
};