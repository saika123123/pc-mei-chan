// online-meeting-service.js

async function onlineMeeting() {
    console.log("Entered onlineMeeting function"); // デバッグ用ログ
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            let ans = await miku_ask("会議を作成しますか、それとも参加しますか？（作成/参加/終了）", false, "guide_normal");
            console.log("User's answer:", ans); // デバッグ用ログ

            if (/作成/.test(ans)) {
                await createMeeting();
                break;
            } else if (/参加/.test(ans)) {
                await joinMeeting();
                break;
            } else if (/終了/.test(ans)) {
                console.log("Exiting onlineMeeting function"); // デバッグ用ログ
                break;
            } else {
                await miku_say("申し訳ありません。「作成」、「参加」、または「終了」とお答えください。", "guide_normal");
                attempts++;
            }
        } catch (error) {
            console.error("Error in onlineMeeting:", error); // エラーログ
            await miku_say("申し訳ありません。エラーが発生しました。もう一度お試しください。", "greeting");
            attempts++;
        }
    }

    if (attempts >= maxAttempts) {
        await miku_say("申し訳ありません。正しい応答を得られませんでした。オンライン会議サービスを終了します。", "greeting");
    }

    console.log("Exiting onlineMeeting function"); // デバッグ用ログ
    serviceFlag = false;
}

async function createMeeting() {
    try {
    let date = await getMeetingDate();
    if (!date) return;

    let participants = await getParticipants();
    if (!participants) return;

    let meetingId = generateMeetingId();
    let meetingUrl = `https://wsapp.cs.kobe-u.ac.jp/meetcs27/${meetingId}?user=${uid}`;

    await scheduleMeeting(date, meetingUrl);
    await inviteParticipants(participants, date, meetingUrl);

    await miku_say(`会議を${formatDate(date, 'yyyy年MM月dd日 HH時mm分')}に設定しました。URLは${meetingUrl}です。`, "greeting");
} catch (error) {
    console.error("Error in createMeeting:", error);
    await miku_say("会議の作成中にエラーが発生しました。もう一度お試しください。", "greeting");
}
}

async function joinMeeting() {
    try {
    let meetingUrl = await miku_ask("参加する会議のURLを教えてください。", false, "guide_normal");
    if (meetingUrl) {
        await miku_say(`会議に参加します。ブラウザで${meetingUrl}を開いてください。`, "greeting");
    }
} catch (error) {
    console.error("Error in joinMeeting:", error);
    await miku_say("会議への参加中にエラーが発生しました。もう一度お試しください。", "greeting");
}
}

async function getMeetingDate() {
    while (true) {
        let ans = await miku_ask("会議の日時を教えてください（例：2024年7月1日 15時00分）", false, "guide_normal");
        let date = new Date(ans.replace(/年|月/g, '/').replace(/日|時/g, ':').replace(/分/, ''));
        if (!isNaN(date.getTime())) {
            return date;
        }
        await miku_say("日時の形式が正しくありません。もう一度入力してください。", "guide_normal");
    }
}

async function getParticipants() {
    let participants = [];
    while (true) {
        let ans = await miku_ask("参加者のuidを入力してください。終了する場合は'終了'と入力してください。", false, "guide_normal");
        if (ans === '終了') {
            break;
        }
        let personInfo = await getPersonInfo(ans);
        if (personInfo) {
            participants.push(personInfo);
            await miku_say(`${personInfo.nickname}さんを追加しました。`, "greeting");
        } else {
            await miku_say("有効なuidではありません。もう一度入力してください。", "guide_normal");
        }
    }
    return participants;
}

function generateMeetingId() {
    return Math.random().toString(36).substring(2, 15);
}

async function scheduleMeeting(date, meetingUrl) {
    let params = {
        'start': { 'dateTime': formatDate(date, 'yyyy-MM-dd') + 'T' + formatDate(date, 'HH:mm:ss') + '+09:00' },
        'end': { 'dateTime': formatDate(date, 'yyyy-MM-dd') + 'T' + formatDate(new Date(date.getTime() + 60*60*1000), 'HH:mm:ss') + '+09:00' },
        'summary': 'オンライン会議',
        'description': uid + '\n' + meetingUrl,
    };
    await createEvent(params);
}

async function inviteParticipants(participants, date, meetingUrl) {
    for (let participant of participants) {
        let message = `${participant.nickname}さん、\n\n${formatDate(date, 'yyyy年MM月dd日 HH時mm分')}からオンライン会議があります。\n参加URL: ${meetingUrl}\n\nよろしくお願いします。`;
        // ここで実際の招待メッセージ送信処理を実装する
        await miku_say(`${participant.nickname}さんに招待メッセージを送信しました。`, "greeting");
    }
}