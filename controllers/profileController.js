var ClassModel = require('../models/class.model');
var TopicModel = require('../models/topic.model');
var UserModel = require('../models/user.model');

var formidable = require('formidable');
var cloudinary = require('cloudinary').v2;

var config = require('./../config/config');

cloudinary.config({
    cloud_name : config.cloud_name,
    api_key : config.api_key,
    api_secret : config.api_secret
});

exports.editProfile = function(req, res){

    var user = req.session.user;

    var form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024;
    form.type = true;
    var bio = req.body.editBio;

    if(bio){
        UserModel.update({"_id":req.session.user._id}, {$set:{"bio":bio}}, function(err){
            if(err){
                req.flash('error','Update bio error');
                return res.redirect('/profile');
            }
            res.redirect("/profile");
        });
    }else{
        form.parse(req, function(err, fields, files) {
            if (err) {
                console.log(err);
                req.flash('error','Upload new avatar error');
                return res.redirect('/profile');
            }

            var key = user.username + '-avatar-' + files.avatar.name;
            var eager_options = {
                width: 200, height: 150, crop: 'scale', format: 'jpg' && 'png' && 'jpeg'
            };

            cloudinary.uploader.upload(files.avatar.path,{tags:key, eager: eager_options},function(err,image){
                console.log();
                console.log("** File Upload");
                if (err){ console.warn(err);}
                console.log("* public_id for the uploaded image is generated by Cloudinary's service.");
                console.log("* "+image.public_id);
                console.log("* "+image.url);

                UserModel.update({"_id":user._id}, {$set:{"avatar":image.url}}, function(err){
                    if(err){console.log('error ','user avatar cannot be updated')}
                });
                res.redirect('/profile');
            });
        });
    }
};

exports.profile = function(req,res) {

    UserModel.findById(req.session.user._id, function(err, user){
        ClassModel.find({"producer" : user.username},function(err,createdClass){
            TopicModel.find({'author': user.username}, function (err, topics) {
                if(err){
                    console.log(err);
                    req.flash('error','System error');
                    return res.redirect('/profile');
                }
                
                res.render('profile',{
                    title:'Profile',
                    user: user,
                    createdClasses:createdClass,
                    topics: topics,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });   
};


