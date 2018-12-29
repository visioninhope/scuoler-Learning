const express = require('express');

//const mysql = require('mysql');
const pg=require('pg');

//const mysql = new pg.Client(connectionString);
//mysql.connect();

const app=express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

//session code
const cookieParser = require('cookie-parser');
var session = require('express-session');

app.use(cookieParser());
app.use(session({secret:'secr3',resave:false,saveUninitialized:false, maxAge: 24 * 60 * 60 * 1000}));

//end of session code

const url = require('url');

const configuration=require('./Configuration');

//---QUIZ---
/* function for returning a Promise object that retrives the set of records in the
 quiz descriptions from quiz table in database*/
function getQuizList(){
      var quizList=['General$,defaultUser'];
        var pool = new pg.Pool({
          host: configuration.getHost(),
          user: configuration.getUserId(),
          password: configuration.getPassword(),
          database: configuration.getDatabase(),
          port:configuration.getPort(),
          ssl:true
        });
        var sql = "SELECT id,description FROM Quiz";
        return new Promise(function(resolve,reject){
          pool.query(sql, function (err, result, fields){
            if (err)
                  reject(err);
            else{
             var i=0;
             for(i=0;i<result.rows.length;i++){
               quizList.push(result.rows[i].description+'$,'+result.rows[i].id);
             }
             resolve(quizList);
           }
        });
        });
      }

exports.getQuizList=getQuizList;

const Client=require('pg-native');

  //---QUIZ---
  /* function for returning a Promise object that retrives the set of records in the
   quiz descriptions from quiz table in database*/
  function getQuizListSync(){
        var quizList=['General$,defaultUser'];
        var client = Client();
        var connStr='postgresql://'+configuration.getUserId()+':'+
        configuration.getPassword()+'@'+configuration.getHost()+':'+
        configuration.getPort()+'/'+configuration.getDatabase();
        client.connectSync(connStr);
        var sql = "SELECT id,description FROM Quiz";
        var rows=client.querySync(sql);
        var i=0;
        for(i=0;i<rows.length;i++){
            quizList.push(rows[i].description+'$,'+rows[i].id);
        }
        return quizList;
  }

exports.getQuizListSync=getQuizListSync;

/* function for handling  http requests to insert to the quiz table in database*/
exports.insertQuizToDB=function(req,res){
  let quizDescription=req.body.quizDescription;
  let courseId=req.body.courseId;
  let authorName=req.body.authorName;

  console.log('in quiz inserting to db');
  var pool = new pg.Pool({
    host: configuration.getHost(),
    user: configuration.getUserId(),
    password: configuration.getPassword(),
    database: configuration.getDatabase(),
    port:configuration.getPort(),
    ssl:true
  });
  var sql = "insert into Quiz(id, description, course_id, instructor_id) values($1,$2,$3,$4)";

  var quizId=getUniqueId(authorName);
  pool.query(sql, [quizId,quizDescription,courseId,authorName], function(err,result){
    if (err) throw err;
    console.log("1 record inserted");

    //
    var getResultPromise=getCourseList();
    getResultPromise.then(function(result){
          res.render('insertQuiz',{message:'Quiz Inserted',userId:req.session.userId,courseList:result});
    },function(err){
        res.render('insertQuiz',{message:'Quiz Inserted',userId:req.session.userId,courseList:null});
    })

    //res.render('insertQuiz', {message: 'Quiz Inserted',userId:req.session.userId});
  });
}

/* function for handling  http requests to retrive and display the records in the
 Quiz table in database*/
exports.displayQuizes=function(req,res){
  var pool = new pg.Pool({
    host: configuration.getHost(),
    user: configuration.getUserId(),
    password: configuration.getPassword(),
    database: configuration.getDatabase(),
    port:configuration.getPort(),
    ssl:true
  });
  var sql = "SELECT Quiz.id, Quiz.description, Course.name, instructor_id FROM Quiz INNER JOIN Course "+
            "ON Quiz.course_id=Course.id";

  pool.query(sql, function (err, result, fields){
    if (err) throw err;

    var str= '<!DOCTYPE html><head>'+
    '<meta charset="utf-8">'+
    '<title>Browse Quizes</title>'+
    '<link rel="stylesheet" type="text/css" href="/css/style.css">'+
    '</head>'+
    '<body>';
    if(req.session.userId)
    str+='<div w3-include-html="headerLogged"></div>';
    else
    str+='<div w3-include-html="header.ejs"></div>';
    str+='<a class="HomeLink" href="/">back to home</a>'+
    '<div class="h1">'+
    'Browse Quizes'+
    '</div>'+
    '<table style="width:100%">'+
    '<tr>'+
    '<th>Quiz</th><th>Course</th><th>Instructor</th>'+
    '</tr>';
    var i=0;
    for(i=0;i<result.rows.length;i++){
      str+='<tr><td><a href="./showTheQuiz?id='+result.rows[i].id+'">'+result.rows[i].description+'</a></td>'+
      '<td>'+result.rows[i].name+'</td>'+
      '<td>'+result.rows[i].instructor_id+'<td>'+
      '</tr>';
    }
    str+='</table>'+
    '</body>';
    str+='<script type="text/javascript" src="scripts/problem.js">'+
    '</script>'+
    '<script type="text/javascript" src="scripts/general.js">'+
    '</script>';

    res.send(str);
  });
}

exports.startTheQuiz=function(req,res){

  var pool = new pg.Pool({
    host: configuration.getHost(),
    user: configuration.getUserId(),
    password: configuration.getPassword(),
    database: configuration.getDatabase(),
    port:configuration.getPort(),
    ssl:true
  });

  var q = url.parse(req.url, true).query;
  let quizId=q.id;

  var sql =" SELECT Quiz.description, Course.name, Quiz.instructor_id FROM Quiz INNER JOIN Course "+
            "ON Quiz.course_id=Course.id where Quiz.id='"+quizId+"'";

  "select description, course_id, instructor_id from quiz where id='"+quizId+"'";
  console.log(' param '+q.id);

  pool.query(sql, function (err, result, fields){
    if (err) throw err;

     var str= '<!DOCTYPE html><head>'+
    '<meta charset="utf-8">'+
    '<title>Show Individual Quiz</title>'+
    '<link rel="stylesheet" type="text/css" href="css/style.css">'+
    '</head>'+
    '<body>';
    if(req.session.userId)
      str+='<div w3-include-html="headerLogged"></div>';
    else
      str+='<div w3-include-html="header.ejs"></div>';

    str=str+'<a class="HomeLink" href="/">back to home</a>'+
    '<div class="h1">'+
    'Quiz Description: '+result.rows[0].description+
    '</div>';

    str+='<p> Course: '+result.rows[0].name+'</b><br/>'+
    '<b> Instructor:'+result.rows[0].instructor_id+'</b>';
    str=str+'</body>';
    str+='<script type="text/javascript" src="scripts/general.js">'+
    '</script>';
    res.send(str);
  });
}

/* function for handling  http requests to show details about a selected Course*/
exports.showTheQuiz=function(req,res){

  var pool = new pg.Pool({
    host: configuration.getHost(),
    user: configuration.getUserId(),
    password: configuration.getPassword(),
    database: configuration.getDatabase(),
    port:configuration.getPort(),
    ssl:true
  });

  var q = url.parse(req.url, true).query;
  let quizId=q.id;

  var sql =" SELECT Quiz.description, Course.name, Quiz.instructor_id FROM Quiz INNER JOIN Course "+
            "ON Quiz.course_id=Course.id where Quiz.id='"+quizId+"'";

  "select description, course_id, instructor_id from quiz where id='"+quizId+"'";
  console.log(' param '+q.id);

  pool.query(sql, function (err, result, fields){
    if (err) throw err;

   var str= '<!DOCTYPE html><head>'+
  '<meta charset="utf-8">'+
  '<title>Show Individual Quiz</title>'+
  '<link rel="stylesheet" media="screen and (max-width: 1000px)" type="text/css" href="css/styleMob.css">'+
  '<link rel="stylesheet" media="screen and (min-width: 1000px)" type="text/css" href="css/style.css">'+
  '</head>'+
  '<body>';
  if(req.session.userId)
  str+='<div w3-include-html="headerLogged"></div>';
  else
  str+='<div w3-include-html="header.ejs"></div>';

  str=str+'<a class="HomeLink" href="/">back to home</a>'+
  '<div class="h1">'+
  'Quiz Description: '+result.rows[0].description+
  '</div>';

  str+='<p> Course: '+result.rows[0].name+'</b><br/>'+
  '<b> Instructor:'+result.rows[0].instructor_id+'</b>';
  str+='<input type="button" class="startQuiz" onclick="startQuizHandler(this)" id="btnStartQuiz'+quizId+'" name="btnStartQuiz'+quizId+'" value="Start Quiz"/>';

  //
  var getResultPromise=getProblemListForQuiz(quizId);

  getResultPromise.then(function(resultHtmlStr){
        str+=resultHtmlStr;
        str=str+'</body>';
        str+='<script type="text/javascript" src="scripts/general.js">'+
        '</script>';
        str+='<script type="text/javascript" src="scripts/startQuiz.js">'+
        '</script>';
        res.send(str);
  },function(err){
    str=str+'</body>';
    str+='<script type="text/javascript" src="scripts/general.js">'+
    '</script>';
    str+='<script type="text/javascript" src="scripts/startQuiz.js">'+
    '</script>';
    res.send(str);
   })
 });//end of query
}

/* function for return a Promise object that retrives the set of records in the
 Course names from course table in database*/
function getProblemListForQuiz(quizId){
      var htmlStr='<h2>'+
                  'Problems:'+
                  '</h2>';
        var pool = new pg.Pool({
          host: configuration.getHost(),
          user: configuration.getUserId(),
          password: configuration.getPassword(),
          database: configuration.getDatabase(),
          port:configuration.getPort(),
          ssl:true
        });
        var sql = "SELECT description, solution FROM Problem where quiz_id=$1";
        return new Promise(function(resolve,reject){
          pool.query(sql, [quizId], function (err, result, fields){
            if (err)
                  reject(err);
            else{
             var i=0;
             for(i=0;i<result.rows.length;i++){
               htmlStr=htmlStr+'<b>Question: </b><div class="Question">'+result.rows[i].description+'</div>'+
               '<input type="button" class="showAnswer" onclick="showAnswerHandler(this)" id="b'+i+'$" value="view solution"/></br>' +
               '<div id="d'+i+'" class="Answer"><b>Solution: </b>'+result.rows[i].solution+'</div><hr>';
             }
             resolve(htmlStr);
           }
        });
        });
      }
exports.getProblemListForQuiz=getProblemListForQuiz;