// videochat_service.js

let videochatFlag = false;

async function videochat() {
    videochatFlag = true;
    await miku_say("ビデオ会議サービスを開始します。何をしますか？", "smile");
    let answer = await miku_ask("1. 会議を作成する\n2. 会議の通知を確認する\n3. 会議に参加する", false, "self_introduction");
    
    switch(answer) {
        case "1":
            await createMeeting();
            break;
        case "2":
            await checkNotifications();
            break;
        case "3":
            await joinMeeting();
            break;
        default:
            await miku_say("有効な選択肢を選んでください。", "idle_think");
            break;
    }
    videochatFlag = false;
}

async function createMeeting() {
    let meetingName = await miku_ask("会議の名前を教えてください。", false, "self_introduction");
    let meetingDate = await miku_ask("会議の日付を教えてください（例：2023-07-01）。", false, "self_introduction");
    let meetingTime = await miku_ask("会議の時間を教えてください（例：14:30）。", false, "self_introduction");
    let participants = await miku_ask("参加者のuidをカンマ区切りで教えてください。", false, "self_introduction");

    let participantList = participants.split(',').map(p => p.trim());
    
    let meetingId = generateMeetingId();
    let meetingUrl = `https://wsapp.cs.kobe-u.ac.jp/meetcs27/${meetingId}?user=${uid}`;

    let meetingData = {
        id: meetingId,
        name: meetingName,
        date: meetingDate,
        time: meetingTime,
        participants: participantList,
        url: meetingUrl,
        creator: uid
    };

    await saveMeetingData(meetingData);
    await sendNotifications(meetingData);

    await miku_say(`会議「${meetingName}」を作成しました。参加者に通知を送信しました。`, "smile");
}

async function checkNotifications() {
    let notifications = await getNotifications(uid);
    if (notifications.length === 0) {
        await miku_say("新しい通知はありません。", "idle_think");
    } else {
        for (let notification of notifications) {
            await miku_say(`${notification.creatorName}さんから会議「${notification.meetingName}」の招待が来ています。
                日時: ${notification.meetingDate} ${notification.meetingTime}`, "self_introduction");
        }
    }
}

async function joinMeeting() {
    let meetings = await getUpcomingMeetings(uid);
    if (meetings.length === 0) {
        await miku_say("参加予定の会議はありません。", "idle_think");
    } else {
        let meetingList = meetings.map((m, i) => `${i + 1}. ${m.name} (${m.date} ${m.time})`).join('\n');
        let answer = await miku_ask(`参加する会議を選んでください：\n${meetingList}`, false, "self_introduction");
        let index = parseInt(answer) - 1;
        if (index >= 0 && index < meetings.length) {
            let meeting = meetings[index];
            await miku_say(`会議「${meeting.name}」に参加します。ブラウザで会議ページを開きます。`, "smile");
            window.open(meeting.url, '_blank');
        } else {
            await miku_say("有効な選択肢を選んでください。", "idle_think");
        }
    }
}

function generateMeetingId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function saveMeetingData(meetingData) {
    // この関数は、会議データをサーバーに保存する処理を実装する必要があります
    // 例: APIエンドポイントにPOSTリクエストを送信する
    console.log("Meeting data saved:", meetingData);
}

async function sendNotifications(meetingData) {
    // この関数は、参加者に通知を送信する処理を実装する必要があります
    // 例: 各参加者に対してAPIエンドポイントにPOSTリクエストを送信する
    console.log("Notifications sent to participants:", meetingData.participants);
}

async function getNotifications(userId) {
    // この関数は、ユーザーの通知を取得する処理を実装する必要があります
    // 例: APIエンドポイントからGETリクエストで通知を取得する
    // ダミーデータを返します
    return [
        {
            creatorName: "山田太郎",
            meetingName: "週次ミーティング",
            meetingDate: "2023-07-01",
            meetingTime: "14:00"
        }
    ];
}

async function getUpcomingMeetings(userId) {
    // この関数は、ユーザーの今後の会議を取得する処理を実装する必要があります
    // 例: APIエンドポイントからGETリクエストで会議データを取得する
    // ダミーデータを返します
    return [
        {
            name: "週次ミーティング",
            date: "2023-07-01",
            time: "14:00",
            url: "https://wsapp.cs.kobe-u.ac.jp/meetcs27/abcdef123456?user=" + userId
        }
    ];
}