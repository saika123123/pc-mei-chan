/**
 * videochat.js
 * 会議生成サービスに関するクラス
 */

// リマインド済みの会議イベント
let remindedMeetingEvents = [];


// 会議生成サービスのユーザ設定への参照
let chatPreference = null;
// 会議生成サービスと連携するかどうか
let chatFlag = true;
// 会議生成サービスのユーザID
let chatId = null;


/**
 * uidを用いて楽々動画サービスのプリファレンスを取得する
 * 
 * @param uid  ユーザID
 * @return らくらく動画サービスのユーザ設定
 */
async function getVideoMeetingPreference(uid) {
    const url = youid_endpoint + "/prefs/" + uid + "/video_meeting";
    return fetch(url)
        .then(response => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                return response.json();
            } else {
                throw new Error(response);
            }
        })
        .catch(err => {
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}


function kan2num(str){
    // 
    // 漢数字を半角数字に変換する関数
    // cf.  二千三百五十 -> 2350
    //      五十六億二十万千二百三円 -> 5600201203円
    //      一五四七 -> 1547
    //      2547百万 -> 2547000000
    //      二十三万円はドルに直すと二千ドルくらい -> 230000円はドルに直すと2000ドルくらい
    //
    // str:String型
    // 
  
    const m0 = { 0: "0０〇零", 1: "1１一壱", 2: "2２二弐", 3: "3３三参", 4: "4４四",
                 5: "5５五伍", 6: "6６六",   7: "7７七",   8: "8８八",   9: "9９九"}
    const m1 = {1: "十拾",  2: "百", 3: "千仟阡"};
    const m2 = {4: "万萬", 8:"億", 12:"兆"};
    let stack1 = [], stack2 = [], trans = []; // stack:計算式を格納、trans:変換後の文字列を格納
    let buf = str.split('');
  
    let get_num = ch => {
      for(let i in m0) if(ch.match(RegExp("[" + m0[i] + "]"))) return [i, "m0"];
      for(let i in m1) if(ch.match(RegExp("[" + m1[i] + "]"))) return [10**i, "m1"];
      for(let i in m2) if(ch.match(RegExp("[" + m2[i] + "]"))) return [10**i, "m2"];
      return [ch, "str"];
    }
  
    // stack 内の計算式を全て計算して計算結果を trans に格納
    let push_stack_to_trans = () => {
      if(stack1.length) stack2.push((stack2.length ? "+": ""), String(eval(stack1.join(""))));
      if(stack2.length) trans.push(String(eval(stack2.join(""))));
      stack1=[], stack2=[];
    }
  
    for(let i=0; i<buf.length; i++){
      let [ch, type] = get_num(buf[i]);
      let type_b = i ? get_num(buf[i-1])[1] : "";  // 直前の文字のタイプ、i=0を除く
  
      if(type != "str" && !stack1.length){ stack1.push(ch); continue;}
  
      // 数字以外の文字の場合：stack1, 2を計算
      if(type == "str"){
        push_stack_to_trans();
        trans.push(ch);
        continue;
      }
      // 0～9の場合
      if(type == "m0") (type_b == "m0") ? stack1.push(ch) : stack1.push("+", ch);
      // 十、百、千などの場合
      if(type == "m1") (type_b == "m0") ? stack1.push("*", ch) : stack1.push("+", ch);
      // 万、億、兆などの場合：stack1の計算結果に掛けてstack2に格納
      if(type == "m2"){
          stack2.push((stack2.length ? "+": ""), String(eval(stack1.join(""))), "*", ch);
          stack1 = [];
      }
    }
    push_stack_to_trans();
    return trans.join("");
  }

/**
 * APIを実行し,予定会議を取得する
 * @param date // 日時
 * @return
 */
async function getMeetings(chatId) {

    const url = "https://es4.eedept.kobe-u.ac.jp/video_chat_service/api/meeting?uid="+chatId;
    console.log(url);
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                let result = await response.json();
                return result;
            } else {
                throw new Error(response);
            }
        })
        .catch(err => {
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}

/**
 * APIを実行し,フォロー中の人（会議候補者）を取得する
 * @param date // 日時
 * @return
 */

async function getFriends(chatId) {

    const url = "https://es4.eedept.kobe-u.ac.jp/video_chat_service/api/friend?uid="+chatId;
    console.log(url);
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                let result = await response.json();
                return result;
            } else {
                throw new Error(response);
            }
        })
        .catch(err => {
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}


/**
 * APIを実行し,会議を承認・拒否する
 * @param params // 作成するイベントの情報
 * @return
 */
function concentMeeting(params) {

    let url = "https://es4.eedept.kobe-u.ac.jp/video_chat_service/api/meeting/conduct";
    let json = JSON.stringify(params);
    console.log(url);
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'Content-type': 'application/json',
            },
            method: "POST",
            body: json,
            mode: 'cors'
        })
            .then(response => response.json())
            .then(json => {
                console.log(json);
                return resolve(json);
            })
            .catch(e => {
                console.error(e);
                return reject(e);
            });
    });
}

/**
 * APIを実行し,会議を作成する
 * @param params // 作成するイベントの情報
 * @return
 */
function inputMeeting(params) {

    let url = "https://es4.eedept.kobe-u.ac.jp/video_chat_service/api/meeting/input";
    let json = JSON.stringify(params);
    console.log(url);
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'Content-type': 'application/json',
            },
            method: "POST",
            body: json,
            mode: 'cors'
        })
            .then(response => response.json())
            .then(json => {
                console.log(json);
                return resolve(json);
            })
            .catch(e => {
                console.error(e);
                return reject(e);
            });
    });
}


/*--------------- 以下対話シナリオ ---------------*/
/**
 * 会議を編集する
 */
async function videochat() {
    let count = 0;
    while (true) {
        let ans = await miku_ask("何をしますか？（確認／作成／やめる）", false, "guide_normal");
        // 会議の確認
        if (/確認/.test(ans)) {
            let meetingresult = await getMeetings(chatId);
            let pidresult = await getMeetings(chatId);
            meetingresult = meetingresult.result.meetinglogs;
            pidresult = pidresult.result.pidLogs;
            console.log(meetingresult);
            console.log(pidresult);
            let str = "";
            let pstr = "";
            for (const json of meetingresult) {
                let zoomid = json.zoomid;
                let hostname = json.hostname;
                let starttime = json.starttime;
                let states = JSON.stringify(json.states);
                str = str + "<div> [会議ID：" + zoomid +",主催者：" + hostname+",予定時間："+starttime+",招待者状況："+states+"</div>";
            }

            for(const json of pidresult){
                let zoomid = json.zoomid;
                let hostname = json.hostname;
                let starttime = json.starttime;
                let membername = json.membername;
                pstr = pstr + "<div> [会議ID：" + zoomid +",主催者：" + hostname+",予定時間："+starttime+",招待者："+membername+"</div>";
            }
            const size = Object.keys(meetingresult).length;
            const pidsize = Object.keys(pidresult).length;
            if (size == 0&&pidsize == 0) {
                await miku_say("予定会議はありません", "normal");
                return;
            }
            scrollYPostionPushFlag = true;
            post_keicho(str, SPEAKER.AGENT, person);
            post_keicho(pstr,SPEAKER.AGENT, person);
            while (true) {
                let ans = await miku_ask("どうしますか？ (やめる/承認/拒否)", false, "guide_normal");
                if (/やめる|止める/.test(ans)) break;
                if (/しょうにん|承認/.test(ans)) {
                    //招待会議予定が出てくるメソッドを描く
                    //zoomidをこたえると承認に更新
                    let pidresult = await getMeetings(chatId);
                    pidresult = pidresult.result.pidLogs;
                    let pstr = "";
                    for(const json of pidresult){
                        let zoomid = json.zoomid;
                        let hostname = json.hostname;
                        let starttime = json.starttime;
                        let membername = json.membername;
                        pstr = pstr + "<div> [会議ID：" + zoomid +",主催者：" + hostname+",予定時間："+starttime+",招待者："+membername+"</div>";
                    }
                    scrollYPostionPushFlag = true;
                    post_keicho(pstr,SPEAKER.AGENT, person);
                    while(true){
                        let ans = await miku_ask("承認する会議IDを教えて下さい (会議ID，やめる)", false, "guide_normal"); 
                        let kanji = kan2num(ans);
                        console.log("---------------------------------------------");
                        console.log(kanji.replace(/[^0-9]/g, ""));
                        console.log("---------------------------------------------");
                        if (/やめる|止める/.test(ans)) {
                            return;
                        }
                            for(const json of pidresult){
                                let zoomid = json.zoomid;
                                if(kanji.replace(/[^0-9]/g, "")==zoomid){
                                    let params ={
                                        "pid":chatId,
                                        "zoomid":zoomid,
                                        "state":1,
                                    };
                                    console.log(params);
                                    await concentMeeting(params);
                                    // await concentMeeting(params);
                                    await miku_say("会議ID「" + zoomid + "」の会議を承認しました", "greeting");
                                    return;
                            }    
                        }
                            
                                    await miku_say("該当の情報を取得できませんでした", "normal");
                                    return;
                                
                            
                        
                    }
                }
                if(/きょひ|拒否/.test(ans)){
                    
                    //招待会議予定が出てくるメソッドを描く
                    //zoomidをこたえると承認に更新
                    let pidresult = await getMeetings(chatId);
                    pidresult = pidresult.result.pidLogs;
                    let pstr = "";
                    for(const json of pidresult){
                        let zoomid = json.zoomid;
                        let hostname = json.hostname;
                        let starttime = json.starttime;
                        let membername = json.membername;
                        pstr = pstr + "<div> [会議ID：" + zoomid +",主催者：" + hostname+",予定時間："+starttime+",招待者："+membername+"</div>";
                    }
                    scrollYPostionPushFlag = true;
                    post_keicho(pstr,SPEAKER.AGENT, person);
                    while(true){
                        let ans = await miku_ask("承認する会議IDを教えて下さい (会議ID，やめる)", false, "guide_normal"); 
                        let kanji = kan2num(ans);
                        console.log("---------------------------------------------");
                        console.log(kanji.replace(/[^0-9]/g, ""));
                        console.log("---------------------------------------------");
                        if (/やめる|止める/.test(ans)) {
                            return;
                        }
                            for(const json of pidresult){
                                let zoomid = json.zoomid;
                                if(kanji.replace(/[^0-9]/g, "")==zoomid){
                                    let params ={
                                        "pid":chatId,
                                        "zoomid":zoomid,
                                        "state":2,
                                    };
                                    console.log(params);
                                    await concentMeeting(params);
                                    await miku_say("会議ID「" + zoomid + "」の会議を拒否しました", "greeting");
                                    return;
                            }    
                        }
                            
                                    await miku_say("該当の会議情報を取得できませんでした", "normal");
                                    return;
                                
                            
                        
                    }
                }
            }
            return;
        }
// 会議の作成
else if (/作成/.test(ans)) {
    let friendresult = await getFriends(chatId);
    friendresult = friendresult.result.logs;
    console.log(friendresult);
    let fstr = "";
    for (const json of friendresult) {
        let listid = json.listid;
        let fnickname = json.fnickname;
        let relation = json.relation;
        fstr = fstr + "<div> [フォロー番号：" + listid +",フォロー名：" + fnickname+",関係性：" +relation+ "]</div>"
    }
    const fsize = Object.keys(friendresult).length;
    if (fsize == 0) {
        await miku_say("フォローしている人はいないので会議を設定できません","normal");
        return;
    }
    scrollYPostionPushFlag = true;
    post_keicho(fstr, SPEAKER.AGENT, person);
    while (true) {
        let ans = await miku_ask("会議予定を立てますか？ (はい，やめる)", false, "guide_normal");
        if (/やめる|止める/.test(ans)) break;
        if (/はい/.test(ans)) {
            while(true){
                let ans = await miku_ask("誰とお話ししますか？ (フレンド番号，やめる)", false, "guide_normal"); 
                let friendkanji = kan2num(ans);
                console.log("---------------------------------------------");
                console.log(friendkanji.replace(/[^0-9]/g, ""));
                console.log("---------------------------------------------");
                if (/やめる|止める/.test(ans)) {
                    return;
                }
                // for(const json of friendresult){
                //     let listid = json.listid;
                //     let fnickname = json.fnickname;
                //     if(friendkanji.replace(/[^0-9]/g, "")!=listid){
                //         await miku_say("該当のフレンド情報を取得できませんでした", "normal");
                //         return;
                //     }
                // }
                    for(const json of friendresult){
                        let listid = json.listid;
                        let fnickname = json.fnickname;
                        if(friendkanji.replace(/[^0-9]/g, "")==listid){
                            //pidnicknames配列に組み込む。
                            
                            await miku_say("「" + fnickname + "」さんを会議に招待しました", "greeting");
                            //ここで時刻設定に進む
                            let date;
                            let time;
                            while(true){
                                let ans = await miku_ask("作成する日時を教えてください (日時，やめる)", false, "_normal");
                                if (/やめる|止める/.test(ans)) return;
                                date = getDate(ans);
                                if (date != null) {
                                    time = getTime(ans);
                                    if (time == null) {
                                        while (true) {
                                            let ans = await miku_ask("作成する時間を教えて下さい (時間，やめる)", false, "guide_normal");
                                            if (/やめる|止める/.test(ans)) return;
                                            time = getTime(ans);
                                            if (time != null) {
                                                //会議作成メソッドを動かす
                                                let params = {
                                                    'uid' : chatId,
                                                    'pidnicknames':[fnickname],
                                                    'starttime' : formatDate(date, 'yyyy-MM-dd') + ' ' + time,
                                                }
                                                console.log("**********************************************************************************************");
                                                console.log(params);
                                                console.log("**********************************************************************************************");
                                                await inputMeeting(params);
                                                await miku_say("「" + fnickname + "」さんを"+date+time+"会議に招待しました", "greeting");
                                                return;
                                            }
                                        }
                                    } 
                                    break;
                                }
                            }
                            //会議作成メソッドを動かす
                            let params = {
                                'uid' : chatId,
                                'pidnicknames':[fnickname],
                                'starttime' : formatDate(date, 'yyyy-MM-dd') + 'T' + time + ':00+09:00'
                            }
                            console.log("**********************************************************************************************");
                            console.log(params);
                            console.log("**********************************************************************************************");
                            await inputMeeting(params);
                            await miku_say("「" + fnickname + "」さんを"+date+time+"会議に招待しました", "greeting");
                            return
                }
            }
                  await miku_say("該当のフレンド情報を取得できませんでした", "normal");
                  return;
                        
           

        }
    }
    return;
}

        count++;
    }else{
        return;
    }
    }
}


/**
 * 会議をリマインドする
 * @param events 
 */
function calCheckMtg() {
    var buggyObject = {
        callAgain: async function () {
            let now = new Date();
            let meetingresult = await getMeetings(chatId);
            let pidresult = await getMeetings(chatId);
            meetingresult = meetingresult.result.meetinglogs;
            pidresult = pidresult.result.pidLogs;
            console.log(meetingresult);
            console.log(pidresult);
            // let str = "";
            // let pstr = "";
            //↓招待したmtg
            for (const json of meetingresult) {
                let starttime = json.starttime;
                let eventTime = new Date(starttime).getTime();
                // console.log(starttime);
                // let month=now.getMonth()+1;
                // console.log(now.getFullYear()+"-"+month+"-"+now.getDate()+"T"+now.getHours()+":"+now.getMinutes()+":"+now.getSeconds());
                // console.log("-------");
                // let time = now.getFullYear()+"-"+month+"-"+now.getDate()+"T"+now.getHours()+":"+now.getMinutes()+":"+now.getSeconds();
                if (eventTime > now.getTime() && eventTime < now.getTime() + 10 * 60 * 1000) {
                    if (!remindedMeetingEvents.includes(json.zoomid)) {
                        console.log("remind");
                        remindedMeetingEvents.push(json.zoomid);
                        if (talking) {
                            $link=json.link;
                            await miku_say("まもなく「" + json.hostname + "」主催の"+"「<a href=$link>会議</a>」の時間です", "greeting");
                        } else {
                            talking = true;
                            $("#status").html("");
                            await miku_say("まもなく「" + json.hostname + "」主催の"+"「<a href=$link>会議</a>」の時間です", "greeting");
                            end_keicho();
                        }
                        return;
                    }
                }
            }

            for(const json of pidresult){
                let starttime = json.starttime;
                if (starttime > now.getTime() && starttime < now.getTime() + 10 * 60 * 1000) {
                    if (!remindedMeetingEvents.includes(json.zoomid)) {
                        console.log("remind");
                        remindedMeetingEvents.push(json.zoomid);
                        if (talking) {
                            $link=json.link;
                            await miku_say("まもなく「" + json.hostname + "」主催の"+"「<a href=$link>会議</a>」時間です", "greeting");
                        } else {
                            talking = true;
                            $("#status").html("");
                            await miku_say("まもなく「" + json.hostname + "」主催の"+"「<a href=$link>会議</a>」時間です", "greeting");
                            end_keicho();
                        }
                        return;
                    }
                }
            }
        }
    };
    buggyObject.callAgain();
    buggyObject = null;
    callback(calCheckMtg);
}

