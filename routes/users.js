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
    console.log(username);
    DButilsAzure.execQuery("SELECT * FROM Users WHERE Username = '" + username + "' COLLATE SQL_Latin1_General_CP1_CS_AS AND UserPassword = '" + password + "' COLLATE SQL_Latin1_General_CP1_CS_AS")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                success: false,
                message: "wrong username or password"
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
        var firstName = req.body["Firstname"]
        var lastName = req.body["Lastname"]
        var city = req.body["City"]
        var country = req.body["Country"]
        var email = req.body["Email"]
        var category1 = req.body["Category1"]
        var category2 = req.body["Category2"]
        var category3 = req.body["Category3"]
        var category4 = req.body["Category4"]
        var questId1 = req.body["QuestId1"]
        var questId2 = req.body["QuestId2"]
        var ans1 = req.body["Ans1"]
        var ans2 = req.body["Ans2"]
        
        return DButilsAzure.execQuery("INSERT INTO Users (Username, UserPassword, Firstname, Lastname, City, Country, Email, Category1, Category2, Category3, Category4, QuestId1, QuestId2, Ans1, Ans2) VALUES " +  queryValues + "'" + firstName + "', '" + lastName + "', '" + city + "', " + country + ", '" + email + "', " + category1 + ", " + category2 + ", " + category3 + ", " + category4 + ", " + questId1 + ", " + questId2 + ", '" + ans1 + "', '" + ans2 + "')")
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
    console.log(req)
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