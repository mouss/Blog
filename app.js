
var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var URL = 'mongodb://localhost:27017/blog';
var maDB;
var ObjectId = require('mongodb').ObjectID;
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var session = require('express-session');
var bcrypt = require('bcryptjs');
var multer  = require('multer');


var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({ storage: storage })

app.use("/pug", express.static(__dirname + '/pug'));
app.set('view engine', 'pug')
app.set('views','pug');
app.use("/img", express.static(__dirname + '/img'));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/css", express.static(__dirname + '/css'));
app.use("/vendor", express.static(__dirname + '/vendor'));
app.use("/js", express.static(__dirname + '/js'));



MongoClient.connect(URL, function(err, db) {
  if (err) {
    return;
  }

  maDB = db;

var mois = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];



app.get('/', function (req, res) {
  var collection = maDB.collection('articles');
  collection.find().sort({"date": -1}).limit(10).toArray(function(err, data){
    //console.log(data);

    res.render('accueil', {article:data, mois:mois});
  //  res.render('accueil', { titre: data[0].titre, contenu:data[0].contenu,  date:data[0].date.getDate() +' '+mois[data[0].date.getMonth()] +' '   +data[0].date.getFullYear(), auteur:data[0].auteur});
  });
});

app.get('/login', function (req, res) {
  res.render('login.pug');
});
app.get('/about', function (req, res) {
  res.render('about.pug');
});
app.get('/contact', function (req, res) {
  res.render('contacte.pug');
});

app.use(urlencodedParser);
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));
app.post('/admin', function (req, res) {

  var collection = maDB.collection('utilisateurs');
  collection.find({ identifiant: req.body.login, niveau:'administrateur' }).toArray(function(err, data){
      if(data == ''){
        res.render('login.pug', {reponse:'Login invalide'});
      }else if( bcrypt.compareSync(req.body.motdepasse, data[0].motdepasse)){
         req.session.user = data[0].identifiant;
         req.session.niveau = data[0].niveau;
        res.render('admin.pug');
      }else {
        res.render('login.pug', {reponse:'Mot de passe invalide'});
      }


  //console.log(data[0].motdepasse);

});




});
app.get('/admin', function (req, res) {
 if(req.session.user){
  var collection = maDB.collection('utilisateurs');
  collection.find({ identifiant: req.session.user, niveau: req.session.niveau }).toArray(function(err, data){
      if(data == ''){
        res.render('login.pug', {reponse:"Vous n'avez pas le niveau requis"});
      }else {
        res.render('admin.pug');
      }
  });
  }else {
    res.render('login.pug', {reponse:'Veuillez vous connectez'});
  }

});

app.get('/admin/ajout', function (req, res) {

  res.render('admin/index.pug');

});
app.get('/admin/ajoutuser', function (req, res) {

  res.render('admin/ajoutuser');

});

app.post('/admin/ajoutuser', function (req, res) {
    var hash = bcrypt.hashSync(req.body.motdepasse, 10);
    var collection = maDB.collection('utilisateurs');
    collection.insert({ identifiant: req.body.login, motdepasse: hash, niveau:'administrateur' })
      res.render('admin/ajoutuser', {response:"Merci pour l'ajout"});

});


app.post('/admin/ajout', upload.single('image'), function (req, res) {
  if (!req.body) return res.sendStatus(400)
  var collection = maDB.collection('articles');
  var date = new Date();
  console.log(req.file)
  collection.insert({titre: req.body.titre, contenu: req.body.contenu, auteur : 'Moussa', date : date, fichier: req.file}, function(err, result) {
    collection.find().toArray(function(err, data) {
      res.render('admin/index.pug', {response:"L'article est ajouter"});
    });
  });

});

app.get('/admin/articles', function (req, res) {
  if (!req.body) return res.sendStatus(400)
  var collection = maDB.collection('articles');
  collection.find().sort({"date": -1}).limit(10).toArray(function(err, data){
    //console.log(data);

    res.render('admin/articlesadmin.pug', {article:data, mois:mois});

  });

});

// POST /api/users gets JSON bodies
app.post('/api/users', jsonParser, function (req, res) {
  if (!req.body) return res.sendStatus(400)
  // create user in req.body
});
app.get('/article/:id', function (req, res, next) {

  var collection = maDB.collection('articles');
  collection.find({ _id: new ObjectId(req.params.id) }).toArray(function(err, data){
    var collectioncom = maDB.collection('commentaire');

      collectioncom.find({ idarticle: req.params.id }).toArray(function(err, datac){
  res.render('article', {article:data, mois:mois, comment:datac, idarticle:req.params.id, req:req});
    });
  });
});
app.post('/articles/:id', function (req, res) {
  var collection = maDB.collection('articles');
  collection.find({ _id: new ObjectId(req.params.id) }).toArray(function(err, data){
    var collectioncom = maDB.collection('commentaire');
    var date = new Date();
    collectioncom.insert({ identifiant: req.session.user, message: req.body.message, idarticle: req.params.id, date: date }, function(err, result) {
      collectioncom.find({ idarticle: req.params.id }).toArray(function(err, datac){

      res.render('article', {response:"Merci pour le commentaire", article:data, mois:mois, comment:datac, idarticle:req.params.id, req:req});
    });
    });

});
});

app.use(function(req, res, next) {
res.status(404).render('page404.pug');
});

  app.listen(8080, function() {
    console.log('Le serveur est disponible sur le port 8080');
  });
});
