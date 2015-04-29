#!/usr/bin/env node

var http = require('http');
var cheerio = require('cheerio');
var _eval = require('eval');
var fs = require('fs');
var request = require("request");
var cheerio = require("cheerio");
var mkdirp = require('mkdirp');
var List = require('term-list');
var exec = require('child_process').exec;

var dl = (function(){

	//本地存储目录
    var dir = './images';
    //result.chapter.cTitle
    //下载方法
    var save = function(url, dir, filename){
        request.head(url, function(err, res, body){
            request(url).pipe(fs.createWriteStream(dir + "/" + filename));
        });
    };

    var download = function(result){
    	for(var i=0,len=result.picture.length; i<len; i++){
    		if(i == 0){
    			//创建目录
    			dir = result.chapter.cTitle;

    			mkdirp(dir, function(err) {
    			    if(err){
    			        console.log(err);
    			    }
    			});
    		}
    		save(result.picture[i].url, dir, (i+1)+".jpg");
    	}
    }

	var analysisData = function(DATA){
	    _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	    decode = function(c) {
	        var a = "",
	        b, d, h, f, g, e = 0;
	        for (c = c.replace(/[^A-Za-z0-9\+\/\=]/g, ""); e < c.length;) b = _keyStr.indexOf(c.charAt(e++)),
	        d = _keyStr.indexOf(c.charAt(e++)),
	        f = _keyStr.indexOf(c.charAt(e++)),
	        g = _keyStr.indexOf(c.charAt(e++)),
	        b = b << 2 | d >> 4,
	        d = (d & 15) << 4 | f >> 2,
	        h = (f & 3) << 6 | g,
	        a += String.fromCharCode(b),
	        64 != f && (a += String.fromCharCode(d)),
	        64 != g && (a += String.fromCharCode(h));
	        return a = _utf8_decode(a)
	    };
	    _utf8_decode = function(c) {
	        for (var a = "",
	        b = 0,
	        d = c1 = c2 = 0; b < c.length;) d = c.charCodeAt(b),
	        128 > d ? (a += String.fromCharCode(d), b++) : 191 < d && 224 > d ? (c2 = c.charCodeAt(b + 1), a += String.fromCharCode((d & 31) << 6 | c2 & 63), b += 2) : (c2 = c.charCodeAt(b + 1), c3 = c.charCodeAt(b + 2), a += String.fromCharCode((d & 15) << 12 | (c2 & 63) << 6 | c3 & 63), b += 3);
	        return a
	    }

	    var result = (new Function("return " + decode(DATA.substring(1))))();
		download(result);
	}

	var getPage = function(cid){
		http.get("http://ac.qq.com/ComicView/chapter/id/505430/cid/"+cid, function(res){
	        if (res.statusCode!=200){
				console.log("status err:"+res.statusCode);
				return;
			}
			var buffers = [], size = 0;
			res.on('data', function(buffer) {
				buffers.push(buffer);
				size += buffer.length;
			});

			res.on('end', function() {
				var buffer = new Buffer(size), pos = 0;
				for(var i = 0, l = buffers.length; i < l; i++) {
					buffers[i].copy(buffer, pos);
					pos += buffers[i].length;
				}

				var text = buffer.toString();
				text = text.replace(/(\r\n|\r|\n)/g,'\n');

				var $ = cheerio.load(text);
				var str = $("script[type='text/javascript']").eq(1).html();
				var pattern =/[\'](.*?)[\']/gi;
				str = str.match(pattern)[0];
				str = str.substring(1,str.length-1);
				analysisData(str);
			});
		});
	}
	return {
		init: function(cid){
			getPage(cid);
		}
	}
})();

var chapter = (function(){

	var count = 20;
	var page = 1;

	var getPage = function(){
		http.get("http://ac.qq.com/Comic/comicInfo/id/505430", function(res){
	        if (res.statusCode!=200){
				console.log(res.statusCode);
				return;
			}
			var buffers = [], size = 0;
			res.on('data', function(buffer) {
				buffers.push(buffer);
				size += buffer.length;
			});

			res.on('end', function() {
				var buffer = new Buffer(size), pos = 0;
				for(var i = 0, l = buffers.length; i < l; i++) {
					buffers[i].copy(buffer, pos);
					pos += buffers[i].length;
				}

				var text = buffer.toString();
				text = text.replace(/(\r\n|\r|\n)/g,'\n');
				var $ = cheerio.load(text);
				var aList = $(".chapter-page-all").eq(0).find("a");

				var list;

				function showList(aList){
					//画表格
					list = new List({ marker: '\033[36m› \033[0m', markerLength: 2 });
					//for(var i=0, len = aList.length; i<len; i++){
					//for(var i=0, len = 10; i<len; i++){
					
					list.add("next", "下一页");
					list.add("prev", "上一页");

					for(var i=aList.length-1-count*(page-1); i >= aList.length-count*page; i--){
						if($(aList[i]) && $(aList[i]).attr("href")){
							var hrefArr = $(aList[i]).attr("href").split("/");
							list.add(hrefArr[hrefArr.length-1], $(aList[i]).text());
						}
					}

					list.start();

					list.on('keypress', function(key, item){
					  switch (key.name) {
					    case 'return':
					      //exec('open ' + item);
					      if(item == "prev"){
					      	page = Math.max(page-1, 1);
					      	list.stop();
					      	showList(aList);
					      }else if(item == "next"){
					      	page = Math.min(page+1, Math.ceil(aList.length/count));
					      	list.stop();
					      	showList(aList);
					      }else{
					      	dl.init(item);
					      	console.log('下载正常，请查看当前目录');
					      }
					      
					      break;
					    case 'backspace':
					      list.remove(list.selected);
					      break;
					  }
					});

					list.on('empty', function(){
					  list.stop();
					});
				}
				
				showList(aList);
				
			});
		});
	}

	return {
		init: function(){
			getPage();
		}
	}
})();

chapter.init();