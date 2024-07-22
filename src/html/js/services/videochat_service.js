const API_BASE_URL = 'https://es4.eedept.kobe-u.ac.jp/videochat_server';

async function videochat() {
    try {
        videochatFlag = true;
        await miku_say("ビデオ会議サービスを開始します。何をしますか？", "smile");
        let answer = await miku_ask("1. 会議を作成する\n2. 会議の一覧を確認する", false, "self_introduction");
        
        switch(answer) {
            case "1":
                await createMeeting();
                break;
            case "2":
                await listMeetings();
                break;
            default:
                await miku_say("有効な選択肢を選んでください。", "idle_think");
                break;
        }
    } catch (error) {
        console.error('Error in videochat:', error);
        await miku_say("申し訳ありません。エラーが発生しました。", "idle_think");
    } finally {
        videochatFlag = false;
    }
}

async function createMeeting() {
    try {
        let meetingName = await miku_ask("会議の名前を教えてください。", false, "self_introduction");
        let meetingDate = await miku_ask("会議の日付を教えてください（例：2023-07-01）。", false, "self_introduction");
        let meetingTime = await miku_ask("会議の時間を教えてください（例：14:30）。", false, "self_introduction");

        if (!validateMeetingInput(meetingName, meetingDate, meetingTime)) {
            throw new Error('Invalid input');
        }

        let meetingId = await generateSecureMeetingId();
        let meetingUrl = `https://wsapp.cs.kobe-u.ac.jp/meetcs27/${meetingId}?user=${uid}`;

        let meetingData = {
            id: meetingId,
            name: meetingName,
            date: meetingDate,
            time: meetingTime,
            url: meetingUrl,
            creator: uid
        };

        await saveMeetingData(meetingData);

        await miku_say(`会議「${meetingName}」を作成しました。会議は${meetingDate}の${meetingTime}に自動的に開始されます。`, "smile");
    } catch (error) {
        console.error('Error in createMeeting:', error);
        await miku_say("会議の作成中にエラーが発生しました。", "idle_think");
    }
}

async function listMeetings() {
    try {
        const meetings = await getMeetings();
        if (meetings.length === 0) {
            await miku_say("予定されている会議はありません。", "idle_think");
            return;
        }

        await miku_say("予定されている会議の一覧です：", "self_introduction");
        for (let meeting of meetings) {
            await miku_say(`${meeting.name}: ${meeting.date} ${meeting.time}`, "smile");
        }
    } catch (error) {
        console.error('Error in listMeetings:', error);
        await miku_say("会議一覧の取得中にエラーが発生しました。", "idle_think");
    }
}

async function saveMeetingData(meetingData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(meetingData),
        });
        if (!response.ok) {
            throw new Error('Failed to save meeting data');
        }
        return response.json();
    } catch (error) {
        console.error('Error saving meeting data:', error);
        throw error;
    }
}

async function getMeetings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/meetings`);
        if (!response.ok) {
            throw new Error('Failed to fetch meetings');
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching meetings:', error);
        throw error;
    }
}

function validateMeetingInput(name, date, time) {
    if (!name || name.trim() === '') {
        return false;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        return false;
    }
    
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
        return false;
    }
    
    return true;
}

async function generateSecureMeetingId() {
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

// checkAndStartMeeting 関数を autoStartMeeting として名前を変更
async function autoStartMeeting() {
    try {
        const meetings = await getMeetings();
        const now = new Date();
        for (let meeting of meetings) {
            const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
            if (now >= meetingDateTime && now < new Date(meetingDateTime.getTime() + 5 * 60000)) { // 開始時間から5分以内
                await miku_say(`会議「${meeting.name}」の開始時間です。参加しますか？`, "self_introduction");
                let answer = await miku_ask("はい/いいえ", false, "idle_think");
                if (answer.toLowerCase() === 'はい') {
                    await miku_say(`会議「${meeting.name}」に参加します。ブラウザで会議URLを開きます。`, "smile");
                    window.open(meeting.url, '_blank');
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Error in autoStartMeeting:', error);
    }
}

// setInterval の呼び出しも変更
setInterval(autoStartMeeting, 60000);

// videochat 関数を外部から呼び出せるようにエクスポート
window.videochat = videochat;