var express = require('express')
var router = express.Router()
var bodyParser = require('body-parser')
var DButilsAzure = require("../DButils")
var jwt = require('jsonwebtoken')
var secret = 'ExpectoPatronum'

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json());

router.post('/login', function(req, res){
    var username = req.body.username
    var password = req.body.password

    DButilsAzure.execQuery("SELECT * FROM Users WHERE Username = '" + username + "' COLLATE SQL_Latin1_General_CP1_CS_AS AND UserPassword = '" + password + "' COLLATE SQL_Latin1_General_CP1_CS_AS")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                success: false,
                message: "rong username or password"
            })
        }
        var payload = {
            username: username
        }
        var token = jwt.sign(payload, secret, {expiresIn: "1d"})
        console.log(token)
        return res.json({
            success: true,
            token: token
        })
    })
    .catch(function(err){
        console.log("err")
        res.send(err)
    })
})

router.post('/register', function(req, res){
    var promise1 = new Promise(function(resolve, reject){
        username = genrate_userName()
        resolve(username)
    })
    var promise2 = new Promise(function(resolve, reject){ 
        password = genrate_password()
        resolve(password)
    })

    Promise.all([promise1, promise2])
    .then(function(values){

        var queryValues = "('" + values[0] + "', '" + values[1] + "', "
        for(var key in req.body)
        {
            if(key.localeCompare("Ans2") === 0)
                queryValues += "'" + req.body[key] + "')"
            else 
                queryValues += "'" + req.body[key] + "', "
        }
        return DButilsAzure.execQuery("INSERT INTO Users (Username, UserPassword, Firstname, Lastname, City, Country, Email, Category1, Category2, Category3, Category4, QuestId1, QuestId2, Ans1, Ans2) VALUES " + queryValues)
        .then(function(result){
            res.json({
                username: values[0],
                password: values[1]
            })
        })
        .catch(function(err){
            console.log(err)
            res.send(err)
        })
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.post('/retrivePassword', function(req, res){
    var username = req.body.username
    var questId = req.body.questId
    var ans = req.body.ans

    DButilsAzure.execQuery("SELECT UserPassword, QuestId1, QuestId2, Ans1, Ans2 FROM Users WHERE Username='" + username + "'")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                success: false,
                message: "username not exist"
            })
        }
        result = result[0]
        if((result.QuestId1.localeCompare(questId) === 0 && result.Ans1.localeCompare(ans) === 0) || (result.QuestId2.localeCompare(questId) === 0 && result.Ans2.localeCompare(ans) === 0)){
            res.json({
                success: true,
                password: result.UserPassword
            })
        }
        else{
            res.json({
                success: false,
                message: "incorect answer"
            })
        }
    })
    .catch(function(err){
        console.log('error')
        res.send(err)
    })
})

function genrate_userName(){
    var username = "";
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    return DButilsAzure.execQuery("SELECT username FROM Users")
    .then(function(result){  
        while(true)
        {
            for (var i = 0; i < 8; i++)
                username += chars.charAt(Math.floor(Math.random() * chars.length));
            if(result.indexOf(username) < 0)
                return username
        }
    })
    .catch(function(err){
       return err
    })
}

function genrate_password(){
    var password = ""
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 10; i++)
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    return password
}

module.exports = router