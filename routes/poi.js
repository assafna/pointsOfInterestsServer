var express = require('express')
var router = express.Router()
var bodyParser = require('body-parser')
var DButilsAzure = require("../DButils")
var jwt = require('jsonwebtoken')
var secret = 'ExpectoPatronum'

router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json());

router.use('/validation', function(req, res, next){
    var token  = req.body.token || req.query.token || req.headers['x-access-token']
    if(token){
        jwt.verify(token, secret, function(err, decoded){
            if(err){
                return res.json({
                    success: false,
                    message: 'failed to authenticate token'
                })
            }
            else{
                var decoded = jwt.decode(token, {complete: true})
                req.decode = decoded
                next()
            }
        })
    }
    else{
        return res.json({
            success: false,
            message: 'failed to authenticate token'
        })
    }

})

router.get('/validation/FavoritePointsOfInterest', function(req,res){
    var username = req.decode.payload.username
    DButilsAzure.execQuery("SELECT POI_id FROM UserFavoritePOI WHERE Username='" + username + "'")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                message: "no Favorite Points Of Interest"
            })
        }
        var poiIds = getStringArray(result)
        return DButilsAzure.execQuery("SELECT POI.*, UserFavoritePOI.POI_order, AddDate FROM POI INNER JOIN UserFavoritePOI ON POI.POI_id=UserFavoritePOI.POI_id WHERE UserFavoritePOI.Username='" + username + "' AND POI.POI_id IN " + poiIds)
    })
    .then(getPoiWithReviews)
    .then(function(result){
        var sorted = result.sort(function(a, b) {return a.poiInfo.POI_order - b.poiInfo.POI_order})
        res.send(sorted)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.get('/RandPopularPointsOfInterst', function(req, res){

    DButilsAzure.execQuery("SELECT * FROM POI")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                message: "no poi exist"
            })
        }
        let choosenPoi = chooseRandPopulerPoi(result, 3, 3)
        return getPoiWithReviews(choosenPoi)
    })
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.get('/validation/RecomendedPointsOfInterest', function(req, res){
    var username = req.decode.payload.username

    DButilsAzure.execQuery("SELECT Category1, Category2, Category3, Category4  FROM Users WHERE Username='" + username + "'")
    .then(function(result){

        if(result.length === 0){
            return res.json({
                success: false,
                message: "username not exist"
            })
        }

        result = result[0]
        var categories = "('" + result.Category1 + "', '" + result.Category2 + "'"
        if(result.Category3 != null && result.Category3.length > 0)
            categories += ", '" + result.Category3 + "'"
        if(result.Category4 != null && result.Category4.length > 0)
            categories += ", '" + result.Category4 + "'"
        categories += ")" 
        return DButilsAzure.execQuery("SELECT *  FROM POI WHERE Category IN " + categories)
    })
    .then(function(result){
        var populerPois = getTopPopulerPOI(result, 2)
        return getPoiWithReviews(populerPois)
    })
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.get('/AllPointsOfInterst', function(req, res){
    DButilsAzure.execQuery("SELECT * FROM POI")
    .then(getPoiWithReviews)
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.get('/PointsOfInterstByCategory/:category', function(req, res){
    var category = req.params.category
    DButilsAzure.execQuery("SELECT * FROM POI WHERE Category='" + category + "'")
    .then(getPoiWithReviews)
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.get('/PointOfInterstInfoByName/:name', function(req, res){
    var poiName = req.params.name
    DButilsAzure.execQuery("SELECT * FROM POI WHERE POI_name='" + poiName + "'")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                success: false,
                message: "poi name not exist"
            })
        }
        return getPoiWithReviews(result)
    })
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.get('/PointOfInterstInfoById/:id', function(req, res){
    var poiId = req.params.id
    DButilsAzure.execQuery("SELECT * FROM POI WHERE POI_id='" + poiId + "'")
    .then(function(result){
        if(result.length === 0){
            return res.json({
                success: false,
                message: "poi id not exist"
            })
        }
        return getPoiWithReviews(result)
    })
    .then(function(result){
        res.send(result)
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

router.put('/validation/updateFavoritePointsOfInterest', function(req, res){
    var username = req.decode.payload.username
    var favorisePois = req.body.poisId

    DButilsAzure.execQuery("SELECT POI_id, AddDate FROM UserFavoritePOI WHERE Username='" + username + "'")
    .then(function(result){
        var toDelete =[]
        var toKeep =[]
        for(var i=0; i< result.length; i++){
            if(favorisePois.includes(result[i].POI_id))
                toKeep[toKeep.length] = result[i].POI_id
            else
                toDelete[toDelete.length] = result[i].POI_id
        }
        var promises = []

        for(var i=0; i<toDelete.length; i++){
            var query = "DELETE FROM UserFavoritePOI WHERE Username='" + username + "' AND POI_id='" + toDelete[i] + "'"
            promises[promises.length] = DButilsAzure.execQuery(query)
        }
        for(var i=0; i<favorisePois.length; i++){
            var query = ""
            if(toKeep.includes(favorisePois[i]))
                query = "UPDATE UserFavoritePOI SET POI_order=" + i + " WHERE Username='" + username + "' AND POI_id='" + favorisePois[i] +"'"
            else
                query = "INSERT INTO UserFavoritePOI (Username, POI_id, POI_order, AddDate) VALUES ('" + username + "', '" + favorisePois[i] + "', " + i + ", GetDate())"
            promises[promises.length] = DButilsAzure.execQuery(query)
        }

        Promise.all(promises)
        .then(function(values){
            res.json({
                success: true,
                message: "favorite poi updated!"
            })
        })
        .catch(function(err){
            console.log(err)
            res.send(err)
        })
    })
    .catch(function(result){
        console.log(err)
        res.send(err)
    })
})

router.post('/validation/rankPointOfInterest', function(req, res){
    console.log("amit");
    var poiId = req.body.poiId
    var rank = parseFloat(req.body.rank)
    DButilsAzure.execQuery("SELECT POI_avgRank, NumOfRanks FROM POI WHERE POI_id='" + poiId +"'")
    .then(function(result){
        if(result.length === 0){
            res.json({
                success: false,
                message: "rong poiId"
            })
        }

        result = result[0]
        var newAvgRank = 0
        var numOfRanks = result.NumOfRanks
        if(result.POI_avgRank == null)
            newAvgRank = rank
        else
            newAvgRank = (result.POI_avgRank + (numOfRanks*rank)) / (numOfRanks + 1.00)
        numOfRanks++
        return DButilsAzure.execQuery("UPDATE POI SET POI_avgRank=" + newAvgRank + ", NumOfRanks=" + numOfRanks + " WHERE POI_id='" + poiId + "'")
    })
    .then(function(result){
        res.json({
            success: true,
            message: "rank saved!"
        })
    })
    .catch(function(err){
        console.log('err: ' + err)
        res.send(err)
    })
})

router.post('/validation/reviewPointOfInterest', function(req, res){
    var username = req.decode.payload.username
    var poiId = req.body.poiId
    var review = req.body.review

    var values = "('" + poiId +"', '" + review + "', GetDate(), '" + username +"')" 
    DButilsAzure.execQuery("INSERT INTO POIReviews (POI_id, POI_review, POI_reviewDate, Username) VALUES " + values)
    .then(function(result){
        res.json({
            success: true,
            message: "review added seccessfuly"
        })
    })
    .catch(function(err){
        console.log(err)
        res.json({
            success: false,
            message: "user cant add more then 1 review for each poi"
        })
    })
})

router.put('/updateNumberOfViewers', function(req, res){
    var poiId = req.body.poiId
    DButilsAzure.execQuery("SELECT NumOfViewers FROM POI WHERE POI_id='" + poiId + "'")
    .then(function(result){
        if(result.length == 0){
            return res.json({
                success: false,
                message: "rong poi id"
            })
        }
        else{
            var numOfViewers = result[0].NumOfViewers + 1
            return DButilsAzure.execQuery("UPDATE POI SET NumOfViewers=" + numOfViewers + " WHERE POI_id='" + poiId + "'")
        }
    })
    .then(function(result){
        res.json({
            success: true,
            message: "update number of viewers successfuly"
        })
    })
    .catch(function(err){
        console.log(err)
        res.send(err)
    })
})

function getTopPopulerPOI(pois, numOfPoi){
    if(pois.length <= 1)
        return pois

    var sorted = pois.sort(function(a, b) {return b.POI_avgRank - a.POI_avgRank})
    var ans = []
    var categories = []
    if(sorted.length <= numOfPoi)
        return sorted
    
    for(var i=0; i<sorted.length && ans.length<numOfPoi; i++){
        if(categories.includes(sorted[i].Category))
            continue
        ans[ans.length] = sorted[i]
        categories[categories.length] = sorted[i].Category
    }
    return ans;
}

function getPoiWithReviews(pois){
    if(pois.length === 0)
        return pois
    
    var poiIds = getStringArray(pois)

    return DButilsAzure.execQuery("SELECT * FROM POIReviews WHERE POI_id IN" + poiIds)
    .then(function(result){
        var sortedReviews = result.sort(function(a, b) {return new Date(b.POI_reviewDate) - new Date(a.POI_reviewDate)})
        var ans = []
        for(var i=0; i<pois.length; i++){
            var reviews = []
            for(var j=0; j<result.length && reviews.length < 2; j++){
                if(pois[i].POI_id.localeCompare(result[j].POI_id) == 0)
                    reviews[reviews.length] = result[j]
            }
            var poi = {
                poiInfo: pois[i], 
                poiReview: reviews
            }
            ans[i] = poi
        }
        return ans
    })
    .catch(function(err){
        console.log(err)
    })
}

function chooseRandPopulerPoi(pois, numOfPoi, minRank){
    if(pois.length === 0)
        return pois

    var populerPois = []
    for(var i=0; i<pois.length; i++){
        if(pois[i].POI_avgRank >= minRank)
            populerPois[populerPois.length] = pois[i]
    }
    if(populerPois.length <= numOfPoi)
        return populerPois
    
    else{
        var randIndex = []
        while(randIndex.length < numOfPoi){
            var randomnumber = Math.floor(Math.random() * populerPois.length)
            if(randIndex.indexOf(randomnumber) > -1) 
                continue
            randIndex[randIndex.length] = randomnumber
        }

        var choosenPoi = []
        for(var i=0; i<numOfPoi; i++){
            choosenPoi[i] = populerPois[randIndex[i]]
        }
        return choosenPoi
    }
}

function getStringArray(arr){
    var stringArray = "("
    for(var i=0; i< arr.length; i++){
        stringArray += "'" + arr[i].POI_id + "'"
        if(i < arr.length-1)
            stringArray += ', '
    }
    stringArray += ")"
    return stringArray
}
module.exports = router