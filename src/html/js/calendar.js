/**
 * calendar.js
 * Google Calendarに関するクラス
 */

// リマインド済みのカレンダーイベント
let remindedCalendarEvents = [];

// 連携しているサービス一覧に検索サービスを追加
apps.push({
    name: "カレンダーサービス",
    keyword: "カレンダー",
    description: "予定の確認・作成・削除",
    func: async function () { await calendar(); },
});

/**
 * APIを実行し,選択した期間のイベントを取得する
 * @param date // 日時
 * @return
 */
async function getEvents(date1, date2) {
    let start = formatDate(date1, 'yyyy-MM-dd');
    let end = formatDate(date2, 'yyyy-MM-dd');
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/calendar-api/start=" + start + "/end=" + end;
    console.log(url);
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                let result = await response.json();
                let events = getUserEvents(result);
                sortEvent(events);
                console.log(events);
                return events;
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
 * APIを実行し,すべてのイベントを取得する
 * @param date // 日時
 * @return
 */
async function getFullEvents() {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/calendar-api/start=0002-01-01/end=9999-12-31";
    console.log(url);
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                let result = await response.json();
                let events = getUserEvents(result);
                console.log(events);
                return events;
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
 * APIを実行し,イベントを登録する
 * @param params // 作成するイベントの情報
 * @return
 */
async function createEvent(params) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/calendar-api/create";
    let json = JSON.stringify(params);
    console.log(url);
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'Content-type': 'application/json',
            },
            method: "POST",
            body: json,
            mode: 'cors',
        })
            .then(async (response) => await response.json())
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
 * APIを実行し,選択したイベントを削除する
 * @param params
 * @return
 */
async function deleteEvent(params) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/calendar-api/delete";
    let json = JSON.stringify(params);
    console.log(url);
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'Content-type': 'application/json',
            },
            method: "POST",
            body: json,
            mode: 'cors',
        })
            .then(async (response) => await response.json())
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
 * 取得したイベントから該当ユーザのイベントを取得する
 * @param events
 * @return
 */
function getUserEvents(events) {
    let userEvents = [];
    for (let event of events) {
        if (event.description == uid) {
            userEvents.push(event);
        }
    }
    return userEvents;
}

/**
 * イベントをソート
 */
async function sortEvent(events) {
    if (events.size != 0) {
        await events.sort(function (a, b) {
            return (a.start.dateTime > b.start.dateTime ? 1 : -1);
        });
    }
}

/**
 * 指定したタイトルのイベントIDを取得する
 * @param title
 * @param events
 * @returns 
 */
function getEventId(title, events) {
    let eventId = null;
    for (let event of events) {
        if (event.summary == title) {
            eventId = event.id;
            break;
        }
    }
    return eventId;
}

/**
 * カレンダーを表示する
 */
function post_calendar(date, events) {
    let id = formatDate(new Date(), 'yyyyMMddHHmmssms');
    const calendar = $("<div></div>", {
        id: id,
    }).html("");

    const comment = $("<div></div>", {
        class: "bubble bubble-half-bottom normal",
    }).append(calendar);

    const bubble = $("<div></div>", {
        class: "container",
    }).append(comment);

    $("#timeline").append(bubble),

        $("html,body").animate({ scrollTop: $("#bottom").offset().top });

    var eventData = [];
    for (let event of events) {
        let eventDate = new Date(event.start.dateTime);
        eventData.push({
            'Date': eventDate, 'Title': event.summary
        });
    }
    var settings = {};
    var element = document.getElementById(id);
    var obj = new Calendar(eventData, settings, date);
    createCalendar(obj, element);
}

/**
 * 発話内容から月を取得する
 */
function getMonth(answer) {

    //回答時の日時
    let now = new Date();

    let year = now.getFullYear();
    let month = null;
    let date = now.getDate();

    //年を取得する
    if (/年/.test(answer)) {
        if (/今年/.test(answer)) {
            year = now.getFullYear();
        } else if (/昨年|去年/.test(answer)) {
            year = now.getFullYear() - 1;
        } else if (/一昨年/.test(answer)) {
            year = now.getFullYear() - 2;
        } else if (/来年/.test(answer)) {
            year = now.getFullYear() + 1;
        } else if (/再来年/.test(answer)) {
            year = now.getFullYear() + 2;
        } else if (/年前/.test(answer)) {
            const ago = answer.match(/(\d+)年前/);
            year = now.getFullYear() - parseInt(ago);
        } else if (/年後/.test(answer)) {
            const ago = answer.match(/(\d+)年後/);
            year = now.getFullYear() + parseInt(ago);
        } else if (/(\d+)年/.test(answer)) {
            year = answer.match(/(\d+)年/);
            year = year[1];
        }
    }

    //月を取得する
    if (/月/.test(answer)) {
        if (/今月/.test(answer)) {
            month = now.getMonth();
        } else if (/先月/.test(answer)) {
            month = now.getMonth() - 1;
        } else if (/先々月/.test(answer)) {
            month = now.getMonth() - 2;
        } else if (/来月/.test(answer)) {
            month = now.getMonth() + 1;
        } else if (/再来月/.test(answer)) {
            month = now.getMonth() + 2;
        } else if (/ヶ月前/.test(answer)) {
            const ago = answer.match(/(\d+)ヶ月前/)[1];
            month = now.getMonth() - parseInt(ago);
        } else if (/か月前/.test(answer)) {
            const ago = answer.match(/(\d+)か月前/)[1];
            month = now.getMonth() - parseInt(ago);
        } else if (/ヶ月後/.test(answer)) {
            const ago = answer.match(/(\d+)ヶ月後/)[1];
            month = now.getMonth() + parseInt(ago);
        } else if (/か月後/.test(answer)) {
            const ago = answer.match(/(\d+)か月後/)[1];
            month = now.getMonth() + parseInt(ago);
        } else if (/(\d+)月/.test(answer)) {
            month = answer.match(/(\d+)月/);
            month = month[1] - 1;
        }
    }

    //日付を取得する
    if (/日/.test(answer)) {
        if (/今日/.test(answer)) {
            date = now.getDate();
        } else if (/昨日/.test(answer)) {
            date = now.getDate() - 1;
        } else if (/一昨日/.test(answer)) {
            date = now.getDate() - 2;
        } else if (/明日/.test(answer)) {
            date = now.getDate() + 1;
        } else if (/明後日/.test(answer)) {
            date = now.getDate() + 2;
        } else if (/日前/.test(answer)) {
            const ago = answer.match(/(\d+)日前/)[1];
            date = now.getDate() - parseInt(ago);
        } else if (/日後/.test(answer)) {
            const ago = answer.match(/(\d+)日後/)[1];
            date = now.getDate() + parseInt(ago);
        } else if (/(\d+)日/.test(answer)) {
            date = answer.match(/(\d+)日/);
            date = date[1];
        }
    }

    // 特別な日付の取得
    if (/おととし/.test(answer)) {
        year = now.getFullYear() - 2;
    }
    if (/おととい/.test(answer)) {
        date = now.getDate() - 2;
    }
    if (/あさって/.test(answer)) {
        date = now.getDate() - 2;
    }

    if (month == null) {
        return null;
    }

    let result = new Date(year, month, date);

    return result;
}

/**
 * 発話内容から時間を取得する
 */
function getTime(answer) {

    //回答時の日時
    let now = new Date();

    let hour = null;
    let minute = null;

    //時間を取得する
    if (/時/.test(answer)) {
        if (/時間後/.test(answer)) {
            const ago = answer.match(/(\d+)時間後/);
            hour = String(now.getHours() + parseInt(ago));
        } else if (/(\d+)時/.test(answer)) {
            if (/午後/.test(answer)) {
                const ago = answer.match(/(\d+)時/);
                hour = String(parseInt(ago) + 12);
            } else {
                hour = answer.match(/(\d+)時/);
                hour = hour[1];
            }
        }
    }

    //分数を取得する
    if (/分/.test(answer)) {
        if (/分後/.test(answer)) {
            const ago = answer.match(/(\d+)分後/);
            minute = String(now.getMinutes() + parseInt(ago));
        } else if (/(\d+)分/.test(answer)) {
            minute = answer.match(/(\d+)分/);
            minute = minute[1];
        }
    }

    if (hour == null) {
        return null;
    }

    // 分の指定がない場合
    if (minute == null) {
        minute = "0";
    }

    if (parseInt(hour) < 10) {
        hour = "0" + hour;
    }
    if (parseInt(minute) < 10) {
        minute = "0" + minute;
    }

    let result = hour + ":" + minute;

    return result;
}

/*--------------- 以下対話シナリオ ---------------*/

/**
 * カレンダーを編集する
 */
async function calendar() {
    while (true) {
        let ans = await miku_ask("何をしますか？（確認／作成／削除／やめる）", false, "guide_normal");
        // イベントの確認
        if (/確認/.test(ans)) {
            let date;
            while (true) {
                let ans = await miku_ask("何月のカレンダーを確認しますか？ (月，やめる)", false, "guide_normal");
                if (/やめる|止める/.test(ans)) break;
                date = getMonth(ans);
                if (date != null) {
                    let events = await getFullEvents();
                    events = await sortEvent(events).then(async () => {
                        /*
                        if (Object.keys(events).length == 0) {
                            await miku_say("該当する予定はありません", "guide_normal");
                        }
                        else {
                            for (let event of events) {
                                str = str + "<div>" + event.start.dateTime.substr(11, 5) + "   「" + event.summary + "」</div>";
                            }
                            await miku_say("その日の予定を表示します", "greeting");
                            post_comment(str, SPEAKER.AGENT);
                        }
                        */
                        await miku_say("その月のカレンダーを表示します", "greeting").then(async () => {
                            scrollYPostionPushFlag = true;
                            post_calendar(date, events);
                            setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 3000);
                        });
                    });
                    break;
                }
            }
        }
        // イベントの作成
        else if (/作成/.test(ans)) {
            let date;
            let time;
            let flag;
            while (true) {
                let ans = await miku_ask("作成する日時を教えて下さい (日時，やめる)", false, "guide_normal");
                if (/やめる|止める/.test(ans)) break;
                date = getDate(ans);
                if (date != null) {
                    time = getTime(ans);
                    if (time == null) {
                        while (true) {
                            let ans = await miku_ask("作成する時間を教えて下さい (時間，やめる)", false, "guide_normal");
                            if (/やめる|止める/.test(ans)) break;
                            time = getTime(ans);
                            if (time != null) {
                                flag = true;
                                break;
                            }
                        }
                    } else {
                        flag = true;
                    }
                    break;
                }
            }
            while (flag) {
                let title = await miku_ask("タイトルを教えて下さい", false, "guide_normal");
                while (true) {
                    let ans = await miku_ask("「" + title + "」でよろしいですか？（はい／いいえ／やめる）", false, "guide_normal");
                    if (/はい/.test(ans)) {
                        let params = {
                            'start': { 'dateTime': formatDate(date, 'yyyy-MM-dd') + 'T' + time + ':00+09:00' },
                            'end': { 'dateTime': formatDate(date, 'yyyy-MM-dd') + 'T' + time + ':59+09:00' },
                            'summary': title,
                            'description': uid,
                        };
                        await createEvent(params);
                        await miku_say("「" + title + "」を追加しました", "greeting");
                        flag = false;
                        break;
                    }
                    else if (/いいえ/.test(ans)) {
                        break;
                    }
                    else if (/やめる|止める/.test(ans)) {
                        flag = false;
                        break;
                    }
                }
            }
        }
        // イベントの削除
        else if (/削除/.test(ans)) {
            let date;
            let flag;
            while (true) {
                let ans = await miku_ask("削除する予定の日付を教えて下さい (日付，やめる)", false, "guide_normal");
                if (/やめる|止める/.test(ans)) break;
                date = getDate(ans);
                if (date != null) {
                    flag = true;
                    break;
                }
            }
            while (flag) {
                let title = await miku_ask("削除するイベントのタイトルを教えて下さい", false, "guide_normal");
                while (true) {
                    let ans = await miku_ask("「" + title + "」を削除してもよろしいですか？（はい／いいえ／やめる）", false, "guide_normal");
                    if (/はい/.test(ans)) {
                        let events = await getEvents(date, date);
                        let eventId = getEventId(title, events);
                        if (eventId != null) {
                            let params = {
                                "eventId": eventId,
                            }
                            await deleteEvent(params);
                            await miku_say("「" + title + "」を削除しました", "greeting");
                            flag = false;
                            break;
                        }
                        else {
                            await miku_say("そのような予定は見つかりませんでした", "greeting");
                            flag = false;
                            break;
                        }
                    }
                    else if (/いいえ/.test(ans)) {
                        break;
                    }
                    else if (/やめる|止める/.test(ans)) {
                        flag = false;
                        break;
                    }
                }
            }
        }
        // サービス終了
        else if (/やめる|止める/.test(ans)) {
            return;
        }
    }
}

/**
 * イベントをリマインドする
 * @param events 
 */
async function remindCalendarEvent() {
    if (serviceFlag) return;
    let now = new Date();
    let events = await getEvents(now, now);
    for (let event of events) {
        eventTime = new Date(event.start.dateTime).getTime();
        if (eventTime > now.getTime() && eventTime < now.getTime() + 10 * 60 * 1000) {
            if (!remindedCalendarEvents.includes(event.id)) {
                console.log("remind");
                remindedCalendarEvents.push(event.id);
                if (talking) {
                    await miku_say("まもなく「" + event.summary + "」の時間です", "greeting");
                } else {
                    talking = true;
                    $("#status").html("");
                    await miku_say("まもなく「" + event.summary + "」の時間です", "greeting");
                    end_keicho();
                }
                return;
            }
        }
    }
}

/* ---------- 以下コピペ ---------- */
/**
 * カレンダーを作成
 */

var Calendar = function (model, options, date) {
    // Default Values
    this.Options = {
        Color: '',
        LinkColor: '',
        NavShow: true,
        NavVertical: false,
        NavLocation: '',
        DateTimeShow: true,
        DateTimeFormat: 'mmm, yyyy',
        DatetimeLocation: '',
        EventClick: '',
        EventTargetWholeDay: false,
        DisabledDays: [],
        ModelChange: model
    };
    // Overwriting default values
    for (var key in options) {
        this.Options[key] = typeof options[key] == 'string' ? options[key].toLowerCase() : options[key];
    }

    model ? this.Model = model : this.Model = {};
    this.Today = new Date();

    this.Selected = this.Today
    this.Today.Month = this.Today.getMonth();
    this.Today.Year = this.Today.getFullYear();
    if (date) { this.Selected = date }
    this.Selected.Month = this.Selected.getMonth();
    this.Selected.Year = this.Selected.getFullYear();

    this.Selected.Days = new Date(this.Selected.Year, (this.Selected.Month + 1), 0).getDate();
    this.Selected.FirstDay = new Date(this.Selected.Year, (this.Selected.Month), 1).getDay();
    this.Selected.LastDay = new Date(this.Selected.Year, (this.Selected.Month + 1), 0).getDay();

    this.Prev = new Date(this.Selected.Year, (this.Selected.Month - 1), 1);
    if (this.Selected.Month == 0) { this.Prev = new Date(this.Selected.Year - 1, 11, 1); }
    this.Prev.Days = new Date(this.Prev.getFullYear(), (this.Prev.getMonth() + 1), 0).getDate();
}

function createCalendar(calendar, element, adjuster) {
    if (typeof adjuster !== 'undefined') {
        var newDate = new Date(calendar.Selected.Year, calendar.Selected.Month + adjuster, 1);
        calendar = new Calendar(calendar.Model, calendar.Options, newDate);
        element.innerHTML = '';
    } else {
        for (var key in calendar.Options) {
            typeof calendar.Options[key] != 'function' && typeof calendar.Options[key] != 'object' && calendar.Options[key] ? element.className += " " + key + "-" + calendar.Options[key] : 0;
        }
    }
    var months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

    function AddSidebar() {
        var sidebar = document.createElement('div');
        sidebar.className += 'cld-sidebar';

        var monthList = document.createElement('ul');
        monthList.className += 'cld-monthList';

        for (var i = 0; i < months.length - 3; i++) {
            var x = document.createElement('li');
            x.className += 'cld-month';
            var n = i - (4 - calendar.Selected.Month);
            // Account for overflowing month values
            if (n < 0) { n += 12; }
            else if (n > 11) { n -= 12; }
            // Add Appropriate Class
            if (i == 0) {
                x.className += ' cld-rwd cld-nav';
                x.addEventListener('click', function () {
                    typeof calendar.Options.ModelChange == 'function' ? calendar.Model = calendar.Options.ModelChange() : calendar.Model = calendar.Options.ModelChange;
                    createCalendar(calendar, element, -1);
                });
                x.innerHTML += '<svg height="15" width="15" viewBox="0 0 100 75" fill="rgba(255,255,255,0.5)"><polyline points="0,75 100,75 50,0"></polyline></svg>';
            }
            else if (i == months.length - 4) {
                x.className += ' cld-fwd cld-nav';
                x.addEventListener('click', function () {
                    typeof calendar.Options.ModelChange == 'function' ? calendar.Model = calendar.Options.ModelChange() : calendar.Model = calendar.Options.ModelChange;
                    createCalendar(calendar, element, 1);
                });
                x.innerHTML += '<svg height="15" width="15" viewBox="0 0 100 75" fill="rgba(255,255,255,0.5)"><polyline points="0,0 100,0 50,75"></polyline></svg>';
            }
            else {
                if (i < 4) { x.className += ' cld-pre'; }
                else if (i > 4) { x.className += ' cld-post'; }
                else { x.className += ' cld-curr'; }

                //prevent losing var adj value (for whatever reason that is happening)
                (function () {
                    var adj = (i - 4);
                    //x.addEventListener('click', function(){createCalendar(calendar, element, adj);console.log('kk', adj);} );
                    x.addEventListener('click', function () {
                        typeof calendar.Options.ModelChange == 'function' ? calendar.Model = calendar.Options.ModelChange() : calendar.Model = calendar.Options.ModelChange;
                        createCalendar(calendar, element, adj);
                    });
                    x.setAttribute('style', 'opacity:' + (1 - Math.abs(adj) / 4));
                    x.innerHTML += months[n].substr(0, 3);
                }()); // immediate invocation

                if (n == 0) {
                    var y = document.createElement('li');
                    y.className += 'cld-year';
                    if (i < 5) {
                        y.innerHTML += calendar.Selected.Year;
                    } else {
                        y.innerHTML += calendar.Selected.Year + 1;
                    }
                    monthList.appendChild(y);
                }
            }
            monthList.appendChild(x);
        }
        sidebar.appendChild(monthList);
        if (calendar.Options.NavLocation) {
            document.getElementById(calendar.Options.NavLocation).innerHTML = "";
            document.getElementById(calendar.Options.NavLocation).appendChild(sidebar);
        }
        else { element.appendChild(sidebar); }
    }

    var mainSection = document.createElement('div');
    mainSection.className += "cld-main";

    function AddDateTime() {
        var datetime = document.createElement('div');
        datetime.className += "cld-datetime";
        if (calendar.Options.NavShow && !calendar.Options.NavVertical) {
            var rwd = document.createElement('div');
            rwd.className += " cld-rwd cld-nav";
            rwd.addEventListener('click', function () { createCalendar(calendar, element, -1); });
            rwd.innerHTML = '<svg height="15" width="15" viewBox="0 0 75 100" fill="rgba(0,0,0,0.5)"><polyline points="0,50 75,0 75,100"></polyline></svg>';
            datetime.appendChild(rwd);
        }
        var today = document.createElement('div');
        today.className += ' today';
        today.innerHTML = calendar.Selected.Year + "年" + months[calendar.Selected.Month];
        datetime.appendChild(today);
        if (calendar.Options.NavShow && !calendar.Options.NavVertical) {
            var fwd = document.createElement('div');
            fwd.className += " cld-fwd cld-nav";
            fwd.addEventListener('click', function () { createCalendar(calendar, element, 1); });
            fwd.innerHTML = '<svg height="15" width="15" viewBox="0 0 75 100" fill="rgba(0,0,0,0.5)"><polyline points="0,0 75,50 0,100"></polyline></svg>';
            datetime.appendChild(fwd);
        }
        if (calendar.Options.DatetimeLocation) {
            document.getElementById(calendar.Options.DatetimeLocation).innerHTML = "";
            document.getElementById(calendar.Options.DatetimeLocation).appendChild(datetime);
        }
        else { mainSection.appendChild(datetime); }
    }

    function AddLabels() {
        var labels = document.createElement('ul');
        labels.className = 'cld-labels';
        var label = document.createElement('li');
        label.className += "cld-label sunday";
        label.innerHTML = "日";
        labels.appendChild(label);
        var labelsList = ["月", "火", "水", "木", "金"];
        for (var i = 0; i < labelsList.length; i++) {
            var label = document.createElement('li');
            label.className += "cld-label";
            label.innerHTML = labelsList[i];
            labels.appendChild(label);
        }
        var label = document.createElement('li');
        label.className += "cld-label saturday";
        label.innerHTML = "土";
        labels.appendChild(label);
        mainSection.appendChild(labels);
    }
    function AddDays() {
        // Create Number Element
        function DayNumber(n) {
            var number = document.createElement('p');
            number.className += "cld-number";
            number.innerHTML += n;
            return number;
        }
        var days = document.createElement('ul');
        days.className += "cld-days";
        // Previous Month's Days
        for (var i = 0; i < (calendar.Selected.FirstDay); i++) {
            var day = document.createElement('li');
            day.className += "cld-day prevMonth";
            //Disabled Days
            var d = i % 7;
            for (var q = 0; q < calendar.Options.DisabledDays.length; q++) {
                if (d == calendar.Options.DisabledDays[q]) {
                    day.className += " disableDay";
                }
            }

            var number = DayNumber((calendar.Prev.Days - calendar.Selected.FirstDay) + (i + 1));
            day.appendChild(number);

            days.appendChild(day);
        }
        // Current Month's Days
        for (var i = 0; i < calendar.Selected.Days; i++) {
            var day = document.createElement('li');
            day.className += "cld-day currMonth";
            //Disabled Days
            var d = (i + calendar.Selected.FirstDay) % 7;
            for (var q = 0; q < calendar.Options.DisabledDays.length; q++) {
                if (d == calendar.Options.DisabledDays[q]) {
                    day.className += " disableDay";
                }
            }
            var number = DayNumber(i + 1);
            var eventdayFlag = false;
            var title = null;
            var todayEvents = [];
            // Check Date against Event Dates
            for (var n = 0; n < calendar.Model.length; n++) {
                var evDate = calendar.Model[n].Date;
                var toDate = new Date(calendar.Selected.Year, calendar.Selected.Month, (i + 1));
                if (evDate.getTime() >= toDate.getTime() && evDate.getTime() < toDate.getTime() + 24 * 60 * 60 * 1000) {
                    eventdayFlag = true;
                    var evTime = formatDate(evDate, 'HH時mm分');
                    todayEvents.push(evTime + "：　" + calendar.Model[n].Title);
                }
            }
            if (eventdayFlag) {
                number.className += " eventday";
                title = document.createElement('span');
                title.className += "cld-title";
                number.appendChild(title);
                for (var n = 0; n < todayEvents.length; n++) {
                    title.innerHTML += '<p>' + todayEvents[n] + '</p>';
                }
            }
            day.appendChild(number);
            // If Today..
            if ((i + 1) == calendar.Today.getDate() && calendar.Selected.Month == calendar.Today.Month && calendar.Selected.Year == calendar.Today.Year) {
                day.className += " today";
            }
            days.appendChild(day);
        }
        // Next Month's Days
        // Always same amount of days in calander
        var extraDays = 6;
        if (days.children.length > 35) { extraDays = 6; }
        else if (days.children.length < 29) { extraDays = 20; }

        for (var i = 0; i < (extraDays - calendar.Selected.LastDay); i++) {
            var day = document.createElement('li');
            day.className += "cld-day nextMonth";
            //Disabled Days
            var d = (i + calendar.Selected.LastDay + 1) % 7;
            for (var q = 0; q < calendar.Options.DisabledDays.length; q++) {
                if (d == calendar.Options.DisabledDays[q]) {
                    day.className += " disableDay";
                }
            }

            var number = DayNumber(i + 1);
            day.appendChild(number);

            days.appendChild(day);
        }
        mainSection.appendChild(days);
    }
    if (calendar.Options.Color) {
        mainSection.innerHTML += '<style>.cld-main{color:' + calendar.Options.Color + ';}</style>';
    }
    if (calendar.Options.LinkColor) {
        mainSection.innerHTML += '<style>.cld-title a{color:' + calendar.Options.LinkColor + ';}</style>';
    }
    element.appendChild(mainSection);

    if (calendar.Options.NavShow && calendar.Options.NavVertical) {
        AddSidebar();
    }
    if (calendar.Options.DateTimeShow) {
        AddDateTime();
    }
    AddLabels();
    AddDays();
}