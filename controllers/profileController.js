var ClassModel = require('../models/class.model');
var TopicModel = require('../models/topic.model');
var UserModel = require('../models/user.model');

var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var aws = require('aws-sdk');
var config = require('../config/config');

const S3_BUCKET = process.env.S3_BUCKET;
aws.config.region = 'us-east-2';
var s3 = new aws.S3();


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
                req.flash('error','Uplaod new avatar error');
                return res.redirect('/profile');
            }

            var key = user.username + '-avatar-' + files.avatar.name;
            var avatarData = fs.readFileSync(files.avatar.path);

            const s3Params = {
                Bucket: S3_BUCKET,
                Key: key,
                Body: avatarData,
                Expires: 10000,
                ContentType: files.avatar.type,
                ACL: 'public-read'
            };

            s3.putObject(s3Params,(err, data) => {
                if(err){
                    console.log(err);
                    req.flash('error','Uploadig avatar failed');
                    return req.redirect('/profile');
                }
            });

            s3.getSignedUrl('putObject', s3Params, (err, data) => {
                if(err){
                  console.log(err);
                  return res.end();
                }
                const returnData = {
                    signedRequest: data,
                    url: `https://${S3_BUCKET}.s3.${s3.config.region}.amazonaws.com/${key}`
                };
                UserModel.update({"_id":user._id}, {$set:{"avatar":returnData.url}}, function(err){
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


