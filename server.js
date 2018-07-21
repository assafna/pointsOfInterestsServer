var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cors = require('cors');
app.use(cors());
var DButilsAzure = require('./DButils');
var jwt = require('jsonwebtoken')
var fs = require('fs');
var xml2js = require('xml2js');
//var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var users = require('./routes/users')
var poi = require('./routes/poi')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var port = 3000;
app.listen(port, function () {
    console.log('Example app listening on port ' + port);
});

//-------------------------------------------------------------------------------------------------------------------

app.use('/users', users)
app.use('/poi', poi)

app.get('/Categories', function(req, res){
    DButilsAzure.execQuery("SELECT * FROM Categories")
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

app.get('/Countries', function(req, res){
    DButilsAzure.execQuery("SELECT * FROM Countries")
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

app.get('/Questions', function(req, res){
    DButilsAzure.execQuery("SELECT * FROM Questions")
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

function retriveCountrise(){
    var parser = new xml2js.Parser();
    fs.readFile('./countries.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            for(var i=0;i<result.Countries.Country.length;i++){
                let country = result.data.Countries.Countries[i]
                DButilsAzure.execQuery("INSERT INTO Countries (Country_id, Country_name) VALUES ('" + country.ID + "', '" + country.NAME +"')")
            }
        });
    });
}