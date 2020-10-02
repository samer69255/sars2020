var express = require('express');
var router = express.Router();
const Instagram = require('./instx.js');
var request = require("request");
const FileCookieStore = require('tough-cookie-filestore2');
const Telegraf = require('telegraf');
var {Check, InitY, InitH, reset} = require('../yaho/yaho');
var fs = require("fs");

//Cookies File
if (!isfile("./user/cookies.json")) fs.writeFileSync("./user/cookies.json", "{}", "UTF-8");
// var cookieStore = new FileCookieStore('./user/cookies.json');
var Config = JSON.parse(fs.readFileSync("./user/data.json"));

//Set Process False
Config.Start = false;

var client = new Instagram({ /*cookieStore*/ });

// (async function () {
// await client.login();
// // console.log("logined");
// // var result = await client.getHashtag("love");
// // console.log(result);
// // var s = await client.addComment({ mediaId: result, text: 'hi' });
// // console.log(s);

// // var s = await client.getUserByUsername({username: "sam.roro"});
// // var usr = {};
// // usr.followed = s['edge_followed_by'].count;
// // usr.following = s['edge_follow'].count;
// // console.log("result: " +JSON.stringify(usr,null,4));
// })();


/* GET home page. */
router.get('/', function(req, res, next) {
	if (req.query.token) {
		Config.token = req.query.token;
    saveConfig();
		botrun();
		res.end("success");
		return;
	}
  res.render('index', { title: 'Express' });
});



async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

if (Config.token) botrun();
function botrun() {
//************** Telegram BOT ***************** *//
bot = new Telegraf(Config.token);

bot.use((ctx, next) => {
  try {
    var username = ctx.update.message.chat.username;
  }
  catch (e) {
    var username = "user";
  }
  
  // BOT ADMIN
  if (username == Config.admin) {
    var text = ctx.update.message.text;
    var sp = text.split(" ");
    var cmd = sp[0];
    var v = sp[1];
    if (cmd == "/setuser") {
      if (!v) return ctx.reply("user not valid");
      Config.username = v;
      saveConfig();
      ctx.reply("Success!");
    }
    else next();
  } else next();
  
});

bot.use((ctx, next) => {
  try {
    var username = ctx.update.message.chat.username;
  }
  catch (e) {
    var username = "audmin"
  }
  if (Config.username !== username) {
    ctx.reply("تم رفض الوصول");
    return;
  }
  return next()
});


bot.start((ctx) => {
  var username = ctx.update.message.chat.username;
  //if (! client.isLogin()) return ctx.reply("Please Login !!");
  ctx.replyWithHTML(`
  كيفية عمل البوت:

  -<b>بحث عشوائي</b> (البحث عن حسابات عشوائية)

  -<b>بحث بالاسماء</b> (بحث عن حسابات باستخدام قائمة الاسماء)

  -<b>تعديل الاسماء</b> (لاضافة اسماء للبحث)
  
  -<b>فحص</b> (فحص وعزل الايميلات المتاحات)
  
  -<b>سحب المتاحات</b> (لسحب المتاحات المفحوصة الى ملف)

  -<b>سحب اليوزرات</b> (لسحب اليوزرات فقط)

  -<b>سحب المتاحات مع اليوزر</b> (لسحب المتاحات مع اليوزرات)

  -<b>تغير الدومين</b> (لتحديد دومين البريد)

  -<b>الحالة</b> (عرض ومراقبة العمليات النشطة)
  `);
  
});


bot.use((ctx, next) => {
  tel = ctx;
  return next()
});

// ************ الحالة ****************
bot.hears(/\/getstatus|الحالة/, ctx => {
  if (Config.run == 0) ctx.reply('الحالة: العمليات متوقفه');
  else if (Config.run == 1) ctx.reply(`الحالة: جاري البحث عن نتائج`);
  else if (Config.run == 2) ctx.reply(`جاري الفحص
  اكتمل ${Config.i} من ${Config.len}`);
  //else if (Config.run == 3) ctx.reply("جاري تصيد حسابات متابعين");
  else if (Config.run == 3) {
    ctx.reply(`جاري تطابق الحسابات
    
    تم اكمال ${Config.user_s} من ${Config.user_len}`);
  }
});


bot.hears(/الغاء|\/cancel/, ctx => {
    if (Config.cmd.length > 0) {
      Config.cmd = "";
      saveConfig();
      ctx.reply('تم الغاء الامر');
    }
    else if (Config.run == 3) {
      Config.run = 0;
      saveConfig();
      ctx.reply(`تم ايقاف المهمة`);
    }
});
//  ********** الحماية ************
bot.use( (ctx, next) => {
  if (Config.run > 0) {
    ctx.reply(`الرجاء انتظار اكتمال العملية الحالية`);
  } else next();
});

bot.use((ctx, next) => {
  var text = ctx.update.message.text;

  if (Config.cmd == 'domain') {
    if ((/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/).test(text)) {
      // if (!(/yahoo|outlook|hotmail|ymail|live/).test(text)) return ctx.reply(`تم رفض النطاق !
      // النطاقات المسموح بها هي:
      // yahoo.*
      // hotmail.*
      // outlook.*
      // live.*`);
      Config.domain = text;
      Config.cmd = "";
      saveConfig();
      ctx.reply("تم الحفظ");
    }
    else ctx.reply('الرجاء ادخال تنسيق صحيح');
  }

  else if (Config.cmd == 'names') {
    // english and numer
    if ( (/([^a-zA-Z0-9\n._-])/).test(text) ) return ctx.reply(`تم رفض الامر بسبب وجود احرف غير مسموحة
    الرجاء اعادة ارسال الاسماء مع مراعات تنسيق الاحرف`);
    var names = text.split("\n");
    if (names.length > 0) {
      fs.writeFileSync('./results/names.txt', names.slice(0, 500).join("\n") );
      ctx.reply("تم الحفظ بنجاح");
      Config.cmd = "";
      saveConfig();
    }
    else {
      ctx.reply(`يجب ادخال تنسيق صحيح`);
    }
  }

  else next();
});

// ************* البحث **********
Config.run = 0;
bot.hears(/بحث/, async (ctx) => {
  var text = ctx.update.message.text;
  var ob = text.split(" ");
  var type = ob[1];
  var n = +ob[2] || 10;
  var emails = [];
  Config.run = 1;
  console.log("Seraching");

  //------------------------
  if (type == "عشوائي") {
    // create random emails
    if (!isFinite(n)) return ctx.reply("الرجاء ادخال رقم صالح");
    if (n < 0 || n > 600) return ctx.reply(`يجب ان يكون الرقم بين المدى 0-600`);
    console.log("Random Seraching");
    emails = [];
    for (var ii=0; ii<n; ii++) {
      emails.push(makeid(4) + `@${Config.domain}`);
    };
  }
  else if (type == "بالاسماء") {
    emails = fs.readFileSync("./results/names.txt").toString().split("\n");
    if (emails.length == 0) return ctx.reply("لا يوجد اسماء للبحث بها");
    console.log("Names Seraching");
    emails = emails.map(key => key + "@" + Config.domain);
  }
  ctx.reply(`تم تشغيل العملية
    عدد الاسماء: ${emails.length}`);
  //---------------------------

  var n2 = 0;
  var res = [];

  var asiaTime = new Date().getTime();
  Config.result = (asiaTime);
  saveConfig();
  for (var i in emails) {
    var key = emails[i];
    var e = 0;
    var list = await search(key)

    .catch(e => {
      ctx.reply(`حدث خطأ اثناء عملية البحث
      ربما الحساب محظور من البحث
      جرب تغير الحساب او اعادة البحث بوقت آخر
      للمزيد من المعلومات @swsam`);
      Config.run =0;
      saveConfig();
      console.log("Error 1");
      e = 1;
    }); 
      if (list == undefined) {
        ctx.reply(`حدث خطأ ما!، حاول تغير الحساب`);
        Config.run =0;
        saveConfig();
        return;
        
      }
      if (e == 1) return;
      list.forEach(async data => {
        var userId = data.user.pk;
        if ( !((/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi).test(data.user.full_name)) ) return;
        res.push({email: (data.user.full_name.replace(/ /g,"").toLowerCase()), username: data.user.username});
        n2++;
        console.log(n2);
        //ctx.reply(JSON.stringify(res, null ,4));
        fs.writeFileSync("./results/" + Config.result + ".json", JSON.stringify(res, null, 4));
        
      });
      }

    res = emailF(res);
    console.log(n2);
    console.log('serach finish');
    Config.run = 0;
    Config.len = Config.i = 0;
    ctx.reply(`تم الانتهاء
    تم العثور على ${res.length} نتيجة`);

});

// *********** فحص المتاحات *********************
bot.hears(/(\/check|فحص)/, async ({reply}) => {
  if (isfile(`./results/${Config.result}.json`)) {
    Config.len = Config.i = 0;
    console.log("started checking");
    var emails = fs.readFileSync(`./results/${Config.result}.json`).toString();
    Config.run = 2;
    reply(`جاري فحص المتاحات سنخبرك بعد الانتهاء `);
    emails = JSON.parse(emails);
    Config.len = emails.length;
    var s = [];
    await InitY();
    await InitH();
    var f =0;
    var un = 0;
    for (var u=0; u<emails.length; u++) {
      var usr = emails[u]
      var verify = await Check(usr.email);
      Config.i++;
      if (verify === true ) s.push(usr);
      else if (verify == 'error') {
        console.log('error');
          u--;
          await sleep(10000);
          continue;
      }
      else if (verify === false) f++;
      else un++;
    }
    if (s.length > 0)
    fs.writeFileSync(`./results/${Config.result}_checked.json`, JSON.stringify(s));
    fs.unlinkSync(`./results/${Config.result}.json`);
    var re = `تم الاكتمال
    عدد المتاحات: ${s.length}
    عدد الغير متاح: ${f}`;
    if (un > 0) re += `\n` + `حالة غير معروفة: ${un}`;
    console.log("checking finish");
    reply(re);
    Config.run = 0;
    Config.i = Config.len = 0;
    saveConfig();
    //console.log(s);
  }
  else reply("لا يوجد شي لفحصه");
});


// *********** فحص الحساب *********************
bot.hears(/(\/verify|مطابقة)/, async ({reply}) => {
  if (isfile(`./results/${Config.result}_checked.json`)) {
    console.log("Started User Checking");
    var users_string = fs.readFileSync(`./results/${Config.result}_checked.json`).toString();
    Config.run = 3;

    reply(`تجري الان عملية المطابقة
    اضغط /getstatus لعرض الحالة`);

    var users = JSON.parse(users_string);

    if (isfile(`./results/${Config.result}_verified.json`)) {
      var s = JSON.parse( fs.readFileSync(`./results/${Config.result}_verified.json`, 'UTF-8') );
    } else s =[];

    if (Config.user_f == null) Config.user_f = 0;
    if (Config.user_t == null) Config.user_t = 0;
    if (Config.user_s == null) Config.user_s = 0;
    Config.user_len = users.length;
    saveConfig();


    for (var u=Config.user_s; u<users.length; u++) {
      if (u > 0) await sleep(50);
      var user = users[u];
      var verify = await UserV(user.email);

      if (verify == true) s.push(user);

      else if (verify == false) {
        Config.user_f++;
        saveConfig();
      }
    
      else {

        // IP Adress Blocked
        fs.writeFileSync(`./results/${Config.result}_verified.json`, JSON.stringify(s));
        reply(`فشلت العملية!!

        نجح فحص ${Config.user_s} من ${users.length}
        
        تم حظر البوت، يمكن الاستمرار بعد عدة دقائق

        اكتب /verify لاستئناف العملية
        `);

        Config.run = 0;
        saveConfig();

        return;
      }
      Config.user_s++;
      saveConfig();
    }
    if (s.length > 0)
    fs.writeFileSync(`./results/${Config.result}_verified.json`, JSON.stringify(s));
    fs.unlinkSync(`./results/${Config.result}_checked.json`);
    var re = `تم الانتهاء من التطابق

    النتائج:

   عدد الحسابات المتاحة: ${s.length}
    عدد الحسابات الغير متاحة: ${Config.user_f}`;
    console.log("checking finish");
    reply(re);
    Config.run = 0;
    Config.user_f = Config.user_s = Config.user_t = 0;
    saveConfig();
    //console.log(s);
  }
  else reply("لا يوجد شي لفحصه");
});


// *********** سحب متابعين *********************
bot.hears(/سحب متابعين|\/following/, async ({reply}) => {
    console.log("followed tast started");
    var emails = [];
    var res;
    
    Config.run = 3;
    reply(`تم تشغيل المهمة`);
    var s = [];
    await InitY();
    await InitH();
    var lisen = async function () {
      await InitY();
      await InitH();
      emails = [];
      res = [];
      s = [];
       for (var ii=0; ii<10; ii++) {
      emails.push(makeid(4) + `@hotmail.com`);
      emails.push(makeid(4) + `@gmail.com`);
      emails.push(makeid(4) + `@yahoo.com`);
      emails.push(makeid(4) + `@outlook.com`);
       }

    console.log("start searching");
      for (var k in emails) {
    var key = emails[k];
    var list = await search(key)
    .catch(e => {
      reply(`حدث خطأ اثناء عملية البحث
      ربما الحساب محظور من البحث
      جرب تغير الحساب او اعادة البحث بوقت آخر
      للمزيد من المعلومات @swsam`);
      console.log("Error 1");
      Config.run = 0;
    });

      list.forEach(async data => {
        var userId = data.user.pk;
        if ( !((/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi).test(data.user.full_name)) ) return;
        res.push({email: (data.user.full_name.replace(/ /g,"").toLowerCase()), username: data.user.username});
        
      });
      }
      console.log("searching finish!");


    if (Config.run == 0) return;

    console.log("checking start");
    for (var u=0; u<res.length; u++) {
      if (Config.run == 0) return;
      var usr = res[u];
      var verify = await Check(usr.email);
      if (verify === true) s.push(usr);
      else if (verify == 'error') {
        console.log('error');
          await sleep(10000);
          continue;
      }
    }
    console.log("checking finish");
    console.log("verifing");
      for (var i in s) {
      if (Config.run == 0) return;
      if (i > 0) await sleep(2000);
      var res = await client.getUserByUsername({username: s[i].username})
      .catch(e => {
        Config.run = 0;
        reply("error 3");
      });
      var usr = {};
      usr.followed = res['edge_followed_by'].count;
      usr.following = res['edge_follow'].count;
      console.log(s[i].username + ":" + usr.followed);

      if (usr.followed >= 1000) {
      reply(`username: ${s[i].username}
      email: ${s[i].email}
      followed: ${usr.followed}
      following: ${usr.following}`);
      }
    }
    if (Config.run == 3) lisen();
    }
    lisen();
});
// --------------- سحب النتائج ----------------------

bot.hears(/سحب المتاحات مع اليوزر|\/cloneall/, (ctx) => {
   var path;
  if (isfile(`./results/${Config.result}_verified.json`)) path = `./results/${Config.result}_verified.json`;
  else if (isfile(`./results/${Config.result}_checked.json`)) path = `./results/${Config.result}_checked.json`;
  if (path) {
    var txt = JSON.parse( fs.readFileSync(path) )
    .map( key => {
      return key.email + "\n" + key.username;
    })
    .join("\n\n");
    var filename = `${path}.txt`;
    fs.writeFileSync(filename, txt);
    ctx.replyWithDocument({source: fs.readFileSync(filename), filename: "INSTAXX.txt"});
    fs.unlinkSync(filename);
    console.log("file sent");
  } else {
    ctx.reply("لا يوجد شيء لسحبه");
  }
});

bot.hears(/سحب المتاحات|\/clone/, (ctx) => {
  var path;
  if (isfile(`./results/${Config.result}_verified.json`)) path = `./results/${Config.result}_verified.json`;
  else if (isfile(`./results/${Config.result}_checked.json`)) path = `./results/${Config.result}_checked.json`;
  
  if (path) {
    var txt = JSON.parse( fs.readFileSync(path) )
    .map( key => key.email)
    .join("\n");
    var filename = `${path}.txt`;
    fs.writeFileSync(filename, txt);
    ctx.replyWithDocument({source: fs.readFileSync(filename), filename: "INSTAXX.txt"});
    //fs.unlinkSync(filename);
    console.log("file sent");
  } else {
    ctx.reply("لا يوجد شيء لسحبه");
  }
});

bot.hears(/سحب اليوزرات|\/cloneusernames/, (ctx) => {
  console.log("CMD => clone usernames");
   var path;
  if (isfile(`./results/${Config.result}_verified.json`)) path = `./results/${Config.result}_verified.json`;
  else if (isfile(`./results/${Config.result}_checked.json`)) path = `./results/${Config.result}_checked.json`;
  if (path) {
    var txt = JSON.parse( fs.readFileSync(path) )
    .map( key => key.username)
    .join("\n");
    var filename = `${path}.txt`;
    fs.writeFileSync(filename, txt);
    ctx.replyWithDocument({source: fs.readFileSync(filename), filename: "INSTAXX.txt"});
    //fs.unlinkSync(filename);
    console.log("file sent");
  } else {
    ctx.reply("لا يوجد شيء لسحبه");
  }
});

// ************ تغير الدومين  *****
bot.hears(/\/setdomain|تغير الدومين/, ctx => {
  console.log('Cmd => setdomain');
  var text = ctx.update.message.text;
  Config.cmd = 'domain';
  ctx.reply(`ارسل الدومين الان`);
});

bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.command("login", async (ctx) => {
  console.log('cmd => login');
  var text = ctx.update.message.text;
  tel = ctx;
  var ob = text.split(" ");
  var username = ob[1];
  var password = ob[2];
  if ( !(username && password) )  {
    return ctx.reply(`Use:\n/login [YourUsername] [YourPassword]`);
  }
  if (client.islogin) logout();
  var e;
  var a = await client.login({username, password}).catch(er => {e=er});
  console.log(a);
  if (a) {
    if (a.authenticated) {
      console.log('login success');
      ctx.reply("تم تسجيل الدخول بنجاح");
      Config.user = {
        email:username,
        pass:password
      }
      saveConfig();
    }
    else if (!a.user) {
      ctx.reply("فشل تسجيل الدخول: اسم المستخدم غير موجود");
      console.log("login: username!");
    }
    else {
      ctx.reply("فشل تسجيل الدخول: كلمة المرور غير صحيحة");
      console.log("login: password!");
    }
  }
  else {
    if (e) {
	console.log(e);
      var code = e.toString().match(/StatusCodeError: ([0-9]+)/);
      if (code === undefined) {ctx.reply(`حدث خطأ غير معروف
      للمساعدة راسل المطور @swsam
      كود الخطأ: loginerror1`);
      console.log('login: loginerror1');
      }
      else {
        code = code[1];
        if (code == 403) {ctx.reply("تم رفض تسجيل الدخول, حاول مرة اخرى بعد دقائق");
        console.log('login: 403');
        }
        else if (code == 400) {ctx.reply('فشلت المصادقة: وافق على الدخول واعد التسجيل');
          console.log('login: 400');
        }
        else {ctx.reply(`حدث خطأ غير متوقع
        للمزيد من المعلومات راسل المطور @swsam
        كود: loginerror2`);
        console.log('loginerror2');
        }
      }
    }
    else {
      ctx.reply(`حدث خطأ غير محسوب
      اعد المحاولة لاحقا او اتصل بالمطور @swsam
      كود: loginerror3`);
      console.log('loginerror3');
    }
  }
  
});

bot.hears(/تعديل الاسماء|\/setnames/, ({reply}) => {
  console.log('Cmd => setnames');
  reply("جيد, ارسل قائمة الاسماء الآن");
  Config.cmd = 'names'
});

bot.hears(/عرض السجل/, ctx => {
    var files = fs.readdirSync('./results')
    .filter( key => key.indexOf('_checked.json') > -1);
    console.log('cmd => show files');
    if (files.length > 0) {
      var txt = '';
      for (var i in files) {
        var f = files[i];
        if (i > 0) txt += "\n";
        txt += "/download " + f;
      }
      ctx.reply(txt);
    }
    else ctx.reply("لا يوجد سجلات");
});

bot.hears(/\/reset|مسح البيانات/, ctx => {
    var files = fs.readdirSync('./results')
    .filter( key => key.indexOf('.json') > -1);
    console.log('cmd => reset');
    files.forEach( file => {
      fs.unlinkSync(`./results/${file}`);
    });

    Config.domain = "yahoo.com";
    saveConfig();
    ctx.reply("تم مسح جميع الملفات");
    console.log('reset success');
});



bot.hears("/logout", async ctx => {
  console.log('cmd => logout')
  logout();
  ctx.reply("تمت العملية بنجاح");
  console.log('logout success');
});

bot.launch();
}
//********************************************************************** */

// ******** function ***************
function saveConfig() {
  fs.writeFileSync("./user/data.json", JSON.stringify(Config, null, 4));
}

async function logout() {
  fs.writeFileSync("./user/cookies.json", "{}", "UTF-8");
   cookieStore = new FileCookieStore('./user/cookies.json');
   client = new Instagram({ cookieStore });
   await client.request.get("/");
}

async function search(name) {
  var list = await client.search({ query: name })
  // .catch(err => {
  //     throw err;
  // });
  // console.log(typeof list);
  // console.log(list);
  return list.users;
  //console.log(user);
  }

 
 

  async function Search() {
    var list = fs.readFileSync('./list.txt').toString()
    .split("\n");
    for (var i=0; i<list.length; i++) {
      var err = false;
      var ob = await search(list[i]).catch(async e => {
        err = true;
      });
      if (err == true) {
        console.log("Waiting ...");
        await sleep(20000);
        i--;
        continue;
      }
      console.log(i + ": " + ob.user.full_name + "(" + ob.user.username + ")" + ": " + "(" + ob.len + ")");
      await sleep(100);
    }
    return true;
  }




   function emailF(list) {
    
    console.log(list);
    return list
    .filter(key => validateEmail(key.email))
    .filter(k => {
      if (/@gmail/.test(k.email)) {
        return /[a-zA-Z0-9.]{6,}@gmail.com$/.test(k.email);
      }
      return true;
    });
  }

  function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}


    function makeid(length) {
   var result           = '';
   var characters       = '1234567890abcdeqwrtyuioplkjhgfdsazxcvbnm';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

function isfile(path) {
  var res;
  try {
  if (fs.existsSync(path)) {
    res = true;
  } else res = false;
} catch(err) {
  res = false;
}
return res;
}

async function UserV(username) {
  var cx = new Instagram({});
  var error = "";
  console.log(`User Verifing ${username}`);
  var data = await cx.login({username:username, password:'pwd'}).catch(e => error = e);
  if (error) {
    console.log(`${username}=> error`);
    return 'error';
  }
  console.log(`${username}=> ${data.user}`)
  return data.user;
  console.log(data);
}

/* Skip Automatic Stop the Server */
/* Some free hosting stops the server  if it is not active during a short period like "reple.it" */
// if (Config.url) {
//   setInterval(() => {
// request.get(Config.url, () => {console.log(Config.url)});
// }, 1 * 1000 * 60);
// }


module.exports = router;
