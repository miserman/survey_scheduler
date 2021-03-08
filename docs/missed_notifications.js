express = require('express');
app = express();
var path = require('path');
var parser = require('body-parser');
var aws = require('aws-sdk');
ddb = new aws.DynamoDB.DocumentClient({ region:"us-west-1" });
var urlencodedParser = parser.urlencoded({ extended: false })
// var userid, phonenumber;
var queried_userid, queried_phonenumber, queried_date, queried_time, queried_reason;
var queried_user;
app.set('view engine','ejs');
app.use(express.static(__dirname + '/docs/views'));
console.log(__dirname);
app.set('views',path.join(__dirname,'/docs/views'))
app.get('/get_missed', function (req, res) {
    res.render('missed_notifications', {
        title: "get missed notifications", //page title
        action: "/get_missed", //post action for the form
        fields: [
        {name:'userid',type:'text'},// ,property:'required'},   //first field for the form
        {name:'phonenumber',type:'text'}//,property:'required'}   //another field for the form
        ],
        query: false
    });
});
app.post('/get_missed',urlencodedParser, function(req,res){
  
    
        var userid = req.body.userid;
        var phonenumber =  req.body.phonenumber;
        params = {
            TableName: "missed_notifications",
            PartitionKey: "phonenumber",
            KeyConditionExpression:' userid = :id and phonenumber = :phone',
            ExpressionAttributeValues:{
                ':phone': phonenumber,
                ':id': userid
            }
        };
        ddb.query(params, function(err, data){
            if (err) console.log(err);
            else{
                console.log('success');
                data.Items.forEach(function(item) {
                    // queried_user = item.userid;
                    // queried_phonenumber = item.phonenumber;
                    queried_date = item.date;
                    
                    queried_reason = item.reason;
                    queried_time = item.time;
                    var arrays = [queried_date, queried_time, queried_reason]
      
        var zipped = zip(arrays);
        console.log(zipped);

        // res.send({"status": 200});
        res.render("missed_notifications",{
        title: "get missed notifications", //page title
        action: "/get_missed", //post action for the form
        fields: [
        {name:'userid',type:'text',property:'required'},   //first field for the form
        {name:'phonenumber',type:'text',property:'required'}   //another field for the form
        ],
        query: zipped
        })
                
                    
                    })

               
                }
                
        });
        
    // console.log(user);
    function zip(arrays) {
        return arrays[0].map(function(_,i){
            return arrays.map(function(array){return array[i]})
        });
    }
});




//  app.listen(5000,function(){
//         console.log('server running on port 5000');
//     })
